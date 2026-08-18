/**
 * Unit tests for `lib/booking-items.ts` — the multi-service cart model.
 *
 * P0 because every downstream number comes from here: the block length written
 * to Firestore, the slot-fit check, and the price the customer is quoted. The
 * TBD rules are the other half — mixing an "arranged individually" line into a
 * timed booking would produce an appointment nobody can honour.
 */

import { describe, expect, it } from 'vitest'
import {
	addBookingItem,
	bookingItemsFromFirestore,
	bookingItemToFirestore,
	canAddBookingItem,
	isTbdCart,
	joinItemTitles,
	MAX_BOOKING_ITEMS,
	parseItemPriceValue,
	removeBookingItem,
	sumItemPrices,
	toggleBookingItem,
	totalDurationMinutes,
	type BookingItem,
} from '@/lib/booking-items'

function timed(key: string, durationMinutes = 30, price?: number | string): BookingItem {
	return { key, title: `Service ${key}`, durationMinutes, granularity: 'time', price }
}

function tbd(key: string): BookingItem {
	return {
		key,
		title: `Course ${key}`,
		durationMinutes: 60,
		granularity: 'tbd',
		bookingDayCount: 2,
	}
}

describe('totalDurationMinutes', () => {
	it('sums every timed line — this is the block the customer occupies', () => {
		expect(totalDurationMinutes([timed('a', 45), timed('b', 30), timed('c', 15)])).toBe(90)
	})

	it('returns 0 for an empty cart', () => {
		expect(totalDurationMinutes([])).toBe(0)
	})

	it('clamps a nonsense per-item duration instead of poisoning the sum', () => {
		const bad = { ...timed('a'), durationMinutes: Number.NaN }
		expect(totalDurationMinutes([bad, timed('b', 30)])).toBe(60)
	})

	it('does not sum TBD carts — admin assigns whole days, not minutes', () => {
		expect(totalDurationMinutes([tbd('x')])).toBe(60)
	})
})

describe('TBD mixing rules', () => {
	it('refuses a TBD line on top of timed services', () => {
		const check = canAddBookingItem([timed('a')], tbd('x'))
		expect(check).toEqual({ ok: false, reason: 'tbd-into-timed' })
	})

	it('refuses a timed line on top of a TBD booking', () => {
		const check = canAddBookingItem([tbd('x')], timed('a'))
		expect(check).toEqual({ ok: false, reason: 'timed-into-tbd' })
	})

	it('refuses a second TBD line — each is arranged separately', () => {
		const check = canAddBookingItem([tbd('x')], tbd('y'))
		expect(check).toEqual({ ok: false, reason: 'tbd-into-tbd' })
	})

	it('allows a TBD line into an empty cart', () => {
		expect(canAddBookingItem([], tbd('x'))).toEqual({ ok: true })
	})

	it('stacks timed lines freely', () => {
		expect(canAddBookingItem([timed('a'), timed('b')], timed('c'))).toEqual({ ok: true })
	})

	it('addBookingItem is a no-op on a rejected candidate', () => {
		const cart = [timed('a')]
		expect(addBookingItem(cart, tbd('x'))).toBe(cart)
	})
})

describe('cart membership', () => {
	it('rejects a duplicate key rather than double-charging', () => {
		expect(canAddBookingItem([timed('a')], timed('a'))).toEqual({
			ok: false,
			reason: 'duplicate',
		})
	})

	it('caps the cart size', () => {
		const full = Array.from({ length: MAX_BOOKING_ITEMS }, (_, i) => timed(`s${i}`))
		expect(canAddBookingItem(full, timed('extra'))).toEqual({
			ok: false,
			reason: 'max-items',
		})
	})

	it('toggle adds then removes the same line', () => {
		const once = toggleBookingItem([], timed('a'))
		expect(once).toHaveLength(1)
		expect(toggleBookingItem(once, timed('a'))).toHaveLength(0)
	})

	it('removeBookingItem drops only the named line', () => {
		const cart = [timed('a'), timed('b'), timed('c')]
		expect(removeBookingItem(cart, 'b').map(i => i.key)).toEqual(['a', 'c'])
	})

	it('isTbdCart keys off the first line', () => {
		expect(isTbdCart([tbd('x')])).toBe(true)
		expect(isTbdCart([timed('a')])).toBe(false)
		expect(isTbdCart([])).toBe(false)
	})
})

