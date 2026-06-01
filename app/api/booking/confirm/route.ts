import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import { reminderTokenSourceToStatusSource } from '@/lib/booking-status'
import {
	notifyCustomerWhatsAppConfirmed,
	notifyStaffWhatsAppCustomerConfirmed,
} from '@/lib/whatsapp-admin-notify'
import { getSiteUrl } from '@/lib/site-url'
import { formatBratislavaDate, formatBratislavaTime } from '@/lib/format-date'

function resultUrl(params: Record<string, string>): string {
	const url = new URL('/booking/confirmed', getSiteUrl())
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
	return url.toString()
}

/**
 * First IP in `x-forwarded-for` (Vercel's chain) for audit metadata.
 * The request object itself doesn't expose a client IP in the Next.js
 * route-handler runtime, so we fall back to the proxied header.
 */
function clientIp(request: Request): string | null {
	const fwd = request.headers.get('x-forwarded-for')
	if (!fwd) return null
	const first = fwd.split(',')[0]?.trim()
	return first || null
}

export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get('t') ?? ''
	const verified = verifyActionToken(token)
	if (!verified) {
		return NextResponse.redirect(resultUrl({ err: 'token' }))
	}

	// Tokens minted before the reminder-source field default to `reminder_1d`
	// for reporting; tokens minted by the new cron carry the exact window.
	const statusSource =
		reminderTokenSourceToStatusSource(verified.source) ?? 'reminder_1d'

	const result = await transitionBookingStatus({
		appointmentId: verified.appointmentId,
		toStatus: 'confirmed',
		actor: 'customer',
		source: statusSource,
		request: {
			ip: clientIp(request),
			userAgent: request.headers.get('user-agent'),
		},
	})

	if (!result.ok) {
		if (result.reason === 'appointment_not_found') {
			return NextResponse.redirect(resultUrl({ err: 'missing' }))
		}
		// invalid_transition: appointment exists but is already cancelled /
		// completed / no-show. Show the success page anyway — re-clicking a
		// confirmation link should never look like a hard failure.
		return NextResponse.redirect(resultUrl({ ok: '1', id: verified.appointmentId }))
	}

	// `changed: false` means the customer re-clicked — skip notifications and
	// redirect to the success page so the second click feels normal.
	if (!result.changed) {
		return NextResponse.redirect(resultUrl({ ok: '1', id: verified.appointmentId }))
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

	return NextResponse.redirect(resultUrl({ ok: '1', id: verified.appointmentId }))
}
