/**
 * Integration tests for `lib/book-appointment.ts` against the Firestore
 * emulator. Covers the booking commit (transactional slot write to
 * `days/{place}_{date}`), overlap + prep-buffer enforcement, TBD bookings,
 * and the side-effect upsert into `clients`.
 *
 * P0 invariants under test:
 *   - The booking commit is atomic: a successful return implies BOTH the
 *     `appointments/{id}` doc and the `days/{place}_{date}.slots` array
 *     were updated in the same transaction.
 *   - `OVERLAP` is thrown when the requested window touches an existing
 *     slot (including the prep buffer extension on either side).
 *   - TBD bookings never write to `days` — they sit in the unscheduled bucket
 *     until an admin assigns a real slot.
 *   - The client upsert is best-effort: a malformed phone does NOT make the
 *     booking commit fail.
 *
 * These tests rely on schedule/massage being seeded with the default working
 * hours (09:00 – 18:00, prep buffer 15 minutes). Each test starts with a
 * fresh emulator state via `wipeFirestore()`.
 */

import { describe, beforeEach, expect, it } from 'vitest'
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
	bookAppointment,
	bookAppointmentAdmin,
	bookScheduleTbdAppointment,
	deleteAppointment,
	getAppointment,
	updateAppointment,
	updateAppointmentTime,
} from '@/lib/book-appointment'
import { getClient } from '@/lib/clients-firestore'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

/**
 * Seed `schedule/massage` with the same defaults the production app uses
 * (09:00 – 18:00 Mon–Sat, prep buffer 15 minutes). Each test that books
 * timed appointments depends on this.
 */
async function seedMassageSchedule(): Promise<void> {
	await setDoc(doc(db, 'schedule', 'massage'), {
		defaultSchedule: {
			0: null,
			1: { mode: 'window', open: '09:00', close: '18:00' },
			2: { mode: 'window', open: '09:00', close: '18:00' },
			3: { mode: 'window', open: '09:00', close: '18:00' },
			4: { mode: 'window', open: '09:00', close: '18:00' },
			5: { mode: 'window', open: '09:00', close: '18:00' },
			6: { mode: 'window', open: '10:00', close: '16:00' },
		},
		slotDurationMinutes: 30,
		prepBufferMinutes: 15,
	})
}

/**
 * Picks a date that lands on a Tuesday so the default working-hours apply,
 * far enough in the future that the test isn't sensitive to "today's"
 * weekday. Returns `YYYY-MM-DD`.
 */
const TUESDAY = '2030-01-15' // Wednesday actually — let's use a known Tuesday.
const A_WORKING_DAY = '2030-01-15' // 2030-01-15 is a Tuesday in Europe/Bratislava.

