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
	bookingUrlFor,
	notifyCustomerWhatsAppBirthday,
	notifyCustomerWhatsAppReEngagement,
	notifyCustomerWhatsAppReminder2Days,
	notifyCustomerWhatsAppReminder1Day,
	notifyCustomerWhatsAppReminder1DayConfirmed,
	notifyCustomerWhatsAppReminderSameDay,
	notifyCustomerWhatsAppReminderSameDayConfirmed,
	parseWhatsappE164,
} from '@/lib/whatsapp-admin-notify'
import {
	findClientsForReEngagement,
	findClientsWithBirthdayOn,
	markBirthdayGreeted,
	markReEngagementSent,
} from '@/lib/clients-firestore'
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

/** Year/month/day in Europe/Bratislava — used for birthday matching and the
 *  per-year guard against double-sending greetings. UTC year would skip Jan-1
 *  birthdays for clients greeted at 23:30 UTC on Dec 31. */
function bratislavaYmd(d: Date): { year: number; month: number; day: number } {
	const key = bratislavaDateKey(d)
	const [y, m, day] = key.split('-').map(Number)
	return { year: y!, month: m!, day: day! }
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

interface ReminderDispatchInput {
	window: Window
	isConfirmed: boolean
	phone: string
	customerName: string
	service: string
	date: string
	time: string
	actionToken: string
}

type ReminderHelperResult = Awaited<
	ReturnType<typeof notifyCustomerWhatsAppReminder1Day>
>

/**
 * Pick the right reminder helper for the window + confirmation state and
 * gracefully fall back when the confirmed-variant template SID isn't
 * configured. Returning the same shape every time keeps the calling loop
 * simple.
 */
async function sendReminder(
	input: ReminderDispatchInput,
): Promise<ReminderHelperResult> {
	const payload = {
		customerPhone: input.phone,
		customerName: input.customerName,
		service: input.service,
		date: input.date,
		time: input.time,
		actionToken: input.actionToken,
	}

	if (input.window === '2day') {
		return notifyCustomerWhatsAppReminder2Days(payload)
	}

	if (input.window === '1day') {
		if (input.isConfirmed) {
			const r = await notifyCustomerWhatsAppReminder1DayConfirmed(payload)
			if (r.status === 'skipped' && r.skipReason === 'missing_content_sid') {
				return notifyCustomerWhatsAppReminder1Day(payload)
			}
			return r
		}
		return notifyCustomerWhatsAppReminder1Day(payload)
	}

	// 0-day window: same Confirm + Cancel buttons as the earlier reminders for
	// unconfirmed bookings; a Cancel-only variant for those the customer has
	// already confirmed (the Confirm button would be noise). Same fallback
	// shape as the 1-day branch — if the confirmed-variant SID is missing the
	// standard template still goes out.
	if (input.isConfirmed) {
		const r = await notifyCustomerWhatsAppReminderSameDayConfirmed(payload)
		if (r.status === 'skipped' && r.skipReason === 'missing_content_sid') {
			return notifyCustomerWhatsAppReminderSameDay(payload)
		}
		return r
	}
	return notifyCustomerWhatsAppReminderSameDay(payload)
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
		birthday: { scanned: 0, sent: 0, skipped: 0, failed: 0 },
		reEngagement: { scanned: 0, sent: 0, skipped: 0, failed: 0 },
	}

	for (const docSnap of snap.docs) {
		const data = docSnap.data() as Record<string, unknown>
		const id = docSnap.id

		if (data.scheduleTbd === true) {
			summary.skipped += 1
			continue
		}

		// Soft-cancelled bookings keep their doc for audit history but must not
		// receive further reminders.
		if (data.bookingStatus === 'cancelled') {
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
		// Sign the reminder window into the token so the confirm/cancel routes
		// can attribute the customer's response to the right reminder without
		// trusting unsigned URL params.
		const tokenSource =
			window === '2day' ? 'r2' : window === '1day' ? 'r1' : 'r0'
		const actionToken = signTokenForAppointment(
			id,
			start,
			undefined,
			tokenSource,
		)

		// Confirmed-variant reminders drop the "Confirm" button — once the
		// customer has confirmed (typically via the 2-day reminder), pinging
		// them to confirm again is noise. The Cancel button stays.
		//
		// 2-day reminder always uses the standard template (it's the first
		// touch). 1-day and 0-day check the booking status and swap to the
		// confirmed variant when available. If the env var for the variant
		// is missing the helper returns `missing_content_sid` and we fall
		// back to the standard template — deployments without the new SIDs
		// keep reminders flowing (the customer just sees both buttons again,
		// no functional regression).
		const isConfirmed = data.bookingStatus === 'confirmed'

		try {
			const r = await sendReminder({
				window,
				isConfirmed,
				phone: phoneRaw,
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

	// ------------------------------------------------------------------------
	// Pass 2: birthday greetings
	// One per client per year. Matches month+day in Europe/Bratislava so the
	// salon's wall clock is the source of truth (not UTC). Year of birth is
	// stored on the client doc but ignored for matching — used only by the
	// `birthdayGreetedYear` guard to avoid double-sending in the same calendar
	// year if cron ever runs twice.
	// ------------------------------------------------------------------------
	const today = bratislavaYmd(now)
	try {
		const candidates = await findClientsWithBirthdayOn(today.month, today.day)
		summary.birthday.scanned = candidates.length
		for (const client of candidates) {
			if (!client.optInWhatsApp) {
				summary.birthday.skipped += 1
				continue
			}
			if (client.birthdayGreetedYear === today.year) {
				summary.birthday.skipped += 1
				continue
			}
			const e164 = parseWhatsappE164(client.phone)
			if (!e164) {
				summary.birthday.skipped += 1
				continue
			}
			try {
				const r = await notifyCustomerWhatsAppBirthday({
					customerPhone: client.phone,
					customerName: client.firstName || '—',
					bookingUrl: bookingUrlFor(client.lastVisitPlace),
				})
				if (r.status === 'sent') {
					await markBirthdayGreeted(e164, today.year)
					summary.birthday.sent += 1
				} else if (r.status === 'failed') {
					summary.birthday.failed += 1
				} else {
					summary.birthday.skipped += 1
				}
			} catch (e) {
				console.error(
					'[cron/send-reminders] birthday send failed',
					client.phone,
					e,
				)
				summary.birthday.failed += 1
			}
		}
	} catch (e) {
		console.error('[cron/send-reminders] birthday pass failed', e)
	}

	// ------------------------------------------------------------------------
	// Pass 3: re-engagement
	// Clients whose lastVisitAt is more than RE_ENGAGEMENT_THRESHOLD_DAYS ago
	// AND who haven't received a re-engagement message inside the same window.
	// Marketing category — opt-in is required (filtered at query level).
	// ------------------------------------------------------------------------
	const thresholdDaysRaw = Number(process.env.RE_ENGAGEMENT_THRESHOLD_DAYS)
	const thresholdDays =
		Number.isFinite(thresholdDaysRaw) && thresholdDaysRaw > 0
			? Math.floor(thresholdDaysRaw)
			: 180
	try {
		const dormant = await findClientsForReEngagement(thresholdDays, now)
		summary.reEngagement.scanned = dormant.length
		for (const client of dormant) {
			if (!client.optInWhatsApp) {
				summary.reEngagement.skipped += 1
				continue
			}
			const e164 = parseWhatsappE164(client.phone)
			if (!e164) {
				summary.reEngagement.skipped += 1
				continue
			}
			try {
				const r = await notifyCustomerWhatsAppReEngagement({
					customerPhone: client.phone,
					customerName: client.firstName || '—',
					bookingUrl: bookingUrlFor(client.lastVisitPlace),
				})
				if (r.status === 'sent') {
					await markReEngagementSent(e164, now)
					summary.reEngagement.sent += 1
				} else if (r.status === 'failed') {
					summary.reEngagement.failed += 1
				} else {
					summary.reEngagement.skipped += 1
				}
			} catch (e) {
				console.error(
					'[cron/send-reminders] re-engagement send failed',
					client.phone,
					e,
				)
				summary.reEngagement.failed += 1
			}
		}
	} catch (e) {
		console.error('[cron/send-reminders] re-engagement pass failed', e)
	}

	return NextResponse.json({ ok: true, ...summary })
}
