/**
 * Integration tests for `lib/clients-firestore.ts` — every function that
 * reads / writes the `clients` collection.
 *
 * Setup: connects to the Firestore emulator via `tests/setup.ts`. Each test
 * starts with an empty database via `wipeFirestore()` so order is never
 * load-bearing.
 *
 * P0 invariants under test:
 *   - Phone is the canonical identity; non-E.164 input is refused at the
 *     surface (no orphan documents).
 *   - Existing-client upsert is "sticky": birthday / opt-ins / notes set
 *     by an admin are not overwritten by a follow-up booking.
 *   - `lastVisitAt` only advances forward (admin retro-creates appointments
 *     occasionally and we don't want them to backdate the customer's
 *     re-engagement clock).
 *   - Birthday / re-engagement queries filter on `optInMarketing` and the
 *     resend-guards, so a single cron run can't double-send.
 */

import { describe, beforeEach, expect, it } from 'vitest'
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
	createClientByAdmin,
	findClientsForReEngagement,
	findClientsWithBirthdayOn,
	getClient,
	markBirthdayGreeted,
	markReEngagementSent,
	updateClient,
	upsertClientFromBooking,
	type ClientDoc,
} from '@/lib/clients-firestore'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

describe.skipIf(!emulatorAvailable())('clients-firestore (emulator)', () => {
	beforeEach(async () => {
		requireEmulator()
		await wipeFirestore()
	})

	describe('upsertClientFromBooking — new client', () => {
		it('creates a document keyed by phone in E.164', async () => {
			const result = await upsertClientFromBooking({
				phone: '+421 912 345 678',
				fullName: 'Andrea Nováková',
				email: 'andrea@example.test',
				place: 'depilation',
				appointmentStartAt: new Date('2026-05-10T09:00:00Z'),
			})

			expect(result).toEqual({ created: true, phoneE164: '+421912345678' })

			const snap = await getDoc(doc(db, 'clients', '+421912345678'))
			expect(snap.exists()).toBe(true)
			const data = snap.data() as ClientDoc
			expect(data.firstName).toBe('Andrea')
			expect(data.lastName).toBe('Nováková')
			expect(data.email).toBe('andrea@example.test')
			expect(data.lastVisitPlace).toBe('depilation')
			expect(data.visitCount).toBe(1)
			// GDPR — opt-in must default to OFF on the booking-driven path.
			expect(data.optInMarketing).toBe(false)
			expect(data.optInWhatsApp).toBe(true)
		})

		it('refuses bookings whose phone cannot be parsed', async () => {
			const result = await upsertClientFromBooking({
				phone: 'reception calls back',
				fullName: 'Walk-in',
				email: '',
				place: 'massage',
				appointmentStartAt: new Date(),
			})
			expect(result).toEqual({ skipped: 'unparseable_phone' })
		})

		it('records a birthday + marketing opt-in when supplied by the form', async () => {
			await upsertClientFromBooking({
				phone: '+421912345678',
				fullName: 'Andrea',
				email: 'a@b.test',
				place: 'depilation',
				appointmentStartAt: new Date('2026-05-10T09:00:00Z'),
				birthday: '1992-05-17',
				optInMarketing: true,
			})

			const client = await getClient('+421912345678')
			expect(client?.birthday).toEqual({ year: 1992, month: 5, day: 17 })
			expect(client?.optInMarketing).toBe(true)
		})
	})

	describe('upsertClientFromBooking — existing client', () => {
		const phoneE164 = '+421912345678'

		beforeEach(async () => {
			await createClientByAdmin({
				phone: phoneE164,
				firstName: 'Andrea',
				lastName: 'Nováková',
				email: 'andrea@example.test',
				birthday: '1992-05-17',
				adminNotes: 'VIP, prefers afternoon',
				tags: ['vip'],
				optInMarketing: true,
			})
		})

		it('does not overwrite sticky admin fields (birthday, opt-ins, notes)', async () => {
			await upsertClientFromBooking({
				phone: phoneE164,
				fullName: 'Andrea Public',
				email: 'public@example.test',
				place: 'depilation',
				appointmentStartAt: new Date('2026-06-15T10:00:00Z'),
				// Form values that would, naively, overwrite the admin's edits.
				birthday: '1980-01-01',
				optInMarketing: false,
			})

			const client = await getClient(phoneE164)
			expect(client?.birthday).toEqual({ year: 1992, month: 5, day: 17 })
			expect(client?.optInMarketing).toBe(true)
			expect(client?.adminNotes).toBe('VIP, prefers afternoon')
			expect(client?.tags).toContain('vip')
		})

		it('increments visitCount on each booking', async () => {
			const before = (await getClient(phoneE164))?.visitCount ?? 0
			await upsertClientFromBooking({
				phone: phoneE164,
				fullName: 'Andrea',
				email: 'a@b.test',
				place: 'depilation',
				appointmentStartAt: new Date('2026-06-15T10:00:00Z'),
			})
			const after = (await getClient(phoneE164))?.visitCount ?? 0
			expect(after).toBe(before + 1)
		})

		it('advances lastVisitAt only when the new booking is later than the stored one', async () => {
			const futureBooking = new Date('2026-12-01T10:00:00Z')
			await upsertClientFromBooking({
				phone: phoneE164,
				fullName: 'Andrea',
				email: 'a@b.test',
				place: 'depilation',
				appointmentStartAt: futureBooking,
			})
			const afterFuture = await getClient(phoneE164)
			const futureMillis = afterFuture?.lastVisitAt?.toMillis() ?? 0
			expect(futureMillis).toBe(futureBooking.getTime())

			// A retro booking should NOT pull lastVisitAt backwards.
			const pastBooking = new Date('2025-01-15T10:00:00Z')
			await upsertClientFromBooking({
				phone: phoneE164,
				fullName: 'Andrea',
				email: 'a@b.test',
				place: 'depilation',
				appointmentStartAt: pastBooking,
			})
			const afterPast = await getClient(phoneE164)
			expect(afterPast?.lastVisitAt?.toMillis()).toBe(futureMillis)
		})
	})

	describe('createClientByAdmin', () => {
		it('creates a fresh client document with visitCount = 0', async () => {
			const result = await createClientByAdmin({
				phone: '+421912345678',
				firstName: 'Walk-in',
				lastName: null,
				email: null,
				adminNotes: 'Met at expo',
			})
			expect(result).toEqual({ ok: true, phoneE164: '+421912345678' })
			const client = await getClient('+421912345678')
			expect(client?.visitCount).toBe(0)
			expect(client?.adminNotes).toBe('Met at expo')
		})

		it('refuses to overwrite an existing client', async () => {
			await createClientByAdmin({
				phone: '+421912345678',
				firstName: 'First',
			})
			const second = await createClientByAdmin({
				phone: '+421912345678',
				firstName: 'Second',
			})
			expect(second).toEqual({ ok: false, reason: 'already_exists' })
		})

		it('refuses unparseable phone', async () => {
			const result = await createClientByAdmin({
				phone: '???',
				firstName: 'X',
			})
			expect(result).toEqual({ ok: false, reason: 'unparseable_phone' })
		})
	})

	describe('findClientsWithBirthdayOn', () => {
		beforeEach(async () => {
			await Promise.all([
				createClientByAdmin({
					phone: '+421900000001',
					firstName: 'OptedIn',
					birthday: '1990-05-17',
					optInMarketing: true,
				}),
				createClientByAdmin({
					phone: '+421900000002',
					firstName: 'OptedOut',
					birthday: '1990-05-17',
					optInMarketing: false,
				}),
				createClientByAdmin({
					phone: '+421900000003',
					firstName: 'WrongDay',
					birthday: '1990-05-18',
					optInMarketing: true,
				}),
			])
		})

		it('returns only opted-in clients whose birthday matches month + day', async () => {
			const matches = await findClientsWithBirthdayOn(5, 17)
			const phones = matches.map(c => c.phone)
			expect(phones).toEqual(['+421900000001'])
		})

		it('returns an empty array when the date matches no one', async () => {
			const matches = await findClientsWithBirthdayOn(12, 31)
			expect(matches).toEqual([])
		})
	})

	describe('findClientsForReEngagement', () => {
		const NOW = new Date('2026-05-10T12:00:00Z')

		beforeEach(async () => {
			await createClientByAdmin({
				phone: '+421900000010',
				firstName: 'Stale',
				optInMarketing: true,
			})
			await createClientByAdmin({
				phone: '+421900000011',
				firstName: 'Fresh',
				optInMarketing: true,
			})
			await createClientByAdmin({
				phone: '+421900000012',
				firstName: 'StaleNoOptIn',
				optInMarketing: false,
			})

			// Force lastVisitAt on each — createClientByAdmin defaults to "now".
			const stale = new Date(NOW.getTime() - 200 * 24 * 60 * 60 * 1000)
			const fresh = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
			await setDoc(
				doc(db, 'clients', '+421900000010'),
				{ lastVisitAt: Timestamp.fromDate(stale) },
				{ merge: true },
			)
			await setDoc(
				doc(db, 'clients', '+421900000011'),
				{ lastVisitAt: Timestamp.fromDate(fresh) },
				{ merge: true },
			)
			await setDoc(
				doc(db, 'clients', '+421900000012'),
				{ lastVisitAt: Timestamp.fromDate(stale) },
				{ merge: true },
			)
		})

		it('returns clients dormant past the threshold AND opted into marketing', async () => {
			const matches = await findClientsForReEngagement(180, NOW)
			const phones = matches.map(c => c.phone).sort()
			expect(phones).toEqual(['+421900000010'])
		})

		it('suppresses clients who received re-engagement within the same window', async () => {
			await markReEngagementSent(
				'+421900000010',
				new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
			)
			const matches = await findClientsForReEngagement(180, NOW)
			expect(matches.map(c => c.phone)).toEqual([])
		})
	})

	describe('markBirthdayGreeted + markReEngagementSent', () => {
		const phoneE164 = '+421912345678'

		beforeEach(async () => {
			await createClientByAdmin({
				phone: phoneE164,
				firstName: 'Andrea',
				birthday: '1992-05-17',
				optInMarketing: true,
			})
		})

		it('writes birthdayGreetedYear so the next cron run can skip', async () => {
			await markBirthdayGreeted(phoneE164, 2026)
			const client = await getClient(phoneE164)
			expect(client?.birthdayGreetedYear).toBe(2026)
		})

		it('writes reEngagementSentAt timestamp', async () => {
			const now = new Date('2026-05-10T12:00:00Z')
			await markReEngagementSent(phoneE164, now)
			const client = await getClient(phoneE164)
			expect(client?.reEngagementSentAt?.toMillis()).toBe(now.getTime())
		})
	})

	describe('updateClient', () => {
		it('patches the requested fields and leaves others untouched', async () => {
			await createClientByAdmin({
				phone: '+421912345678',
				firstName: 'Andrea',
				adminNotes: 'Initial note',
				tags: ['vip'],
			})

			await updateClient('+421912345678', {
				email: 'updated@example.test',
				tags: ['vip', 'allergy'],
			})

			const client = await getClient('+421912345678')
			expect(client?.email).toBe('updated@example.test')
			expect(client?.tags).toEqual(['vip', 'allergy'])
			expect(client?.adminNotes).toBe('Initial note')
		})
	})
})
