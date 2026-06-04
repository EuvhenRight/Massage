/**
 * Booking confirmation endpoint.
 *
 *   GET  /api/booking/confirm?t=<token>
 *     → 302 to `/sk/booking/confirm-action?t=<token>` (no state change).
 *       The reminder template URL points here; redirecting to the action
 *       page means link-preview crawlers, security scanners, and any other
 *       GET-only fetcher can hit the URL without triggering a transition.
 *
 *   POST /api/booking/confirm   body: t=<token>
 *     → runs `transitionBookingStatus` and redirects to the landing page.
 *       Only the form on the action page POSTs here, so state changes are
 *       gated behind an explicit human submit.
 *
 * The split is the defense against the WhatsApp/Meta link-preview bug
 * documented in `lib/link-preview-guard.ts` — that guard still runs on the
 * POST handler as a belt-and-suspenders measure (a misconfigured bot could
 * in principle submit forms; the UA filter shuts that down too).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import { reminderTokenSourceToStatusSource } from '@/lib/booking-status'
import { isLinkPreviewUserAgent } from '@/lib/link-preview-guard'
import {
	notifyCustomerWhatsAppConfirmed,
	notifyStaffWhatsAppCustomerConfirmed,
} from '@/lib/whatsapp-admin-notify'
import { getSiteUrl } from '@/lib/site-url'
import { formatBratislavaDate, formatBratislavaTime } from '@/lib/format-date'

function landingUrl(params: Record<string, string>): string {
	const url = new URL('/booking/confirmed', getSiteUrl())
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
	return url.toString()
}

function actionPageUrl(token: string): string {
	const url = new URL('/sk/booking/confirm-action', getSiteUrl())
	url.searchParams.set('t', token)
	return url.toString()
}

function clientIp(request: Request): string | null {
	const fwd = request.headers.get('x-forwarded-for')
	if (!fwd) return null
	const first = fwd.split(',')[0]?.trim()
	return first || null
}

/**
 * Read-only: redirect every GET (real user, bot, scanner, security probe)
 * to the action page. The action page verifies the token and renders a
 * confirmation form; only that form's POST can mutate state.
 */
export async function GET(request: Request): Promise<Response> {
	const token = new URL(request.url).searchParams.get('t') ?? ''
	if (!token) {
		return NextResponse.redirect(landingUrl({ err: 'token' }))
	}
	return NextResponse.redirect(actionPageUrl(token))
}

/**
 * Stateful: read the token from form data, run the transition through the
 * orchestrator, fire customer + staff notifications, redirect to the
 * landing page. The link-preview UA guard stays as a second line of
 * defence in case an automated agent ever POSTs to this endpoint.
 */
export async function POST(request: NextRequest): Promise<Response> {
	const userAgent = request.headers.get('user-agent')
	if (isLinkPreviewUserAgent(userAgent)) {
		return NextResponse.redirect(landingUrl({ preview: '1' }))
	}

	const form = await request.formData().catch(() => null)
	const token = (form?.get('t') ?? '').toString()
	const verified = verifyActionToken(token)
	if (!verified) {
		return NextResponse.redirect(landingUrl({ err: 'token' }))
	}

	const statusSource =
		reminderTokenSourceToStatusSource(verified.source) ?? 'reminder_1d'

	const result = await transitionBookingStatus({
		appointmentId: verified.appointmentId,
		toStatus: 'confirmed',
		actor: 'customer',
		source: statusSource,
		request: {
			ip: clientIp(request),
			userAgent,
		},
	})

	if (!result.ok) {
		if (result.reason === 'appointment_not_found') {
			return NextResponse.redirect(landingUrl({ err: 'missing' }))
		}
		// invalid_transition: terminal state. Treat as success — re-clicking
		// a confirmation link should never look like a hard failure.
		return NextResponse.redirect(
			landingUrl({ ok: '1', id: verified.appointmentId }),
		)
	}

	if (!result.changed) {
		return NextResponse.redirect(
			landingUrl({ ok: '1', id: verified.appointmentId }),
		)
	}

	const appointment = await getAppointment(verified.appointmentId)
	if (appointment) {
		const start =
			appointment.startTime instanceof Date
				? appointment.startTime
				: (appointment.startTime as Timestamp).toDate()
		const dateStr = formatBratislavaDate(start)
		const timeStr = formatBratislavaTime(start)
		const service = appointment.service || '—'
		const customerName = appointment.fullName || '—'
		const customerPhone = appointment.phone || '—'
		const bookingPlace = appointment.place ?? 'massage'

		const notifications = await Promise.allSettled([
			notifyStaffWhatsAppCustomerConfirmed(
				{
					customerName,
					customerPhone,
					service,
					date: dateStr,
					time: timeStr,
				},
				{ bookingPlace },
			),
			notifyCustomerWhatsAppConfirmed({
				customerPhone,
				customerName,
				service,
				date: dateStr,
				time: timeStr,
			}),
		])
		for (const r of notifications) {
			if (r.status === 'rejected') {
				console.error('[booking/confirm] notify failed:', r.reason)
			}
		}
	}

	return NextResponse.redirect(
		landingUrl({ ok: '1', id: verified.appointmentId }),
	)
}
