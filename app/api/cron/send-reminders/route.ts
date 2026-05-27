/**
 * Vercel Cron: scans upcoming appointments and sends WhatsApp reminders.
 *
 * Daily run (Hobby plan), so windows are 24h wide:
 *   - 2-day  : 36h ≤ Δ < 60h   (appointments day-after-tomorrow)
 *   - 1-day  : 12h ≤ Δ < 36h   (appointments tomorrow)
 *
 * 1-hour reminder removed — requires sub-hourly cron (Pro plan).
 *
 * Each appointment doc tracks `reminder{2Day,1Day}SentAt` to avoid double-send.
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

type Window = '2day' | '1day'

function pickWindow(deltaMs: number): Window | null {
	const h = deltaMs / HOUR_MS
	if (h >= 36 && h < 60) return '2day'
	if (h >= 12 && h < 36) return '1day'
	return null
}

function sentFlagField(w: Window): string {
	return w === '2day' ? 'reminder2DaySentAt' : 'reminder1DaySentAt'
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

	const now = Date.now()
	const fromTs = Timestamp.fromMillis(now + 11 * HOUR_MS)
	const toTs = Timestamp.fromMillis(now + 61 * HOUR_MS)

	const q = query(
		collection(db, 'appointments'),
		where('startTime', '>=', fromTs),
		where('startTime', '<=', toTs),
	)
	const snap = await getDocs(q)

	const summary = {
		scanned: snap.size,
		sent: { '2day': 0, '1day': 0 } as Record<Window, number>,
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
		const window = pickWindow(start.getTime() - now)
		if (!window) {
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
					: notifyCustomerWhatsAppReminder1Day
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
