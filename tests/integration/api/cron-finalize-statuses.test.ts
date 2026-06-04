/**
 * Integration tests for `/api/cron/finalize-statuses` against the Firestore
 * emulator. The cron auto-finalises past bookings whose admin outcome was
 * never marked; getting this wrong corrupts the analytics breakdown
 * silently, so every branch of the decision matrix is exercised here.
 *
 * Decision matrix under test:
 *
 *   | from-status | endTime relative to cutoff | expected to-status |
 *   |-------------|----------------------------|--------------------|
 *   | confirmed   | past cutoff                | completed          |
 *   | pending     | past cutoff                | no_show            |
 *   | confirmed   | within grace               | unchanged          |
 *   | pending     | within grace               | unchanged          |
 *   | cancelled   | past cutoff                | unchanged          |
 *   | completed   | past cutoff                | unchanged (idempot.)|
 *   | no_show     | past cutoff                | unchanged (idempot.)|
 *   | (no bookingStatus field) | past cutoff   | unchanged (legacy)  |
 *   | scheduleTbd = true       | n/a            | unchanged           |
 *
 * Auth is checked separately with the bearer-token pattern; same shape
 * as the reminder cron.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
	Timestamp,
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	setDoc,
	where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GET as finalizeGET } from '@/app/api/cron/finalize-statuses/route'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

function withAuth(): Request {
	return new Request('http://localhost/api/cron/finalize-statuses', {
		headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
	})
}

function withoutAuth(): Request {
	return new Request('http://localhost/api/cron/finalize-statuses')
}

const HOUR_MS = 60 * 60 * 1000

interface SeedInput {
	id: string
	bookingStatus?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
	/** Hours relative to `now`. Negative = past. */
	endTimeOffsetHours: number
	scheduleTbd?: boolean
	includeBookingStatus?: boolean
}

async function seed(input: SeedInput): Promise<void> {
	const endMs = Date.now() + input.endTimeOffsetHours * HOUR_MS
	const startMs = endMs - HOUR_MS // 1h duration

	const data: Record<string, unknown> = {
		startTime: Timestamp.fromMillis(startMs),
		endTime: Timestamp.fromMillis(endMs),
		service: 'Test service',
		fullName: 'Test customer',
		email: 'test@example.com',
		phone: '+421912345678',
		place: 'massage',
	}

	if (input.scheduleTbd) data.scheduleTbd = true
	// Default: include bookingStatus. Set `includeBookingStatus: false` to
	// simulate a pre-migration legacy doc.
	if (input.includeBookingStatus !== false) {
		data.bookingStatus = input.bookingStatus ?? 'pending'
	}

	await setDoc(doc(db, 'appointments', input.id), data)
}

async function readStatus(id: string): Promise<string | undefined> {
	const snap = await getDoc(doc(db, 'appointments', id))
	if (!snap.exists()) return undefined
	const data = snap.data() as Record<string, unknown>
	return data.bookingStatus as string | undefined
}

