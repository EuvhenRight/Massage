import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import { reminderTokenSourceToStatusSource } from '@/lib/booking-status'
import {
	notifyStaffWhatsAppCancelled,
	notifyCustomerWhatsAppCancelled,
} from '@/lib/whatsapp-admin-notify'
import { getSiteUrl } from '@/lib/site-url'
import { formatBratislavaDate, formatBratislavaTime } from '@/lib/format-date'

function resultUrl(params: Record<string, string>): string {
	const url = new URL('/booking/cancelled', getSiteUrl())
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
	return url.toString()
}

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

	// Read the appointment *before* transitioning so we can notify the
	// customer/staff with the original details. The orchestrator soft-deletes
	// (keeps the doc), so reading after would still work, but reading first
	// keeps the notification payload available even if a concurrent admin
	// edit lands between the read and the side effects.
	const appointment = await getAppointment(verified.appointmentId)
	if (!appointment) {
		return NextResponse.redirect(resultUrl({ ok: 'already' }))
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
			userAgent: request.headers.get('user-agent'),
		},
	})

	if (!result.ok) {
		if (result.reason === 'appointment_not_found') {
			return NextResponse.redirect(resultUrl({ ok: 'already' }))
		}
		// invalid_transition: terminal state (already cancelled / completed /
		// no-show). Treat as already-cancelled for the customer's view.
		return NextResponse.redirect(resultUrl({ ok: 'already' }))
	}

	// Re-clicking the cancel link is idempotent: skip duplicate notifications.
	if (!result.changed) {
		return NextResponse.redirect(resultUrl({ ok: 'already' }))
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

	return NextResponse.redirect(resultUrl({ ok: '1', id: verified.appointmentId }))
}
