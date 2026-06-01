/**
 * Integration tests for `lib/booking-transitions.ts` — the orchestrator that
 * funnels every customer/admin booking state change through a Firestore
 * transaction + audit log.
 *
 * P0 invariants under test:
 *   - The status update + day-slot mutation (cancel) commit atomically.
 *   - Soft-cancel preserves the `appointments/{id}` doc and removes the slot
 *     from `days/{place}_{date}`. The doc itself is *not* deleted.
 *   - One audit row is appended per real transition; idempotent self-
 *     transitions write nothing.
 *   - Invalid transitions (e.g. confirming a cancelled booking) return
 *     `ok: false` with `reason: 'invalid_transition'` and persist nothing.
 *   - Missing appointments return `appointment_not_found`.
 *
 * Each test starts with a wiped emulator. We use the helpers in `bookAppointment`
 * to create realistic state (so the day-slot side effect can be exercised), but
 * the unit under test is `transitionBookingStatus`.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { bookAppointment } from '@/lib/book-appointment'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import {
	emulatorAvailable,
	requireEmulator,
} from '../../helpers/require-emulator'
import { wipeFirestore } from '../../helpers/firestore-emulator'

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

const A_WORKING_DAY = '2030-01-15' // Tuesday in Europe/Bratislava — covered by the schedule above.

async function seedBooking(): Promise<{ id: string }> {
	const r = await bookAppointment(
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
	return { id: r.id }
}

async function countAuditRows(appointmentId: string): Promise<number> {
	const snap = await getDocs(
		query(
			collection(db, 'booking_audit'),
			where('appointmentId', '==', appointmentId),
		),
	)
	return snap.size
}

describe.skipIf(!emulatorAvailable())('booking-transitions (emulator)', () => {
	beforeEach(async () => {
		requireEmulator()
		await wipeFirestore()
		await seedMassageSchedule()
	})

	describe('customer confirm', () => {
		it('moves pending → confirmed, sets confirmedAt, writes audit row', async () => {
			const { id } = await seedBooking()

			const result = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'customer',
				source: 'reminder_1d',
				request: { ip: '1.2.3.4', userAgent: 'jest' },
			})

			expect(result.ok).toBe(true)
			if (!result.ok) return
			expect(result.changed).toBe(true)
			expect(result.fromStatus).toBe('pending')
			expect(result.toStatus).toBe('confirmed')
			expect(result.auditId).toBeTruthy()

			const stored = await getDoc(doc(db, 'appointments', id))
			const data = stored.data() as Record<string, unknown>
			expect(data.bookingStatus).toBe('confirmed')
			expect(data.confirmedAt).toBeTruthy()
			expect(data.statusUpdatedBy).toBe('customer')
			expect(data.statusSource).toBe('reminder_1d')
			expect((data.customerResponse as { action: string }).action).toBe(
				'confirm',
			)

			const auditSnap = await getDoc(doc(db, 'booking_audit', result.auditId!))
			const audit = auditSnap.data() as Record<string, unknown>
			expect(audit.action).toBe('customer_confirmed')
			expect(audit.fromStatus).toBe('pending')
			expect(audit.toStatus).toBe('confirmed')
			expect(audit.clientPhoneE164).toBe('+421912345678')
		})

		it('is idempotent: re-confirming writes no new audit row', async () => {
			const { id } = await seedBooking()
			await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'customer',
				source: 'reminder_1d',
			})

			const second = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'customer',
				source: 'reminder_0d',
			})

			expect(second.ok).toBe(true)
			if (!second.ok) return
			expect(second.changed).toBe(false)
			expect(second.auditId).toBeNull()

			expect(await countAuditRows(id)).toBe(1)
		})
	})

	describe('customer cancel (soft-delete)', () => {
		it('moves pending → cancelled, keeps the appointment, frees the slot', async () => {
			const { id } = await seedBooking()

			const result = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'cancelled',
				actor: 'customer',
				source: 'reminder_2d',
			})

			expect(result.ok).toBe(true)
			if (!result.ok) return
			expect(result.changed).toBe(true)

			// The appointment doc remains for audit/history.
			const stored = await getDoc(doc(db, 'appointments', id))
			expect(stored.exists()).toBe(true)
			const data = stored.data() as Record<string, unknown>
			expect(data.bookingStatus).toBe('cancelled')
			expect(data.cancelledAt).toBeTruthy()

			// The day's slot list no longer references this appointment, so the
			// time is bookable again.
			const day = await getDoc(doc(db, 'days', `massage_${A_WORKING_DAY}`))
			if (day.exists()) {
				const slots =
					(day.data() as { slots?: { id: string }[] }).slots ?? []
				expect(slots.map(s => s.id)).not.toContain(id)
			}
		})

		it('cancelling twice is a no-op', async () => {
			const { id } = await seedBooking()
			await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'cancelled',
				actor: 'customer',
				source: 'reminder_1d',
			})
			const second = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'cancelled',
				actor: 'customer',
				source: 'reminder_1d',
			})
			expect(second.ok).toBe(true)
			if (!second.ok) return
			expect(second.changed).toBe(false)
			expect(await countAuditRows(id)).toBe(1)
		})
	})

	describe('state machine enforcement', () => {
		it('rejects confirming a cancelled booking', async () => {
			const { id } = await seedBooking()
			await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'cancelled',
				actor: 'customer',
				source: 'reminder_1d',
			})

			const tryConfirm = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'admin',
				source: 'admin_calendar',
			})

			expect(tryConfirm.ok).toBe(false)
			if (tryConfirm.ok) return
			expect(tryConfirm.reason).toBe('invalid_transition')
			expect(tryConfirm.fromStatus).toBe('cancelled')

			// Stored status is unchanged.
			const stored = await getDoc(doc(db, 'appointments', id))
			expect((stored.data() as { bookingStatus: string }).bookingStatus).toBe(
				'cancelled',
			)
		})

		it('returns appointment_not_found for missing docs', async () => {
			const result = await transitionBookingStatus({
				appointmentId: 'does-not-exist',
				toStatus: 'confirmed',
				actor: 'customer',
				source: 'reminder_1d',
			})
			expect(result.ok).toBe(false)
			if (result.ok) return
			expect(result.reason).toBe('appointment_not_found')
		})
	})

	describe('admin transitions', () => {
		it('admin confirm writes the admin_confirmed audit action', async () => {
			const { id } = await seedBooking()
			const r = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'admin',
				actorId: 'admin-uid-1',
				source: 'admin_calendar',
			})
			expect(r.ok).toBe(true)
			if (!r.ok) return
			const audit = await getDoc(doc(db, 'booking_audit', r.auditId!))
			expect((audit.data() as { action: string }).action).toBe(
				'admin_confirmed',
			)
			expect((audit.data() as { actorId: string }).actorId).toBe('admin-uid-1')
		})

		it('system auto-completion writes auto_completed', async () => {
			const { id } = await seedBooking()
			// Move to confirmed first, then the post-appointment cron path.
			await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'confirmed',
				actor: 'customer',
				source: 'reminder_0d',
			})
			const r = await transitionBookingStatus({
				appointmentId: id,
				toStatus: 'completed',
				actor: 'system',
				source: 'auto_post_appointment',
			})
			expect(r.ok).toBe(true)
			if (!r.ok) return
			const audit = await getDoc(doc(db, 'booking_audit', r.auditId!))
			expect((audit.data() as { action: string }).action).toBe('auto_completed')
		})
	})
})
