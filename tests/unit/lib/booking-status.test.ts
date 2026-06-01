/**
 * Unit tests for the booking status state machine.
 *
 * The state machine is the contract that every customer action and every
 * admin status change funnels through. Bugs here mean either:
 *   - illegal transitions silently succeed (cancelled bookings get
 *     re-confirmed, terminal states get re-opened), or
 *   - legal transitions are rejected (customers stuck at `pending`).
 *
 * The matrix below exhaustively encodes the design table from §3 of the
 * implementation plan. Future changes to `ALLOWED_TRANSITIONS` must update
 * the matrix in lock-step — that's the whole point of pinning every cell.
 */

import { describe, expect, it } from 'vitest'
import {
	BOOKING_STATUS_VALUES,
	type BookingStatus,
	readBookingStatus,
	reminderTokenSourceToStatusSource,
	STATUS_TIMESTAMP_FIELD,
	validateTransition,
} from '@/lib/booking-status'

/**
 * Canonical transition matrix. `true` ⇒ the transition is allowed.
 * The diagonal is `true` because self-transitions are no-op idempotent.
 */
const TRANSITION_MATRIX: Record<BookingStatus, Record<BookingStatus, boolean>> = {
	pending: {
		pending: true,
		confirmed: true,
		cancelled: true,
		completed: true,
		no_show: true,
	},
	confirmed: {
		pending: false,
		confirmed: true,
		cancelled: true,
		completed: true,
		no_show: true,
	},
	cancelled: {
		pending: false,
		confirmed: false,
		cancelled: true,
		completed: false,
		no_show: false,
	},
	completed: {
		pending: false,
		confirmed: false,
		cancelled: false,
		completed: true,
		no_show: true,
	},
	no_show: {
		pending: false,
		confirmed: false,
		cancelled: false,
		completed: true,
		no_show: true,
	},
}

describe('validateTransition — state machine matrix', () => {
	for (const from of BOOKING_STATUS_VALUES) {
		for (const to of BOOKING_STATUS_VALUES) {
			const expected = TRANSITION_MATRIX[from][to]
			it(`${from} → ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
				const result = validateTransition(from, to)
				if (expected) {
					expect(result.ok).toBe(true)
					if (result.ok) {
						expect(result.changed).toBe(from !== to)
					}
				} else {
					expect(result.ok).toBe(false)
					if (!result.ok) {
						expect(result.reason).toBe('invalid_transition')
						expect(result.from).toBe(from)
						expect(result.to).toBe(to)
					}
				}
			})
		}
	}
})

describe('validateTransition — idempotency', () => {
	it('self-transitions return ok with changed=false', () => {
		for (const status of BOOKING_STATUS_VALUES) {
			const r = validateTransition(status, status)
			expect(r.ok).toBe(true)
			if (r.ok) expect(r.changed).toBe(false)
		}
	})

	it('real transitions return changed=true', () => {
		const r = validateTransition('pending', 'confirmed')
		expect(r.ok).toBe(true)
		if (r.ok) expect(r.changed).toBe(true)
	})
})

describe('validateTransition — irreversibility', () => {
	it('cancelled is terminal except for self-idempotent', () => {
		for (const to of BOOKING_STATUS_VALUES) {
			const r = validateTransition('cancelled', to)
			if (to === 'cancelled') {
				expect(r.ok).toBe(true)
			} else {
				expect(r.ok).toBe(false)
			}
		}
	})

	it('completed never returns to pending/confirmed/cancelled', () => {
		expect(validateTransition('completed', 'pending').ok).toBe(false)
		expect(validateTransition('completed', 'confirmed').ok).toBe(false)
		expect(validateTransition('completed', 'cancelled').ok).toBe(false)
	})

	it('no_show never returns to pending/confirmed/cancelled', () => {
		expect(validateTransition('no_show', 'pending').ok).toBe(false)
		expect(validateTransition('no_show', 'confirmed').ok).toBe(false)
		expect(validateTransition('no_show', 'cancelled').ok).toBe(false)
	})

	it('admin override between completed and no_show is allowed', () => {
		expect(validateTransition('completed', 'no_show').ok).toBe(true)
		expect(validateTransition('no_show', 'completed').ok).toBe(true)
	})
})

describe('readBookingStatus', () => {
	it('returns pending for docs without the field (legacy data)', () => {
		expect(readBookingStatus({})).toBe('pending')
	})

	it('returns the stored status for valid values', () => {
		for (const s of BOOKING_STATUS_VALUES) {
			expect(readBookingStatus({ bookingStatus: s })).toBe(s)
		}
	})

	it('falls back to pending on garbage input', () => {
		expect(readBookingStatus({ bookingStatus: 'made-up' })).toBe('pending')
		expect(readBookingStatus({ bookingStatus: 42 })).toBe('pending')
		expect(readBookingStatus({ bookingStatus: null })).toBe('pending')
	})
})

describe('STATUS_TIMESTAMP_FIELD', () => {
	it('maps every non-pending status to a unique timestamp field', () => {
		const values = Object.values(STATUS_TIMESTAMP_FIELD)
		expect(new Set(values).size).toBe(values.length)
	})
})

describe('reminderTokenSourceToStatusSource', () => {
	it('expands compact reminder identifiers', () => {
		expect(reminderTokenSourceToStatusSource('r2')).toBe('reminder_2d')
		expect(reminderTokenSourceToStatusSource('r1')).toBe('reminder_1d')
		expect(reminderTokenSourceToStatusSource('r0')).toBe('reminder_0d')
	})

	it('returns null for unknown / missing input', () => {
		expect(reminderTokenSourceToStatusSource(undefined)).toBeNull()
		expect(reminderTokenSourceToStatusSource(null)).toBeNull()
		expect(reminderTokenSourceToStatusSource('')).toBeNull()
		expect(reminderTokenSourceToStatusSource('rX')).toBeNull()
	})
})