describe.skipIf(!emulatorAvailable())(
	'/api/cron/finalize-statuses (emulator)',
	() => {
		beforeEach(async () => {
			requireEmulator()
			await wipeFirestore()
		})

		describe('authorization', () => {
			it('returns 401 without bearer secret', async () => {
				const res = await finalizeGET(withoutAuth())
				expect(res.status).toBe(401)
			})

			it('returns 200 with the correct bearer secret', async () => {
				const res = await finalizeGET(withAuth())
				expect(res.status).toBe(200)
			})
		})

		describe('confirmed → completed pass', () => {
			it('marks a confirmed booking past the grace cutoff as completed', async () => {
				// Default grace is 12h; -24h is well past.
				await seed({
					id: 'apt-confirmed-past',
					bookingStatus: 'confirmed',
					endTimeOffsetHours: -24,
				})

				const res = await finalizeGET(withAuth())
				const body = (await res.json()) as {
					completed: { updated: number }
				}
				expect(body.completed.updated).toBe(1)
				expect(await readStatus('apt-confirmed-past')).toBe('completed')
			})

			it('leaves a confirmed booking inside the grace window alone', async () => {
				// -1h: appointment ended an hour ago, well inside the 12h grace.
				await seed({
					id: 'apt-confirmed-recent',
					bookingStatus: 'confirmed',
					endTimeOffsetHours: -1,
				})

				const res = await finalizeGET(withAuth())
				const body = (await res.json()) as {
					completed: { updated: number }
				}
				expect(body.completed.updated).toBe(0)
				expect(await readStatus('apt-confirmed-recent')).toBe('confirmed')
			})
		})

		describe('pending → no_show pass', () => {
			it('marks a pending booking past the grace cutoff as no_show', async () => {
				await seed({
					id: 'apt-pending-past',
					bookingStatus: 'pending',
					endTimeOffsetHours: -24,
				})

				const res = await finalizeGET(withAuth())
				const body = (await res.json()) as {
					noShow: { updated: number }
				}
				expect(body.noShow.updated).toBe(1)
				expect(await readStatus('apt-pending-past')).toBe('no_show')
			})

			it('leaves a future pending booking alone', async () => {
				await seed({
					id: 'apt-pending-future',
					bookingStatus: 'pending',
					endTimeOffsetHours: 24,
				})

				const res = await finalizeGET(withAuth())
				const body = (await res.json()) as {
					noShow: { updated: number }
				}
				expect(body.noShow.updated).toBe(0)
				expect(await readStatus('apt-pending-future')).toBe('pending')
			})
		})

		describe('safety: terminal states + legacy docs', () => {
			it('does not touch cancelled bookings', async () => {
				await seed({
					id: 'apt-cancelled',
					bookingStatus: 'cancelled',
					endTimeOffsetHours: -24,
				})

				await finalizeGET(withAuth())
				expect(await readStatus('apt-cancelled')).toBe('cancelled')
			})

			it('does not touch already-completed bookings', async () => {
				await seed({
					id: 'apt-already-completed',
					bookingStatus: 'completed',
					endTimeOffsetHours: -24,
				})

				await finalizeGET(withAuth())
				expect(await readStatus('apt-already-completed')).toBe('completed')
			})

			it('does not touch already-no-show bookings', async () => {
				await seed({
					id: 'apt-already-noshow',
					bookingStatus: 'no_show',
					endTimeOffsetHours: -24,
				})

				await finalizeGET(withAuth())
				expect(await readStatus('apt-already-noshow')).toBe('no_show')
			})

			it('does not touch legacy docs without bookingStatus field', async () => {
				// Pre-migration shape: no bookingStatus at all. The cron must
				// skip these so we don't mass-mark old history as no-show.
				await seed({
					id: 'apt-legacy',
					includeBookingStatus: false,
					endTimeOffsetHours: -240, // 10 days ago
				})

				await finalizeGET(withAuth())
				expect(await readStatus('apt-legacy')).toBeUndefined()
			})

			it('does not touch TBD bookings even if flagged', async () => {
				await seed({
					id: 'apt-tbd',
					bookingStatus: 'pending',
					scheduleTbd: true,
					// TBD lives at 2099 in production; we use a past offset here
					// only to ensure the `scheduleTbd === true` guard alone is
					// sufficient to skip the doc.
					endTimeOffsetHours: -24,
				})

				await finalizeGET(withAuth())
				expect(await readStatus('apt-tbd')).toBe('pending')
			})
		})

		describe('audit trail', () => {
			it('writes a booking_audit row for each auto-finalized booking', async () => {
				await seed({
					id: 'apt-audit-confirmed',
					bookingStatus: 'confirmed',
					endTimeOffsetHours: -24,
				})
				await seed({
					id: 'apt-audit-pending',
					bookingStatus: 'pending',
					endTimeOffsetHours: -24,
				})

				await finalizeGET(withAuth())

				const auditSnap = await getDocs(
					query(collection(db, 'booking_audit')),
				)
				const rows = auditSnap.docs.map(d => d.data())
				const completed = rows.find(
					r => r.appointmentId === 'apt-audit-confirmed',
				)
				const noShow = rows.find(
					r => r.appointmentId === 'apt-audit-pending',
				)
				expect(completed?.action).toBe('auto_completed')
				expect(completed?.actor).toBe('system')
				expect(completed?.source).toBe('auto_post_appointment')
				expect(noShow?.action).toBe('auto_no_show')
				expect(noShow?.actor).toBe('system')
			})
		})

		describe('summary payload', () => {
			it('returns counts and the cutoff timestamp', async () => {
				await seed({
					id: 'a',
					bookingStatus: 'confirmed',
					endTimeOffsetHours: -24,
				})
				await seed({
					id: 'b',
					bookingStatus: 'pending',
					endTimeOffsetHours: -24,
				})

				const res = await finalizeGET(withAuth())
				const body = (await res.json()) as {
					ok: boolean
					cutoffIso: string
					gracePeriodHours: number
					completed: { updated: number; scanned: number }
					noShow: { updated: number; scanned: number }
				}
				expect(body.ok).toBe(true)
				expect(body.gracePeriodHours).toBe(12)
				expect(body.completed.updated).toBe(1)
				expect(body.noShow.updated).toBe(1)
				expect(typeof body.cutoffIso).toBe('string')
			})
		})
	},
)
