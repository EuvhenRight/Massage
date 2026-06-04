/**
 * Booking cancellation endpoint. See `app/api/booking/confirm/route.ts` for
 * the GET-redirect / POST-mutate split rationale.
 *
 *   GET  /api/booking/cancel?t=<token> → 302 to `/sk/booking/cancel-action`
 *   POST /api/booking/cancel body t=<token> → soft-cancel + notify + landing
 */

import { NextResponse, type NextRequest } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import { reminderTokenSourceToStatusSource } from '@/lib/booking-status'
import { isLinkPreviewUserAgent } from '@/lib/link-preview-guard'
import {
	notifyStaffWhatsAppCancelled,
	notifyCustomerWhatsAppCancelled,
} from '@/lib/whatsapp-admin-notify'
import { getSiteUrl } from '@/lib/site-url'
import { formatBratislavaDate, formatBratislavaTime } from '@/lib/format-date'

function landingUrl(params: Record<string, string>): string {
	const url = new URL('/booking/cancelled', getSiteUrl())
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
	return url.toString()
}

function actionPageUrl(token: string): string {
	const url = new URL('/sk/booking/cancel-action', getSiteUrl())
	url.searchParams.set('t', token)
	return url.toString()
}

function clientIp(request: Request): string | null {
	const fwd = request.headers.get('x-forwarded-for')
	if (!fwd) return null
	const first = fwd.split(',')[0]?.trim()
	return first || null
}

export async function GET(request: Request): Promise<Response> {
	const token = new URL(request.url).searchParams.get('t') ?? ''
	if (!token) {
		return NextResponse.redirect(landingUrl({ err: 'token' }))
	}
	return NextResponse.redirect(actionPageUrl(token))
}

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

	// Read the appointment *before* the transition so we can notify the
	// customer/staff with the original details. The orchestrator soft-deletes
	// (keeps the doc) so reading after would also work, but reading first
	// keeps the payload available even if a concurrent admin edit lands
	// between the read and the side effects.
	const appointment = await getAppointment(verified.appointmentId)
	if (!appointment) {
		return NextResponse.redirect(landingUrl({ ok: 'already' }))
	}

	const statusSource =
		reminderTokenSourceToStatusSource(verified.source) ?? 'reminder_1d'

	const result = await transitionBookingStatus({
		appointmentId: verified.appointmentId,
		toStatus: 'cancelled',
		actor: 'customer',
		source: statusSource,
		request: {
			ip: clientIp(request),
			userAgent,
		},
	})

	if (!result.ok) {
		if (result.reason === 'appointment_not_found') {
			return NextResponse.redirect(landingUrl({ ok: 'already' }))
		}
		return NextResponse.redirect(landingUrl({ ok: 'already' }))
	}

	if (!result.changed) {
		return NextResponse.redirect(landingUrl({ ok: 'already' }))
	}

	const start =
		appointment.startTime instanceof Date
			? appointment.startTime
			: (appointment.startTime as Timestamp).toDate()
	const dateStr = formatBratislavaDate(start)
	const timeStr = formatBratislavaTime(start)
	const serviceStr = appointment.service || '—'
	const customerName = appointment.fullName || '—'
	const customerPhone = appointment.phone || '—'
	const bookingPlace = appointment.place ?? 'massage'

	const notifications = await Promise.allSettled([
		notifyStaffWhatsAppCancelled(
			{
				customerName,
				customerPhone,
				service: serviceStr,
				date: dateStr,
				time: timeStr,
			},
			{ bookingPlace },
		),
		notifyCustomerWhatsAppCancelled({
			customerPhone,
			customerName,
			date: dateStr,
			time: timeStr,
			service: serviceStr,
		}),
	])
	for (const r of notifications) {
		if (r.status === 'rejected') {
			console.error('[booking/cancel] notify failed:', r.reason)
		}
	}

	return NextResponse.redirect(
		landingUrl({ ok: '1', id: verified.appointmentId }),
	)
}
