/**
 * Integration tests for the `/api/cron/send-reminders` route handler.
 *
 * The handler runs three passes per invocation:
 *   1. Booking reminders   — 2-day / 1-day / 0-day before the appointment
 *   2. Birthday greetings  — clients whose birthday is today (Europe/Bratislava)
 *   3. Re-engagement       — clients dormant past RE_ENGAGEMENT_THRESHOLD_DAYS
 *
 * Each pass uses a Twilio Content Template. The MSW Twilio mock records every
 * outbound call so we can assert the right `ContentSid` + variables left the
 * box — without ever hitting Twilio.
 *
 * Auth contract: Vercel attaches `Authorization: Bearer ${CRON_SECRET}`. The
 * tests assert the same: no header → 401, right header → 200.
 *
 * What we DON'T test here:
 *   - Twilio HTTP failure modes (covered separately in negative-path tests)
 *   - Empty catalog / missing ContentSid env (covered in handler unit tests)
 */

import { describe, beforeEach, expect, it } from 'vitest'
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GET as sendRemindersGET } from '@/app/api/cron/send-reminders/route'
import { createClientByAdmin } from '@/lib/clients-firestore'
import { server, requestLogs } from '../../mocks/server'
import { twilioRequestLog } from '../../mocks/handlers/twilio'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

function withAuth(): Request {
	return new Request('http://localhost/api/cron/send-reminders', {
		headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
	})
}

/**
 * Builds a Date at HH:00 local time, `offsetDays` away from "today" in
 * Europe/Bratislava (which `tests/setup.ts` pins as TZ). Handler windows
 * also evaluate dates in Bratislava, so this stays in sync.
 */
function bratislavaDayOffsetAt(offsetDays: number, hour = 14): Date {
	const d = new Date()
	d.setHours(hour, 0, 0, 0)
	d.setDate(d.getDate() + offsetDays)
	return d
}

interface SeedAppointmentInput {
	id?: string
	startAt: Date
	createdAt?: Date
	phone?: string
	fullName?: string
	service?: string
	place?: 'massage' | 'depilation'
	notifyByWhatsApp?: boolean
	bookingStatus?: 'pending' | 'confirmed' | 'cancelled'
}

async function seedAppointment(input: SeedAppointmentInput): Promise<string> {
	const id =
		input.id ?? `apt-test-${Math.random().toString(36).slice(2, 10)}`
	const start = input.startAt
	const end = new Date(start.getTime() + 60 * 60 * 1000)
	const created = input.createdAt ?? new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000)
	await setDoc(doc(db, 'appointments', id), {
		startTime: Timestamp.fromDate(start),
		endTime: Timestamp.fromDate(end),
		service: input.service ?? 'Relax massage',
		fullName: input.fullName ?? 'Andrea',
		email: 'a@example.test',
		phone: input.phone ?? '+421912345678',
		place: input.place ?? 'massage',
		notifyByEmail: false,
		notifyByWhatsApp: input.notifyByWhatsApp ?? true,
		createdAt: Timestamp.fromDate(created),
		...(input.bookingStatus ? { bookingStatus: input.bookingStatus } : {}),
	})
	return id
}

function clearTwilioLog(): void {
	twilioRequestLog.length = 0
}

