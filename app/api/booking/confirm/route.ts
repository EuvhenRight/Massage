import { NextResponse } from 'next/server'
import { doc, updateDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAppointment } from '@/lib/book-appointment'
import { verifyActionToken } from '@/lib/booking-action-token'
import { notifyStaffWhatsAppCustomerConfirmed } from '@/lib/whatsapp-admin-notify'
import { getSiteUrl } from '@/lib/site-url'
import { formatBratislavaDate, formatBratislavaTime } from '@/lib/format-date'

function resultUrl(params: Record<string, string>): string {
	const url = new URL('/booking/confirmed', getSiteUrl())
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
		return NextResponse.redirect(resultUrl({ err: 'missing' }))
	}

	const ref = doc(db, 'appointments', verified.appointmentId)
	const snap = await getDoc(ref)
	const alreadyConfirmed = Boolean(snap.exists() && snap.data()?.customerConfirmedAt)

	if (!alreadyConfirmed) {
		await updateDoc(ref, { customerConfirmedAt: serverTimestamp() })

		const start =
			appointment.startTime instanceof Date
				? appointment.startTime
				: (appointment.startTime as Timestamp).toDate()
		try {
			await notifyStaffWhatsAppCustomerConfirmed(
				{
					customerName: appointment.fullName || '—',
					customerPhone: appointment.phone || '—',
					service: appointment.service || '—',
					date: formatBratislavaDate(start),
					time: formatBratislavaTime(start),
				},
				{ bookingPlace: appointment.place ?? 'massage' },
			)
		} catch (e) {
			console.error('[booking/confirm] staff notify failed:', e)
		}
	}

	return NextResponse.redirect(resultUrl({ ok: '1' }))
}