describe.skipIf(!emulatorAvailable())('book-appointment (emulator)', () => {
	beforeEach(async () => {
		requireEmulator()
		await wipeFirestore()
		await seedMassageSchedule()
	})

	describe('bookAppointment — timed booking', () => {
		it('writes appointment + day slot + client upsert atomically', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Relax massage',
					fullName: 'Andrea Nováková',
					email: 'andrea@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			expect(result.id).toMatch(/^apt-/)

			const aptSnap = await getDoc(doc(db, 'appointments', result.id))
			expect(aptSnap.exists()).toBe(true)
			expect((aptSnap.data() as { service: string }).service).toBe(
				'Relax massage',
			)

			const daySnap = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			expect(daySnap.exists()).toBe(true)
			const slots = (daySnap.data() as { slots: { id: string }[] }).slots
			expect(slots.map(s => s.id)).toContain(result.id)

			// Client upsert is best-effort but for a parseable phone it must succeed.
			const client = await getClient('+421912345678')
			expect(client?.firstName).toBe('Andrea')
			expect(client?.lastVisitPlace).toBe('massage')
		})

		it('rejects an overlapping booking with `OVERLAP`', async () => {
			await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Relax massage',
					fullName: 'A',
					email: 'a@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			await expect(
				bookAppointment(
					{
						date: A_WORKING_DAY,
						startTime: '10:30',
						durationMinutes: 60,
						service: 'Relax massage',
						fullName: 'B',
						email: 'b@example.test',
						phone: '+421912345679',
					},
					'massage',
				),
			).rejects.toThrowError(/OVERLAP/)
		})

		it('enforces prep buffer on both sides (15-minute gap required)', async () => {
			await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Massage A',
					fullName: 'A',
					email: 'a@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			// 11:00 = exactly back-to-back. With 15-min buffer it must be rejected.
			await expect(
				bookAppointment(
					{
						date: A_WORKING_DAY,
						startTime: '11:00',
						durationMinutes: 60,
						service: 'Massage B',
						fullName: 'B',
						email: 'b@example.test',
						phone: '+421912345679',
					},
					'massage',
				),
			).rejects.toThrowError(/OVERLAP/)

			// 11:15 = exactly the buffer boundary. Should succeed.
			const ok = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '11:15',
					durationMinutes: 60,
					service: 'Massage C',
					fullName: 'C',
					email: 'c@example.test',
					phone: '+421912345680',
				},
				'massage',
			)
			expect(ok.id).toMatch(/^apt-/)
		})

		it('commits the booking even when the client upsert is rejected for unparseable phone', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '14:00',
					durationMinutes: 30,
					service: 'Walk-in',
					fullName: 'Walk-in',
					email: 'walkin@example.test',
					// Admin freeform — phone-e164 returns null, client upsert refuses.
					phone: '—',
				},
				'massage',
			)
			expect(result.id).toMatch(/^apt-/)
			const aptSnap = await getDoc(doc(db, 'appointments', result.id))
			expect(aptSnap.exists()).toBe(true)
			// The booking is in the books even though no client doc was created.
			const dashClient = await getClient('—')
			expect(dashClient).toBeNull()
		})
	})

	describe('bookScheduleTbdAppointment — TBD booking', () => {
		it('writes appointment with scheduleTbd=true and skips days collection', async () => {
			const result = await bookScheduleTbdAppointment(
				{
					service: 'Course of 4 lessons',
					fullName: 'Course Student',
					email: 'student@example.test',
					phone: '+421912345678',
					durationMinutes: 90,
					multiDayFullDayCount: 4,
				},
				'massage',
			)

			const aptSnap = await getDoc(doc(db, 'appointments', result.id))
			const data = aptSnap.data() as { scheduleTbd: boolean }
			expect(data.scheduleTbd).toBe(true)

			// TBD bookings sit at a placeholder date (2099-01-01) — there must be
			// no `days/massage_2099-01-01` doc created.
			const tbdDay = await getDoc(doc(db, 'days', 'massage_2099-01-01'))
			expect(tbdDay.exists()).toBe(false)

			// Client upsert still happens — re-engagement timing uses "now".
			const client = await getClient('+421912345678')
			expect(client?.firstName).toBe('Course')
		})
	})

	describe('updateAppointmentTime — drag-reschedule', () => {
		it('moves the slot from the old day doc to the new one', async () => {
			const newApt = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Relax',
					fullName: 'Andrea',
					email: 'a@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			const TARGET_DAY = '2030-01-16' // next Tuesday → Wednesday in 2030
			const newStart = new Date(`${TARGET_DAY}T14:00:00`)
			await updateAppointmentTime(newApt.id, newStart, 60)

			const oldDay = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			const oldSlots =
				(oldDay.data() as { slots?: { id: string }[] } | undefined)?.slots ?? []
			expect(oldSlots.map(s => s.id)).not.toContain(newApt.id)

			const newDay = await getDoc(doc(db, 'days', `massage_${TARGET_DAY}`))
			const newSlots =
				(newDay.data() as { slots: { id: string }[] }).slots
			expect(newSlots.map(s => s.id)).toContain(newApt.id)
		})
	})

	describe('deleteAppointment', () => {
		it('removes both the appointment doc and the slot from the day doc', async () => {
			const newApt = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Relax',
					fullName: 'Andrea',
					email: 'a@example.test',
					phone: '+421912345678',
				},
				'massage',
			)
			await deleteAppointment(newApt.id)

			expect(await getAppointment(newApt.id)).toBeNull()

			const daySnap = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			// The day doc either gets fully deleted (when no other slots) or its
			// `slots` array no longer contains this appointment.
			if (daySnap.exists()) {
				const slots =
					(daySnap.data() as { slots?: { id: string }[] }).slots ?? []
				expect(slots.map(s => s.id)).not.toContain(newApt.id)
			}
		})
	})

	describe('appointment timestamps', () => {
		it('stores startTime/endTime as Firestore Timestamps matching the requested window', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '13:30',
					durationMinutes: 45,
					service: 'Mini massage',
					fullName: 'Andrea',
					email: 'a@example.test',
					phone: '+421912345678',
				},
				'massage',
			)
			const snap = await getDoc(doc(db, 'appointments', result.id))
			const data = snap.data() as {
				startTime: Timestamp
				endTime: Timestamp
			}
			const start = data.startTime.toDate()
			const end = data.endTime.toDate()
			expect(end.getTime() - start.getTime()).toBe(45 * 60 * 1000)
			expect(start.getHours()).toBe(13)
			expect(start.getMinutes()).toBe(30)
		})
	})

	describe('multi-service booking', () => {
		it('stores every line and reserves one contiguous block for the sum', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					// 45 + 30 = the block the customer actually occupies.
					durationMinutes: 75,
					service: 'Legs + Arms',
					items: [
						{
							key: 'legs',
							title: 'Depilation › Legs',
							durationMinutes: 45,
							granularity: 'time',
							price: 30,
						},
						{
							key: 'arms',
							title: 'Depilation › Arms',
							durationMinutes: 30,
							granularity: 'time',
							price: 20,
						},
					],
					fullName: 'Andrea Nováková',
					email: 'andrea@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			const snap = await getDoc(doc(db, 'appointments', result.id))
			const data = snap.data() as {
				startTime: Timestamp
				endTime: Timestamp
				service: string
				items: { key: string; title: string; durationMinutes: number }[]
			}

			expect(data.items).toHaveLength(2)
			expect(data.items.map(i => i.key)).toEqual(['legs', 'arms'])
			// The denormalized string still carries the whole booking for legacy readers.
			expect(data.service).toBe('Legs + Arms')

			const start = data.startTime.toDate()
			const end = data.endTime.toDate()
			expect(end.getTime() - start.getTime()).toBe(75 * 60 * 1000)

			// One slot row, not one per service — the calendar shows a single visit.
			const daySnap = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			const slots = (daySnap.data()?.slots ?? []) as { id: string }[]
			expect(slots).toHaveLength(1)
			expect(slots[0]!.id).toBe(result.id)
		})

		it('blocks the whole summed block against a later booking', async () => {
			await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 75,
					service: 'Legs + Arms',
					items: [
						{ key: 'legs', title: 'Legs', durationMinutes: 45, granularity: 'time' },
						{ key: 'arms', title: 'Arms', durationMinutes: 30, granularity: 'time' },
					],
					fullName: 'Andrea Nováková',
					email: 'andrea@example.test',
					phone: '+421912345678',
				},
				'massage',
			)

			// 11:00 sits inside 10:00–11:15; a single-service booking would have
			// ended at 10:45 and left this free, so this asserts the sum is honoured.
			await expect(
				bookAppointment(
					{
						date: A_WORKING_DAY,
						startTime: '11:00',
						durationMinutes: 30,
						service: 'Other',
						fullName: 'Iveta Kováčová',
						email: 'iveta@example.test',
						phone: '+421911222333',
					},
					'massage',
				),
			).rejects.toThrow('OVERLAP')
		})

		it('getAppointment reads items back', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '14:00',
					durationMinutes: 75,
					service: 'Legs + Arms',
					items: [
						{ key: 'legs', title: 'Legs', durationMinutes: 45, granularity: 'time' },
						{ key: 'arms', title: 'Arms', durationMinutes: 30, granularity: 'time' },
					],
					fullName: 'Andrea Nováková',
					email: 'andrea@example.test',
					phone: '+421912345678',
				},
				'massage',
			)
			const read = await getAppointment(result.id)
			expect(read?.items).toHaveLength(2)
		})

		it('omits the items field entirely for a single-service booking', async () => {
			const result = await bookAppointment(
				{
					date: A_WORKING_DAY,
					startTime: '09:00',
					durationMinutes: 30,
					service: 'Legs',
					fullName: 'Andrea Nováková',
					email: 'andrea@example.test',
					phone: '+421912345678',
				},
				'massage',
			)
			const snap = await getDoc(doc(db, 'appointments', result.id))
			expect(snap.data()).not.toHaveProperty('items')
		})
	})

	describe('admin multi-service booking', () => {
		it('reserves one contiguous block with NO gap between services', async () => {
			const items = [
				{ key: 'a', title: 'Massage', durationMinutes: 45, granularity: 'time' as const },
				{ key: 'b', title: 'Waxing', durationMinutes: 30, granularity: 'time' as const },
				{ key: 'c', title: 'Piercing', durationMinutes: 20, granularity: 'time' as const },
			]
			const result = await bookAppointmentAdmin(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 45 + 30 + 20,
					service: 'Massage + Waxing + Piercing',
					items,
					fullName: 'Admin Walk-in',
				},
				'massage',
			)

			const snap = await getDoc(doc(db, 'appointments', result.id))
			const data = snap.data() as {
				startTime: Timestamp
				endTime: Timestamp
				items: { durationMinutes: number }[]
			}
			const start = data.startTime.toDate()
			const end = data.endTime.toDate()

			// The block is exactly the sum — no padding, no break inserted.
			const blockMinutes = (end.getTime() - start.getTime()) / 60000
			const sumOfServices = data.items.reduce((a, i) => a + i.durationMinutes, 0)
			expect(sumOfServices).toBe(95)
			expect(blockMinutes).toBe(sumOfServices)
			expect(start.getHours()).toBe(10)
			expect(end.getHours()).toBe(11)
			expect(end.getMinutes()).toBe(35)

			// One slot row: the calendar shows a single uninterrupted visit.
			const daySnap = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			expect((daySnap.data()?.slots ?? []).length).toBe(1)
		})

		it('keeps a duration beyond the old 240-minute cap intact', async () => {
			// Six 45-minute services = 270 min. The previous admin clamp cut this
			// to 240, leaving the calendar 30 minutes shorter than the real visit.
			const items = Array.from({ length: 6 }, (_, i) => ({
				key: `s${i}`,
				title: `Service ${i}`,
				durationMinutes: 45,
				granularity: 'time' as const,
			}))
			const result = await bookAppointmentAdmin(
				{
					date: A_WORKING_DAY,
					startTime: '09:00',
					durationMinutes: 270,
					service: items.map(i => i.title).join(' + '),
					items,
				},
				'massage',
			)
			const snap = await getDoc(doc(db, 'appointments', result.id))
			const data = snap.data() as { startTime: Timestamp; endTime: Timestamp }
			const minutes =
				(data.endTime.toDate().getTime() - data.startTime.toDate().getTime()) / 60000
			expect(minutes).toBe(270)
		})

		it('blocks the full summed span against the next booking', async () => {
			await bookAppointmentAdmin(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 95,
					service: 'Massage + Waxing + Piercing',
					items: [
						{ key: 'a', title: 'Massage', durationMinutes: 45, granularity: 'time' },
						{ key: 'b', title: 'Waxing', durationMinutes: 30, granularity: 'time' },
						{ key: 'c', title: 'Piercing', durationMinutes: 20, granularity: 'time' },
					],
				},
				'massage',
			)
			// 11:00 falls inside 10:00–11:35. A single 45-min service would have
			// ended at 10:45 and left this free.
			await expect(
				bookAppointment(
					{
						date: A_WORKING_DAY,
						startTime: '11:00',
						durationMinutes: 30,
						service: 'Other',
						fullName: 'Iveta Kováčová',
						email: 'iveta@example.test',
						phone: '+421911222333',
					},
					'massage',
				),
			).rejects.toThrow('OVERLAP')
		})

		it('drops a stale breakdown when an edit reduces it to one service', async () => {
			const created = await bookAppointmentAdmin(
				{
					date: A_WORKING_DAY,
					startTime: '10:00',
					durationMinutes: 75,
					service: 'Massage + Waxing',
					items: [
						{ key: 'a', title: 'Massage', durationMinutes: 45, granularity: 'time' },
						{ key: 'b', title: 'Waxing', durationMinutes: 30, granularity: 'time' },
					],
				},
				'massage',
			)
			expect((await getAppointment(created.id))?.items).toHaveLength(2)

			await updateAppointment(created.id, { service: 'Massage', items: [] }, 'massage')

			const after = await getDoc(doc(db, 'appointments', created.id))
			expect(after.data()).not.toHaveProperty('items')
			expect(after.data()?.service).toBe('Massage')
		})
	})
})

// Silence the lint warning — TUESDAY is a clarity anchor for the
// "what day are we using" comment above. Vitest tree-shakes unused locals.
void TUESDAY