describe.skipIf(!emulatorAvailable())(
	'/api/cron/send-reminders (emulator + MSW)',
	() => {
		beforeEach(async () => {
			requireEmulator()
			await wipeFirestore()
			clearTwilioLog()
		})

		describe('authorization', () => {
			it('returns 401 when the Bearer secret is missing', async () => {
				const res = await sendRemindersGET(
					new Request('http://localhost/api/cron/send-reminders'),
				)
				expect(res.status).toBe(401)
			})

			it('returns 401 when the Bearer secret is wrong', async () => {
				const res = await sendRemindersGET(
					new Request('http://localhost/api/cron/send-reminders', {
						headers: { Authorization: 'Bearer wrong' },
					}),
				)
				expect(res.status).toBe(401)
			})

			it('returns 200 with the right Bearer secret', async () => {
				const res = await sendRemindersGET(withAuth())
				expect(res.status).toBe(200)
			})
		})

		describe('Pass 1 — appointment reminders', () => {
			it('fires the 1-day template for an appointment tomorrow', async () => {
				const tomorrow = bratislavaDayOffsetAt(1, 14)
				const id = await seedAppointment({ startAt: tomorrow })

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as { sent: Record<string, number> }
				expect(body.sent['1day']).toBe(1)

				expect(requestLogs.twilio.length).toBeGreaterThanOrEqual(1)
				const lastCall = requestLogs.twilio[requestLogs.twilio.length - 1]!
				expect(lastCall.body.get('ContentSid')).toBe(
					process.env.TWILIO_CONTENT_SID_REMINDER_1D,
				)
				expect(lastCall.body.get('To')).toBe('whatsapp:+421912345678')

				// Sent flag must be persisted so the next cron run skips.
				const after = await getDoc(doc(db, 'appointments', id))
				expect((after.data() as { reminder1DaySentAt?: unknown }).reminder1DaySentAt).toBeTruthy()
			})

			it('suppresses the same-day-creation reminder (booking made today)', async () => {
				// startAt must be in the future relative to `now`: the cron query
				// filters `startTime >= now`, so a same-day appointment scheduled
				// earlier in the day would be filtered out of the scan window and
				// never reach the same-day-creation guard. Picking "1 hour from
				// now" keeps the appointment inside the 0-day window across any
				// time of day (except the narrow band within 1h of midnight,
				// which the suite's TZ-pin to Europe/Bratislava already excludes
				// from typical CI runs).
				const today = new Date(Date.now() + 60 * 60 * 1000)
				const createdToday = new Date()
				await seedAppointment({
					startAt: today,
					createdAt: createdToday,
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					sent: Record<string, number>
					skipped: number
				}
				expect(body.sent['0day']).toBe(0)
				expect(body.skipped).toBeGreaterThanOrEqual(1)
				expect(requestLogs.twilio.length).toBe(0)
			})

			it('respects the already-sent flag (no double-send)', async () => {
				const tomorrow = bratislavaDayOffsetAt(1, 10)
				const id = await seedAppointment({ startAt: tomorrow })
				await setDoc(
					doc(db, 'appointments', id),
					{ reminder1DaySentAt: Timestamp.fromDate(new Date()) },
					{ merge: true },
				)

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					sent: Record<string, number>
				}
				expect(body.sent['1day']).toBe(0)
				expect(requestLogs.twilio.length).toBe(0)
			})

			it('skips when notifyByWhatsApp is false', async () => {
				const tomorrow = bratislavaDayOffsetAt(1, 10)
				await seedAppointment({
					startAt: tomorrow,
					notifyByWhatsApp: false,
				})
				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as { sent: Record<string, number> }
				expect(body.sent['1day']).toBe(0)
				expect(requestLogs.twilio.length).toBe(0)
			})

			it('uses the 1-day confirmed-variant template when booking is confirmed', async () => {
				const tomorrow = bratislavaDayOffsetAt(1, 10)
				await seedAppointment({
					startAt: tomorrow,
					bookingStatus: 'confirmed',
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as { sent: Record<string, number> }
				expect(body.sent['1day']).toBe(1)

				const lastCall = requestLogs.twilio[requestLogs.twilio.length - 1]!
				expect(lastCall.body.get('ContentSid')).toBe(
					process.env.TWILIO_CONTENT_SID_REMINDER_1D_CONFIRMED,
				)
			})

			it('uses the 0-day confirmed-variant template when booking is confirmed', async () => {
				// startAt 1h in the future so the booking lands inside the cron's
				// `startTime >= now` scan window regardless of when the test runs.
				const today = new Date(Date.now() + 60 * 60 * 1000)
				const createdYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
				await seedAppointment({
					startAt: today,
					createdAt: createdYesterday,
					bookingStatus: 'confirmed',
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as { sent: Record<string, number> }
				expect(body.sent['0day']).toBe(1)

				const lastCall = requestLogs.twilio[requestLogs.twilio.length - 1]!
				expect(lastCall.body.get('ContentSid')).toBe(
					process.env.TWILIO_CONTENT_SID_REMINDER_0D_CONFIRMED,
				)
			})

			it('uses the standard 0-day template (with both buttons) for unconfirmed bookings', async () => {
				const today = new Date(Date.now() + 60 * 60 * 1000)
				const createdYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
				await seedAppointment({
					startAt: today,
					createdAt: createdYesterday,
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as { sent: Record<string, number> }
				expect(body.sent['0day']).toBe(1)

				const lastCall = requestLogs.twilio[requestLogs.twilio.length - 1]!
				expect(lastCall.body.get('ContentSid')).toBe(
					process.env.TWILIO_CONTENT_SID_REMINDER_0D,
				)
				// Same-day reminders now carry an action token in {{5}} for the
				// Confirm/Cancel buttons — assert the variables are populated so
				// a future template change can't silently drop the token.
				const vars = JSON.parse(
					lastCall.body.get('ContentVariables') ?? '{}',
				) as Record<string, string>
				expect(vars['5']).toBeTruthy()
			})
		})

		describe('Pass 2 — birthday greetings', () => {
			it('sends a birthday template to opted-in clients whose birthday is today', async () => {
				const today = new Date()
				await createClientByAdmin({
					phone: '+421912345678',
					firstName: 'Andrea',
					birthday: `1992-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
					optInMarketing: true,
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					birthday: { sent: number }
				}
				expect(body.birthday.sent).toBe(1)

				const birthdayCalls = requestLogs.twilio.filter(
					c => c.body.get('ContentSid') === process.env.TWILIO_CONTENT_SID_BIRTHDAY,
				)
				expect(birthdayCalls).toHaveLength(1)
				expect(birthdayCalls[0]!.body.get('To')).toBe('whatsapp:+421912345678')
			})

			it('skips clients without optInMarketing', async () => {
				const today = new Date()
				await createClientByAdmin({
					phone: '+421912345678',
					firstName: 'Andrea',
					birthday: `1992-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
					optInMarketing: false,
				})

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					birthday: { sent: number }
				}
				expect(body.birthday.sent).toBe(0)
				const birthdayCalls = requestLogs.twilio.filter(
					c => c.body.get('ContentSid') === process.env.TWILIO_CONTENT_SID_BIRTHDAY,
				)
				expect(birthdayCalls).toHaveLength(0)
			})

			it('does not greet the same client twice in the same year', async () => {
				const today = new Date()
				const phoneE164 = '+421912345678'
				await createClientByAdmin({
					phone: phoneE164,
					firstName: 'Andrea',
					birthday: `1992-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
					optInMarketing: true,
				})

				await sendRemindersGET(withAuth())
				clearTwilioLog()
				const second = await sendRemindersGET(withAuth())
				const body = (await second.json()) as { birthday: { sent: number } }
				expect(body.birthday.sent).toBe(0)
				expect(requestLogs.twilio.length).toBe(0)
			})
		})

		describe('Pass 3 — re-engagement', () => {
			it('sends to opted-in clients whose lastVisitAt is past the threshold', async () => {
				const phoneE164 = '+421912345678'
				await createClientByAdmin({
					phone: phoneE164,
					firstName: 'Andrea',
					optInMarketing: true,
				})
				// Force lastVisitAt > 180 days ago.
				const oldVisit = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
				await setDoc(
					doc(db, 'clients', phoneE164),
					{ lastVisitAt: Timestamp.fromDate(oldVisit) },
					{ merge: true },
				)

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					reEngagement: { sent: number }
				}
				expect(body.reEngagement.sent).toBe(1)
				const calls = requestLogs.twilio.filter(
					c => c.body.get('ContentSid') === process.env.TWILIO_CONTENT_SID_RE_ENGAGEMENT,
				)
				expect(calls).toHaveLength(1)
			})

			it('suppresses clients who received re-engagement inside the window', async () => {
				const phoneE164 = '+421912345678'
				await createClientByAdmin({
					phone: phoneE164,
					firstName: 'Andrea',
					optInMarketing: true,
				})
				const oldVisit = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
				const recentReengagement = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
				await setDoc(
					doc(db, 'clients', phoneE164),
					{
						lastVisitAt: Timestamp.fromDate(oldVisit),
						reEngagementSentAt: Timestamp.fromDate(recentReengagement),
					},
					{ merge: true },
				)

				const res = await sendRemindersGET(withAuth())
				const body = (await res.json()) as {
					reEngagement: { sent: number; skipped: number }
				}
				expect(body.reEngagement.sent).toBe(0)
				expect(requestLogs.twilio.filter(
					c => c.body.get('ContentSid') === process.env.TWILIO_CONTENT_SID_RE_ENGAGEMENT,
				)).toHaveLength(0)
			})
		})

		// Silence the unused-server-import lint — `server` is needed so the
		// MSW listener fires before the first SUT request.
		void server
	},
)