describe('price totals', () => {
	it('adds up plain numeric prices exactly', () => {
		const total = sumItemPrices([timed('a', 30, 30), timed('b', 30, 20)])
		expect(total.total).toBe(50)
		expect(total.approximate).toBe(false)
		expect(total.hasAnyPrice).toBe(true)
	})

	it('marks the sum approximate when a line is qualified ("from 30")', () => {
		const total = sumItemPrices([timed('a', 30, 'from 30'), timed('b', 30, 20)])
		expect(total.total).toBe(50)
		expect(total.approximate).toBe(true)
	})

	it('marks the sum approximate when a line has no price at all', () => {
		const total = sumItemPrices([timed('a', 30, 30), timed('b', 30, '—')])
		expect(total.total).toBe(30)
		expect(total.unpricedCount).toBe(1)
		expect(total.approximate).toBe(true)
	})

	it('reports no price when nothing in the cart is priced', () => {
		const total = sumItemPrices([timed('a', 30, '—'), timed('b')])
		expect(total.hasAnyPrice).toBe(false)
		expect(total.approximate).toBe(false)
	})

	it('parses a bare number as exact and a currency suffix as exact', () => {
		expect(parseItemPriceValue(30)).toEqual({ value: 30, approximate: false })
		expect(parseItemPriceValue('30 €')).toEqual({ value: 30, approximate: false })
	})

	it('treats a range as approximate rather than silently picking one end', () => {
		expect(parseItemPriceValue('25/30')).toEqual({ value: 25, approximate: true })
	})

	it('accepts a decimal comma', () => {
		expect(parseItemPriceValue('12,50')).toEqual({ value: 12.5, approximate: false })
	})

	it('treats an unset price as absent, not zero', () => {
		expect(parseItemPriceValue('—').value).toBeNull()
		expect(parseItemPriceValue('').value).toBeNull()
		expect(parseItemPriceValue(undefined).value).toBeNull()
	})
})

describe('Firestore round-trip', () => {
	it('drops undefined fields — Firestore rejects them', () => {
		const row = bookingItemToFirestore(timed('a'))
		expect(Object.values(row).every(v => v !== undefined)).toBe(true)
		expect(row).not.toHaveProperty('price')
		expect(row).not.toHaveProperty('serviceId')
	})

	it('survives a write/read cycle', () => {
		const items = [timed('a', 45, 30), timed('b', 30, 20)]
		const back = bookingItemsFromFirestore(items.map(bookingItemToFirestore))
		expect(back.map(i => i.key)).toEqual(['a', 'b'])
		expect(totalDurationMinutes(back)).toBe(75)
		expect(sumItemPrices(back).total).toBe(50)
	})

	it('returns an empty cart for a legacy doc with no items array', () => {
		expect(bookingItemsFromFirestore(undefined)).toEqual([])
		expect(bookingItemsFromFirestore(null)).toEqual([])
	})

	it('skips malformed rows instead of throwing', () => {
		const back = bookingItemsFromFirestore([
			null,
			{ title: '   ' },
			{ title: 'Real', durationMinutes: 30 },
		])
		expect(back).toHaveLength(1)
		expect(back[0]!.title).toBe('Real')
	})
})

describe('joinItemTitles', () => {
	it('joins titles for the denormalized service string', () => {
		expect(joinItemTitles([timed('a'), timed('b')])).toBe('Service a + Service b')
	})

	it('prefers the requested locale title when present', () => {
		const item: BookingItem = { ...timed('a'), titleRu: 'Ноги' }
		expect(joinItemTitles([item], 'titleRu')).toBe('Ноги')
	})

	it('falls back to the display title when the locale is missing', () => {
		expect(joinItemTitles([timed('a')], 'titleRu')).toBe('Service a')
	})
})
