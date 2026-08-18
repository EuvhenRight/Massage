// @vitest-environment jsdom
/**
 * Unit tests for the v4 → v5 booking-draft migration in
 * `lib/booking-draft-storage.ts`.
 *
 * P0 because this runs against drafts already sitting in real customers'
 * localStorage. Getting it wrong means someone mid-booking either loses their
 * selection or — worse — is restored onto a confirmation step whose duration no
 * longer matches what will be written to Firestore.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
	BOOKING_DRAFT_FORMAT_VERSION,
	draftItems,
	loadBookingDraft,
	parseDraftToState,
	saveBookingDraft,
	type BookingDraft,
} from '@/lib/booking-draft-storage'
import type { BookingItem } from '@/lib/booking-items'

const PLACE = 'depilation'
const KEY = `booking-draft-${PLACE}`

/** A draft as written by the pre-multi-service code (no `items`). */
function v4Draft(overrides: Partial<BookingDraft> = {}): BookingDraft {
	return {
		v: 4,
		step: 2,
		service: 'Depilation › Legs › Shin',
		date: null,
		dateKey: null,
		time: null,
		durationMinutes: 45,
		fullName: 'Andrea',
		email: 'a@example.test',
		phone: '+421912345678',
		savedAt: Date.now(),
		...overrides,
	}
}

beforeEach(() => {
	localStorage.clear()
})

describe('v4 → v5 migration', () => {
	it('promotes the single service string into a one-line cart', () => {
		const items = draftItems(v4Draft())
		expect(items).toHaveLength(1)
		expect(items[0]!.title).toBe('Depilation › Legs › Shin')
		expect(items[0]!.durationMinutes).toBe(45)
		expect(items[0]!.granularity).toBe('time')
	})

	it('carries a legacy TBD draft across as a TBD line', () => {
		const items = draftItems(
			v4Draft({
				bookingGranularity: 'tbd',
				bookingDayCount: 3,
				scheduleTbdCustomerMessage: 'We will call you',
			}),
		)
		expect(items[0]!.granularity).toBe('tbd')
		expect(items[0]!.bookingDayCount).toBe(3)
		expect(items[0]!.scheduleTbdCustomerMessage).toBe('We will call you')
	})

	it('treats the legacy "day" granularity as TBD', () => {
		expect(draftItems(v4Draft({ bookingGranularity: 'day' }))[0]!.granularity).toBe('tbd')
	})

	it('yields an empty cart when the old draft had no service', () => {
		expect(draftItems(v4Draft({ service: '   ' }))).toEqual([])
	})

	it('loadBookingDraft rewrites a stored v4 draft to v5 with items', () => {
		localStorage.setItem(KEY, JSON.stringify(v4Draft()))
		const loaded = loadBookingDraft(PLACE)
		expect(loaded).not.toBeNull()
		expect(loaded!.v).toBe(BOOKING_DRAFT_FORMAT_VERSION)
		expect(loaded!.items).toHaveLength(1)

		const rewritten = JSON.parse(localStorage.getItem(KEY)!) as BookingDraft
		expect(rewritten.v).toBe(BOOKING_DRAFT_FORMAT_VERSION)
		expect(rewritten.items).toHaveLength(1)
	})
})

describe('v5 round-trip', () => {
	const cart: BookingItem[] = [
		{ key: 'a', title: 'Legs', durationMinutes: 45, granularity: 'time', price: 30 },
		{ key: 'b', title: 'Arms', durationMinutes: 30, granularity: 'time', price: 20 },
	]

	it('saves and restores every line of a multi-service cart', () => {
		saveBookingDraft(PLACE, {
			step: 2,
			items: cart,
			date: null,
			time: null,
			fullName: 'Andrea',
			email: 'a@example.test',
			phone: '+421912345678',
		})
		const restored = parseDraftToState(loadBookingDraft(PLACE)!)
		expect(restored.items.map(i => i.title)).toEqual(['Legs', 'Arms'])
	})

	it('writes the denormalized mirrors so an older tab is not left blank', () => {
		saveBookingDraft(PLACE, {
			step: 2,
			items: cart,
			date: null,
			time: null,
			fullName: 'Andrea',
			email: 'a@example.test',
			phone: '+421912345678',
		})
		const raw = JSON.parse(localStorage.getItem(KEY)!) as BookingDraft
		expect(raw.service).toBe('Legs + Arms')
		expect(raw.durationMinutes).toBe(75)
	})

	it('re-derives duration from items, ignoring a stale stored value', () => {
		localStorage.setItem(
			KEY,
			JSON.stringify(
				v4Draft({
					v: 5,
					durationMinutes: 999,
					items: [
						{ key: 'a', title: 'Legs', durationMinutes: 45, granularity: 'time' },
						{ key: 'b', title: 'Arms', durationMinutes: 30, granularity: 'time' },
					],
				}),
			),
		)
		expect(loadBookingDraft(PLACE)!.durationMinutes).toBe(75)
	})

	it('sends an empty cart back to step 1 rather than a dead confirmation screen', () => {
		localStorage.setItem(KEY, JSON.stringify(v4Draft({ step: 3, service: '' })))
		expect(loadBookingDraft(PLACE)!.step).toBe(1)
	})
})
