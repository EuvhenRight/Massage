import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase/firestore'
import {
	getAppointment,
	deleteAppointment,
} from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
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

export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get('t') ?? ''
	const verified = verifyActionToken(token)
	if (!verified) {
		return NextResponse.redirect(resultUrl({ err: 'token' }))
	}

	const appointment = await getAppointment(verified.appointmentId)
	if (!appointment) {
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

	try {
		await deleteAppointment(verified.appointmentId)
	} catch (e) {
		console.error('[booking/cancel] delete failed:', e)
		return NextResponse.redirect(resultUrl({ err: 'delete' }))
	}

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

	return NextResponse.redirect(resultUrl({ ok: '1' }))
}
