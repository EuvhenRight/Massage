/**
 * End-to-end integrity of everything that occupies TIME on the calendar.
 *
 * The booking system now has several shapes that must agree with one another:
 * single service, multi-service (one contiguous block), full-day, multi-day,
 * and TBD (unscheduled). They all share one invariant:
 *
 *   Whatever a booking occupies on the calendar must equal what it occupies in
 *   the overlap check — otherwise two clients get the same chair.
 *
 * These tests exercise that invariant across shapes, working hours, buffers,
 * moves, edits and deletes, against the Firestore emulator.
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
import {
	getAvailableTimeSlots,
	getPrepBufferMinutes,
	parseOccupiedSlots,
} from '@/lib/availability-firestore'
import { fetchMergedPublicOccupiedSlots } from '@/lib/booking-occupied-slots'
import { getSchedule } from '@/lib/schedule-firestore'
import type { BookingItem } from '@/lib/booking-items'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

const PLACE = 'massage' as const
/** 2030-01-15 is a Tuesday: a normal 09:00–18:00 working day. */
const WORKDAY = '2030-01-15'
/** 2030-01-20 is a Sunday: closed in the seeded schedule. */
const CLOSED_DAY = '2030-01-20'
/** 2030-01-19 is a Saturday: short day, 10:00–16:00. */
const SHORT_DAY = '2030-01-19'

