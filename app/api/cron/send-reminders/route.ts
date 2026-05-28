/**
 * Vercel Cron: scans upcoming appointments and sends WhatsApp reminders.
 *
 * Date-based (not hour-based): compares calendar dates in Europe/Bratislava.
 *   - 2-day : appointment date − today = 2  → "you have a booking in 2 days"
 *   - 1-day : appointment date − today = 1  → "you have a booking tomorrow"
 *   - 0-day : appointment date − today = 0  → "you have a booking today"
 *
 * Same-day-creation guard: if a booking was created on the same calendar day
 * as the reminder would fire, that reminder is suppressed (no retroactive
 * messaging on the day the customer just booked).
 *
 * Each appointment doc tracks `reminder{2Day,1Day,0Day}SentAt` to avoid
 * double-send if the cron ever runs more than once per day.
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` to scheduled calls.
 */

import { NextResponse } from 'next/server'
import {
	collection,
	doc,
	getDocs,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
	notifyCustomerWhatsAppReminder2Days,
	notifyCustomerWhatsAppReminder1Day,
	notifyCustomerWhatsAppReminderSameDay,
	parseWhatsappE164,
} from '@/lib/whatsapp-admin-notify'
import { signTokenForAppointment } from '@/lib/booking-action-token'
import {
	formatBratislavaDate,
	formatBratislavaTime,
} from '@/lib/format-date'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

type Window = '2day' | '1day' | '0day'

/** YYYY-MM-DD calendar date of `d` in Europe/Bratislava (ignores wall time). */
function bratislavaDateKey(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Bratislava',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(d)
}

/** Whole-day delta between two YYYY-MM-DD strings (later − earlier). */
function daysBetween(fromKey: string, toKey: string): number {
	const a = Date.parse(`${fromKey}T00:00:00Z`)
	const b = Date.parse(`${toKey}T00:00:00Z`)
	return Math.round((b - a) / DAY_MS)
}

function pickWindow(daysUntil: number): Window | null {
	if (daysUntil === 2) return '2day'
	if (daysUntil === 1) return '1day'
	if (daysUntil === 0) return '0day'
	return null
}

function sentFlagField(w: Window): string {
	if (w === '2day') return 'reminder2DaySentAt'
	if (w === '1day') return 'reminder1DaySentAt'
	return 'reminder0DaySentAt'
}

function authorized(request: Request): boolean {
	const expected = process.env.CRON_SECRET?.trim()
	if (!expected) {
		console.warn('[cron/send-reminders] CRON_SECRET not set, allowing call')
		return true
	}
	const header = request.headers.get('authorization') ?? ''
	return header === `Bearer ${expected}`
}

export async function GET(request: Request) {
	if (!authorized(request)) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	}

	const now = new Date()
	// Scan window spans today through the day-after-tomorrow appointments.
	// Start at `now` (not later) so a same-day appointment booked just before
	// midnight isn't excluded from its 0-day reminder.
	const fromTs = Timestamp.fromMillis(now.getTime())
	const toTs = Timestamp.fromMillis(now.getTime() + 72 * HOUR_MS)
	const todayKey = bratislavaDateKey(now)

	const q = query(
		collection(db, 'appointments'),
		where('startTime', '>=', fromTs),
		where('startTime', '<=', toTs),
	)
	const snap = await getDocs(q)

	const summary = {
		scanned: snap.size,
		sent: { '2day': 0, '1day': 0, '0day': 0 } as Record<Window, number>,
		skipped: 0,
		failed: 0,
	}

	for (const docSnap of snap.docs) {
		const data = docSnap.data() as Record<string, unknown>
		const id = docSnap.id

		if (data.scheduleTbd === true) {
			summary.skipped += 1
			continue
		}

		const startTs = data.startTime as Timestamp | undefined
		if (!startTs || typeof startTs.toMillis !== 'function') {
			summary.skipped += 1
			continue
		}
		const start = startTs.toDate()
		const daysUntil = daysBetween(todayKey, bratislavaDateKey(start))
		const window = pickWindow(daysUntil)
		if (!window) {
			summary.skipped += 1
			continue
		}

		// Same-day-creation guard: if the booking was created today, skip the
		// reminder that would fire today. The customer just booked it — no
		// retroactive reminder needed.
		const createdTs = data.createdAt as Timestamp | undefined
		if (
			createdTs &&
			typeof createdTs.toMillis === 'function' &&
			bratislavaDateKey(createdTs.toDate()) === todayKey
		) {
			summary.skipped += 1
			continue
		}

		const flagField = sentFlagField(window)
		if (data[flagField]) {
			summary.skipped += 1
			continue
		}

		if (data.notifyByWhatsApp !== true) {
			summary.skipped += 1
			continue
		}
		const phoneRaw =
			typeof data.phone === 'string' ? data.phone : ''
		if (!parseWhatsappE164(phoneRaw)) {
			summary.skipped += 1
			continue
		}

		const customerName =
			typeof data.fullName === 'string' ? data.fullName : '—'
		const service =
			typeof data.service === 'string' && data.service.length > 0
				? data.service
				: '—'
		const dateStr = formatBratislavaDate(start)
		const timeStr = formatBratislavaTime(start)
		const actionToken = signTokenForAppointment(id, start)

		try {
			const fn =
				window === '2day'
					? notifyCustomerWhatsAppReminder2Days
					: window === '1day'
						? notifyCustomerWhatsAppReminder1Day
						: notifyCustomerWhatsAppReminderSameDay
			const r = await fn({
				customerPhone: phoneRaw,
				customerName,
				service,
				date: dateStr,
				time: timeStr,
				actionToken,
			})

			if (r.status === 'sent') {
				await updateDoc(doc(db, 'appointments', id), {
					[flagField]: serverTimestamp(),
				})
				summary.sent[window] += 1
			} else if (r.status === 'failed') {
				summary.failed += 1
			} else {
				summary.skipped += 1
			}
		} catch (e) {
			console.error('[cron/send-reminders] send failed', id, window, e)
			summary.failed += 1
		}
	}

	return NextResponse.json({ ok: true, ...summary })
}