async function seedSchedule(): Promise<void> {
	await setDoc(doc(db, 'schedule', PLACE), {
		defaultSchedule: {
			0: null, // Sunday closed
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

function timed(key: string, minutes: number): BookingItem {
	return {
		key,
		title: `Service ${key}`,
		durationMinutes: minutes,
		granularity: 'time',
	}
}

async function occupiedOn(dateKey: string) {
	const schedule = await getSchedule(PLACE)
	return fetchMergedPublicOccupiedSlots(
		PLACE,
		new Date(`${dateKey}T00:00:00`),
		new Date(`${dateKey}T23:59:59.999`),
		schedule,
	)
}

async function slotsOn(dateKey: string, durationMinutes: number) {
	const schedule = await getSchedule(PLACE)
	const occ = await occupiedOn(dateKey)
	return getAvailableTimeSlots(
		new Date(`${dateKey}T12:00:00`),
		durationMinutes,
		occ,
		schedule,
	)
}

async function blockMinutes(id: string): Promise<number> {
	const snap = await getDoc(doc(db, 'appointments', id))
	const d = snap.data() as { startTime: Timestamp; endTime: Timestamp }
	return (d.endTime.toDate().getTime() - d.startTime.toDate().getTime()) / 60000
}

async function daySlots(dateKey: string): Promise<{ id: string }[]> {
	const snap = await getDoc(doc(db, 'days', `${PLACE}_${dateKey}`))
	return (snap.data()?.slots ?? []) as { id: string }[]
}

describe.skipIf(!emulatorAvailable())('calendar time integrity (emulator)', () => {
	beforeEach(async () => {
		requireEmulator()
		await wipeFirestore()
		await seedSchedule()
	})

	describe('multi-service block', () => {
		it('occupies exactly the sum, with no gap between services', async () => {
			const items = [timed('a', 45), timed('b', 30), timed('c', 20)]
			const r = await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 95,
					service: 'A + B + C',
					items,
					fullName: 'Multi',
					email: 'm@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			expect(await blockMinutes(r.id)).toBe(95)
			expect(await daySlots(WORKDAY)).toHaveLength(1)
		})

		it('removes every slot inside the block from public availability', async () => {
			await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 95, // 10:00 – 11:35
					service: 'A + B + C',
					items: [timed('a', 45), timed('b', 30), timed('c', 20)],
					fullName: 'Multi',
					email: 'm@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			const free = await slotsOn(WORKDAY, 30)
			// Buffer extends the block to 11:50, so 11:30 must not be offered.
			for (const taken of ['10:00', '10:30', '11:00', '11:30']) {
				expect(free).not.toContain(taken)
			}
			expect(free).toContain('09:00')
		})

		it('the calendar block and the overlap check agree on the same range', async () => {
			await bookAppointment(
				{
					date: WORKDAY,
					startTime: '13:00',
					durationMinutes: 75,
					service: 'A + B',
					items: [timed('a', 45), timed('b', 30)],
					fullName: 'Multi',
					email: 'm@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			const schedule = await getSchedule(PLACE)
			const buffer = getPrepBufferMinutes(schedule)
			const occ = await occupiedOn(WORKDAY)
			// Both `appointments` and `days` report it, hence duplicates; take the widest.
			const start = Math.min(...occ.map(o => o.start.getTime()))
			const end = Math.max(...occ.map(o => o.end.getTime()))
			expect(new Date(start).getHours()).toBe(13)
			expect((end - start) / 60000).toBe(75 + buffer)
		})
	})

	describe('prep buffer between different bookings', () => {
		it('rejects a booking that starts inside the previous one’s buffer', async () => {
			await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 60, // ends 11:00, buffer to 11:15
					service: 'A',
					fullName: 'First',
					email: 'f@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			await expect(
				bookAppointment(
					{
						date: WORKDAY,
						startTime: '11:00',
						durationMinutes: 30,
						service: 'B',
						fullName: 'Second',
						email: 's@example.test',
						phone: '+421911222333',
					},
					PLACE,
				),
			).rejects.toThrow('OVERLAP')
		})

		it('accepts one that starts after the buffer', async () => {
			await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'A',
					fullName: 'First',
					email: 'f@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			const ok = await bookAppointment(
				{
					date: WORKDAY,
					startTime: '11:30',
					durationMinutes: 30,
					service: 'B',
					fullName: 'Second',
					email: 's@example.test',
					phone: '+421911222333',
				},
				PLACE,
			)
			expect(await blockMinutes(ok.id)).toBe(30)
		})

		it('rejects one that ends inside the next one’s start buffer (symmetry)', async () => {
			await bookAppointment(
				{
					date: WORKDAY,
					startTime: '12:00',
					durationMinutes: 60,
					service: 'Later',
					fullName: 'Later',
					email: 'l@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			// 11:15–12:00 ends exactly at the later booking's start — buffer forbids it.
			await expect(
				bookAppointment(
					{
						date: WORKDAY,
						startTime: '11:15',
						durationMinutes: 45,
						service: 'Earlier',
						fullName: 'Earlier',
						email: 'e@example.test',
						phone: '+421911222333',
					},
					PLACE,
				),
			).rejects.toThrow('OVERLAP')
		})
	})

	describe('working hours', () => {
		it('offers no slots on a closed day', async () => {
			expect(await slotsOn(CLOSED_DAY, 60)).toEqual([])
		})

		it('never offers a start the booking cannot finish before closing', async () => {
			const free = await slotsOn(WORKDAY, 180) // 3 hours, closes 18:00
			for (const slot of free) {
				const [h, m] = slot.split(':').map(Number)
				expect(h! * 60 + m! + 180).toBeLessThanOrEqual(18 * 60)
			}
			expect(free).toContain('15:00')
			expect(free).not.toContain('15:30')
		})

		it('respects the shorter Saturday window', async () => {
			const free = await slotsOn(SHORT_DAY, 60)
			expect(free[0]).toBe('10:00')
			for (const slot of free) {
				const [h, m] = slot.split(':').map(Number)
				expect(h! * 60 + m! + 60).toBeLessThanOrEqual(16 * 60)
			}
		})

		it('offers nothing when the booking is longer than the whole day', async () => {
			expect(await slotsOn(SHORT_DAY, 8 * 60)).toEqual([])
		})
	})

	describe('full-day and multi-day bookings', () => {
		it('a full-day booking blocks the entire working window', async () => {
			await bookAppointmentAdmin(
				{
					date: WORKDAY,
					startTime: '09:00',
					adminBookingMode: 'day',
					adminFullDayDates: [WORKDAY],
					service: 'Full day',
					fullName: 'Owner',
				},
				PLACE,
			)
			expect(await slotsOn(WORKDAY, 30)).toEqual([])
		})

		it('a multi-day booking blocks every day it covers, and nothing else', async () => {
			const second = '2030-01-16'
			const third = '2030-01-17'
			await bookAppointmentAdmin(
				{
					date: WORKDAY,
					startTime: '09:00',
					adminBookingMode: 'day',
					adminFullDayDates: [WORKDAY, second, third],
					service: 'Course',
					fullName: 'Owner',
				},
				PLACE,
			)
			for (const d of [WORKDAY, second, third]) {
				expect(await slotsOn(d, 30)).toEqual([])
				expect((await daySlots(d)).length).toBeGreaterThan(0)
			}
			// The following working day stays open.
			expect((await slotsOn('2030-01-18', 30)).length).toBeGreaterThan(0)
		})

		it('a timed booking cannot be squeezed into a full-day booking', async () => {
			await bookAppointmentAdmin(
				{
					date: WORKDAY,
					startTime: '09:00',
					adminBookingMode: 'day',
					adminFullDayDates: [WORKDAY],
					service: 'Full day',
					fullName: 'Owner',
				},
				PLACE,
			)
			await expect(
				bookAppointment(
					{
						date: WORKDAY,
						startTime: '13:00',
						durationMinutes: 30,
						service: 'Squeeze',
						fullName: 'X',
						email: 'x@example.test',
						phone: '+421912345678',
					},
					PLACE,
				),
			).rejects.toThrow('OVERLAP')
		})
	})

	describe('TBD (unscheduled) bookings', () => {
		it('never occupies calendar time', async () => {
			await bookScheduleTbdAppointment(
				{
					service: 'Course',
					items: [
						{
							key: 'c',
							title: 'Course',
							durationMinutes: 60,
							granularity: 'tbd',
							bookingDayCount: 2,
						},
					],
					fullName: 'Student',
					email: 's@example.test',
					phone: '+421912345678',
					durationMinutes: 60,
					multiDayFullDayCount: 2,
				},
				PLACE,
			)
			// Full availability remains: TBD writes no `days` rows.
			expect((await slotsOn(WORKDAY, 60)).length).toBeGreaterThan(0)
			expect(await daySlots(WORKDAY)).toHaveLength(0)
		})
	})

	describe('moving, editing and deleting', () => {
		it('moving frees the old range and occupies the new one', async () => {
			const r = await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 75,
					service: 'A + B',
					items: [timed('a', 45), timed('b', 30)],
					fullName: 'Mover',
					email: 'm@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			await updateAppointmentTime(r.id, new Date(`${WORKDAY}T14:00:00`), 75)

			const free = await slotsOn(WORKDAY, 30)
			expect(free).toContain('10:00')
			expect(free).not.toContain('14:00')
			expect(await daySlots(WORKDAY)).toHaveLength(1)
		})

		it('shortening a booking re-opens the freed time', async () => {
			const r = await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 120, // 10:00 – 12:00
					service: 'Long',
					fullName: 'Long',
					email: 'l@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			expect(await slotsOn(WORKDAY, 30)).not.toContain('11:30')

			await updateAppointment(
				r.id,
				{ startTime: new Date(`${WORKDAY}T10:00:00`), durationMinutes: 30 },
				PLACE,
			)
			expect(await blockMinutes(r.id)).toBe(30)
			expect(await slotsOn(WORKDAY, 30)).toContain('11:30')
		})

		it('deleting removes the appointment and its day slot together', async () => {
			const r = await bookAppointment(
				{
					date: WORKDAY,
					startTime: '10:00',
					durationMinutes: 60,
					service: 'Doomed',
					fullName: 'D',
					email: 'd@example.test',
					phone: '+421912345678',
				},
				PLACE,
			)
			expect(await daySlots(WORKDAY)).toHaveLength(1)

			await deleteAppointment(r.id)

			expect(await getAppointment(r.id)).toBeNull()
			expect(await daySlots(WORKDAY)).toHaveLength(0)
			expect(await slotsOn(WORKDAY, 60)).toContain('10:00')
		})

		it('deleting a multi-day booking clears every day it covered', async () => {
			const second = '2030-01-16'
			const r = await bookAppointmentAdmin(
				{
					date: WORKDAY,
					startTime: '09:00',
					adminBookingMode: 'day',
					adminFullDayDates: [WORKDAY, second],
					service: 'Course',
					fullName: 'Owner',
				},
				PLACE,
			)
			await deleteAppointment(r.id)
			for (const d of [WORKDAY, second]) {
				expect(await daySlots(d)).toHaveLength(0)
				expect((await slotsOn(d, 30)).length).toBeGreaterThan(0)
			}
		})
	})

	describe('back-to-back capacity', () => {
		it('fills a day with buffered bookings without any overlap slipping through', async () => {
			const schedule = await getSchedule(PLACE)
			const buffer = getPrepBufferMinutes(schedule)
			const booked: { start: number; end: number }[] = []

			// 09:00, then every 60 + buffer minutes.
			for (let m = 9 * 60; m + 60 <= 18 * 60; m += 60 + buffer) {
				const hh = String(Math.floor(m / 60)).padStart(2, '0')
				const mm = String(m % 60).padStart(2, '0')
				await bookAppointment(
					{
						date: WORKDAY,
						startTime: `${hh}:${mm}`,
						durationMinutes: 60,
						service: `S${m}`,
						fullName: 'Chain',
						email: 'c@example.test',
						phone: '+421912345678',
					},
					PLACE,
				)
				booked.push({ start: m, end: m + 60 })
			}
			expect(booked.length).toBeGreaterThanOrEqual(6)

			// No two committed ranges may overlap.
			for (let i = 1; i < booked.length; i++) {
				expect(booked[i]!.start).toBeGreaterThanOrEqual(booked[i - 1]!.end)
			}
			expect(await daySlots(WORKDAY)).toHaveLength(booked.length)
		})
	})

	describe('occupied-slot parsing', () => {
		it('extends every occupied range by the prep buffer, once', () => {
			const start = new Date(`${WORKDAY}T10:00:00`)
			const end = new Date(`${WORKDAY}T11:00:00`)
			const [slot] = parseOccupiedSlots(
				[{ startTime: Timestamp.fromDate(start), endTime: Timestamp.fromDate(end) }],
				15,
			)
			expect(slot!.start.getTime()).toBe(start.getTime())
			expect((slot!.end.getTime() - end.getTime()) / 60000).toBe(15)
		})
	})
})
