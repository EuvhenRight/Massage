/**
 * Unit tests for `lib/analytics-helpers.ts`.
 *
 * These functions back every revenue / customer / period KPI shown on the
 * admin analytics panel. They are pure and deterministic so the test budget
 * here is generous — each case targets one concrete invariant.
 *
 * Why each section matters:
 *   - `parsePriceValue`        — admins often paste prices as "20", "20 €",
 *                                "20,50 EUR", "from 20". A regression here
 *                                drops revenue silently.
 *   - `flattenCatalogPrices`   — index that powers every revenue lookup. It
 *                                must walk all three catalog shapes (items
 *                                directly on a service, items in a zone,
 *                                items inside a section's zone) and respect
 *                                the `onSale + salePrice` toggle.
 *   - `resolveCatalogEntry`,
 *     `appointmentPrice`,
 *     `appointmentServiceLabel` — these tie an appointment to its catalog
 *                                row. The fallback order (id → leaf title →
 *                                stored localized field) protects against
 *                                services that were renamed or whose IDs
 *                                changed between the booking and now.
 *   - `resolvePeriod`          — the analytics filter chips. Bugs here have
 *                                shown up as "whole month missing" or
 *                                "weekend double-counted" in past CRMs.
 *   - `formatMoney/Percent`    — formatting consistency across locales.
 */

import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
	appointmentPrice,
	appointmentServiceLabel,
	dayCountFor,
	flattenCatalogPrices,
	formatMoney,
	formatPercent,
	normalizeShortLocale,
	parsePriceValue,
	resolveCatalogEntry,
	resolvePeriod,
	tsToDate,
} from '@/lib/analytics-helpers'
import type { AppointmentData } from '@/lib/book-appointment'
import type { ServiceData } from '@/lib/services'
import type {
	PriceCatalogStructure,
	ZonePriceItem,
} from '@/types/price-catalog'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build a minimal but type-correct `AppointmentData` row for a test. */
function anAppointment(overrides: Partial<AppointmentData> = {}): AppointmentData {
	const start = Timestamp.fromDate(new Date('2026-05-15T10:00:00Z'))
	const end = Timestamp.fromDate(new Date('2026-05-15T11:00:00Z'))
	return {
		id: 'apt-test',
		startTime: start,
		endTime: end,
		service: 'Massage',
		fullName: 'Andrea',
		email: 'a@b.test',
		phone: '+421912345678',
		...overrides,
	}
}

/** Catalog item with localized titles + a numeric price. */
function aPriceItem(overrides: Partial<ZonePriceItem> = {}): ZonePriceItem {
	return {
		id: 'pi-' + Math.random().toString(36).slice(2, 8),
		durationMinutes: 60,
		price: 20,
		titleSk: 'Chrbát',
		titleEn: 'Back',
		titleRu: 'Спина',
		titleUk: 'Спина',
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// parsePriceValue
// ---------------------------------------------------------------------------

describe('parsePriceValue', () => {
	it.each([
		[20, 20],
		[20.5, 20.5],
		['20', 20],
		['20.5', 20.5],
		['20,50', 20.5],
		['20 €', 20],
		['€ 20', 20],
		['from 20', 20],
		['od 25,90 EUR', 25.9],
	])('parses %p as %p', (input, expected) => {
		expect(parsePriceValue(input)).toBe(expected)
	})

	it.each([null, undefined, '', '—', 'cena dohodou', 'договорная', 'abc'])(
		'rejects %p',
		input => {
			expect(parsePriceValue(input as unknown as string)).toBeNull()
		},
	)

	it('rejects zero and negative numbers', () => {
		expect(parsePriceValue(0)).toBeNull()
		expect(parsePriceValue(-10)).toBeNull()
		expect(parsePriceValue('-10')).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// normalizeShortLocale
// ---------------------------------------------------------------------------

describe('normalizeShortLocale', () => {
	it.each([
		['sk', 'sk'],
		['en', 'en'],
		['ru', 'ru'],
		['uk', 'uk'],
		['en-US', 'en'],
		['sk-SK', 'sk'],
		['SK', 'sk'],
		['unknown', 'sk'], // unsupported → Slovak (salon default)
		['', 'sk'],
		['de', 'sk'],
	])('coerces %p to %p', (input, expected) => {
		expect(normalizeShortLocale(input)).toBe(expected)
	})
})

// ---------------------------------------------------------------------------
// flattenCatalogPrices
// ---------------------------------------------------------------------------

describe('flattenCatalogPrices', () => {
	it('returns empty maps for a null catalog', () => {
		const { byId, byTitle } = flattenCatalogPrices(null)
		expect(byId.size).toBe(0)
		expect(byTitle.size).toBe(0)
	})

	it('walks all three nesting shapes (service.items, zone.items, section.zones.items)', () => {
		const direct = aPriceItem({ id: 'direct', titleSk: 'Direct', titleEn: 'Direct' })
		const zoned = aPriceItem({ id: 'zoned', titleSk: 'Zoned', titleEn: 'Zoned' })
		const sectioned = aPriceItem({
			id: 'sectioned',
			titleSk: 'Sectioned',
			titleEn: 'Sectioned',
		})
		const catalog: PriceCatalogStructure = {
			man: { services: [] },
			woman: {
				services: [
					{
						id: 'svc1',
						titleSk: 'Service',
						items: [direct],
						zones: [{ id: 'z1', titleSk: 'Zone', items: [zoned] }],
						sections: [
							{
								id: 'sec1',
								titleSk: 'Section',
								zones: [{ id: 'z2', titleSk: 'Sub-zone', items: [sectioned] }],
							},
						],
					},
				],
			},
		}
		const { byId, byTitle } = flattenCatalogPrices(catalog)
		expect(byId.has('direct')).toBe(true)
		expect(byId.has('zoned')).toBe(true)
		expect(byId.has('sectioned')).toBe(true)
		expect(byTitle.get('direct')?.price).toBe(20)
		expect(byTitle.get('zoned')?.price).toBe(20)
		expect(byTitle.get('sectioned')?.price).toBe(20)
	})

	it('uses salePrice when item.onSale is true and salePrice is set', () => {
		const onSale = aPriceItem({
			id: 'sale',
			price: 100,
			onSale: true,
			salePrice: 70,
		})
		const catalog: PriceCatalogStructure = {
			man: { services: [{ id: 's', titleSk: 'Svc', items: [onSale] }] },
			woman: { services: [] },
		}
		const { byId } = flattenCatalogPrices(catalog)
		expect(byId.get('sale')?.price).toBe(70)
	})

	it('ignores the onSale flag when salePrice is missing — falls back to list price', () => {
		const halfBaked = aPriceItem({
			id: 'sale2',
			price: 100,
			onSale: true,
			// salePrice intentionally omitted
		})
		const catalog: PriceCatalogStructure = {
			man: { services: [{ id: 's', titleSk: 'Svc', items: [halfBaked] }] },
			woman: { services: [] },
		}
		const { byId } = flattenCatalogPrices(catalog)
		expect(byId.get('sale2')?.price).toBe(100)
	})

	it('silently skips items whose price cannot be parsed', () => {
		const unparseable = aPriceItem({ id: 'no-price', price: 'cena dohodou' })
		const catalog: PriceCatalogStructure = {
			man: { services: [{ id: 's', titleSk: 'Svc', items: [unparseable] }] },
			woman: { services: [] },
		}
		const { byId } = flattenCatalogPrices(catalog)
		expect(byId.size).toBe(0)
	})

	it('indexes a single item under all available locale titles (case-insensitive)', () => {
		const item = aPriceItem({
			id: 'multi',
			titleSk: 'Chrbát',
			titleEn: 'Back',
			titleRu: 'Спина',
			titleUk: 'Спина',
		})
		const catalog: PriceCatalogStructure = {
			man: { services: [{ id: 's', titleSk: 'Svc', items: [item] }] },
			woman: { services: [] },
		}
		const { byTitle } = flattenCatalogPrices(catalog)
		expect(byTitle.has('chrbát')).toBe(true)
		expect(byTitle.has('back')).toBe(true)
		expect(byTitle.has('спина')).toBe(true)
		// Same entry — same price reference
		expect(byTitle.get('chrbát')?.price).toBe(20)
	})
})

// ---------------------------------------------------------------------------
// resolveCatalogEntry + appointmentPrice
// ---------------------------------------------------------------------------

describe('resolveCatalogEntry', () => {
	const item = aPriceItem({ id: 'pi-1', titleEn: 'Back', titleSk: 'Chrbát' })
	const catalog: PriceCatalogStructure = {
		man: { services: [{ id: 's', titleSk: 'Svc', items: [item] }] },
		woman: { services: [] },
	}
	const { byId, byTitle } = flattenCatalogPrices(catalog)

	it('prefers serviceId match', () => {
		const apt = anAppointment({ serviceId: 'pi-1', service: 'Some other path › Back' })
		const hit = resolveCatalogEntry(apt, byId, byTitle)
		expect(hit?.price).toBe(20)
	})

	it('falls back to leaf-title match when serviceId is missing', () => {
		const apt = anAppointment({ service: 'Massage › Body › Back' })
		const hit = resolveCatalogEntry(apt, byId, byTitle)
		expect(hit?.price).toBe(20)
	})

	it('matches against any catalog locale title — e.g. Slovak appointment, English catalog leaf', () => {
		const apt = anAppointment({ service: 'Masáž › Chrbát' })
		const hit = resolveCatalogEntry(apt, byId, byTitle)
		expect(hit?.price).toBe(20)
	})

	it('returns null when neither id nor any leaf title matches', () => {
		const apt = anAppointment({ service: 'Nonexistent service' })
		expect(resolveCatalogEntry(apt, byId, byTitle)).toBeNull()
	})
})

describe('appointmentPrice', () => {
	const item = aPriceItem({ id: 'pi-1', price: 50 })
	const catalog: PriceCatalogStructure = {
		man: { services: [{ id: 's', titleSk: 'Svc', items: [item] }] },
		woman: { services: [] },
	}
	const { byId, byTitle } = flattenCatalogPrices(catalog)
	const noCatalogServices: ServiceData[] = []

	it('returns the catalog price for a 1-day appointment', () => {
		const apt = anAppointment({ serviceId: 'pi-1' })
		expect(appointmentPrice(apt, noCatalogServices, byId, byTitle)).toBe(50)
	})

	it('returns null when no catalog match', () => {
		const apt = anAppointment({ serviceId: 'unknown', service: 'no-match' })
		expect(appointmentPrice(apt, noCatalogServices, byId, byTitle)).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// appointmentServiceLabel
// ---------------------------------------------------------------------------

describe('appointmentServiceLabel', () => {
	const item = aPriceItem({
		id: 'pi-1',
		titleSk: 'Chrbát',
		titleEn: 'Back',
		titleRu: 'Спина',
		titleUk: 'Спина',
	})
	const catalog: PriceCatalogStructure = {
		man: { services: [{ id: 's', titleSk: 'Svc', items: [item] }] },
		woman: { services: [] },
	}
	const { byId, byTitle } = flattenCatalogPrices(catalog)

	it('returns the catalog title in the admin locale when matched by id', () => {
		const apt = anAppointment({ serviceId: 'pi-1', service: 'Masáž › Chrbát' })
		expect(appointmentServiceLabel(apt, 'en', byId, byTitle)).toBe('Back')
		expect(appointmentServiceLabel(apt, 'ru', byId, byTitle)).toBe('Спина')
	})

	it('falls back to apt.serviceXx when no catalog match is found', () => {
		const apt = anAppointment({
			service: 'no-match',
			serviceEn: 'Massage › Back',
			serviceRu: 'Массаж › Спина',
		})
		// Catalog miss → take serviceEn leaf for English admin
		expect(appointmentServiceLabel(apt, 'en', byId, byTitle)).toBe('Back')
		// Russian admin gets the Russian variant — leaf only
		expect(appointmentServiceLabel(apt, 'ru', byId, byTitle)).toBe('Спина')
	})

	it('falls back to leaf of apt.service when no localized field is present', () => {
		const apt = anAppointment({
			service: 'Service › Body › Lower back',
		})
		expect(appointmentServiceLabel(apt, 'en', byId, byTitle)).toBe('Lower back')
	})

	it('returns em-dash when there is no service info at all', () => {
		const apt = anAppointment({ service: '' })
		expect(appointmentServiceLabel(apt, 'sk', byId, byTitle)).toBe('—')
	})
})

// ---------------------------------------------------------------------------
// dayCountFor
// ---------------------------------------------------------------------------

describe('dayCountFor', () => {
	it('returns 1 for ordinary timed appointments', () => {
		const apt = anAppointment()
		expect(dayCountFor(apt, [])).toBe(1)
	})

	it('returns the explicit full-day-count for admin day-mode appointments', () => {
		const apt = anAppointment({
			adminBookingMode: 'day',
			adminFullDayDates: ['2026-06-01', '2026-06-02', '2026-06-03'],
		})
		expect(dayCountFor(apt, [])).toBe(3)
	})
})

// ---------------------------------------------------------------------------
// resolvePeriod
// ---------------------------------------------------------------------------

describe('resolvePeriod', () => {
	const fixedNow = new Date('2026-05-15T12:00:00') // mid-month, Friday

	it('thisMonth → first of month (inclusive) to first of next month (exclusive)', () => {
		const { from, to } = resolvePeriod('thisMonth', { from: '', to: '' }, fixedNow)
		expect(from).toEqual(new Date(2026, 4, 1))
		expect(to).toEqual(new Date(2026, 5, 1))
	})

	it('lastMonth → previous calendar month', () => {
		const { from, to } = resolvePeriod('lastMonth', { from: '', to: '' }, fixedNow)
		expect(from).toEqual(new Date(2026, 3, 1))
		expect(to).toEqual(new Date(2026, 4, 1))
	})

	it('last30 → start of (now − 29 days) to start of (now + 1 day)', () => {
		const { from, to } = resolvePeriod('last30', { from: '', to: '' }, fixedNow)
		expect(from).toEqual(new Date(2026, 3, 16)) // April 16
		expect(to).toEqual(new Date(2026, 4, 16)) // May 16 (exclusive)
	})

	it('thisYear → Jan 1 inclusive to Jan 1 of next year exclusive', () => {
		const { from, to } = resolvePeriod('thisYear', { from: '', to: '' }, fixedNow)
		expect(from).toEqual(new Date(2026, 0, 1))
		expect(to).toEqual(new Date(2027, 0, 1))
	})

	it('custom → user-supplied YYYY-MM-DD with the `to` day made inclusive', () => {
		const { from, to } = resolvePeriod(
			'custom',
			{ from: '2026-03-10', to: '2026-03-20' },
			fixedNow,
		)
		expect(from).toEqual(new Date(2026, 2, 10))
		// `to` is exclusive in the math, so the displayed last-day (20th) is
		// the day BEFORE the exclusive boundary (21st).
		expect(to).toEqual(new Date(2026, 2, 21))
	})

	it('custom with malformed inputs → defaults to thisMonth-from / now-to', () => {
		const { from } = resolvePeriod(
			'custom',
			{ from: 'not-a-date', to: 'not-a-date' },
			fixedNow,
		)
		expect(from).toEqual(new Date(2026, 4, 1)) // May 1
	})

	it('handles leap-year February boundaries cleanly', () => {
		const leapFeb = new Date('2024-02-15T12:00:00')
		const { from, to } = resolvePeriod('thisMonth', { from: '', to: '' }, leapFeb)
		expect(from).toEqual(new Date(2024, 1, 1)) // Feb 1
		expect(to).toEqual(new Date(2024, 2, 1)) // March 1 — 29 days later
		expect((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)).toBe(29)
	})

	it('handles year rollover for lastMonth in January', () => {
		const earlyJan = new Date('2026-01-10T12:00:00')
		const { from, to } = resolvePeriod('lastMonth', { from: '', to: '' }, earlyJan)
		expect(from).toEqual(new Date(2025, 11, 1)) // Dec 1, 2025
		expect(to).toEqual(new Date(2026, 0, 1)) // Jan 1, 2026
	})
})

// ---------------------------------------------------------------------------
// formatMoney, formatPercent
// ---------------------------------------------------------------------------

describe('formatPercent', () => {
	it('formats a fraction as a rounded percent', () => {
		expect(formatPercent(0.42)).toBe('42%')
		expect(formatPercent(0.999)).toBe('100%')
	})

	it('returns em-dash for NaN / non-finite values', () => {
		expect(formatPercent(NaN)).toBe('—')
		expect(formatPercent(Infinity)).toBe('—')
	})

	it('handles 0 as "0%" (real value, not unknown)', () => {
		expect(formatPercent(0)).toBe('0%')
	})
})

describe('formatMoney', () => {
	it('formats a positive number as EUR currency in the given locale', () => {
		const formatted = formatMoney(123.45, 'sk-SK')
		// Output is locale-dependent; only assert the EUR symbol is present.
		expect(formatted).toMatch(/€/)
		expect(formatted).toMatch(/123/)
	})

	it('drops the fractional part for amounts >= 100', () => {
		expect(formatMoney(150.99, 'en-US')).toMatch(/151|150/)
		expect(formatMoney(150.99, 'en-US')).not.toMatch(/\.99/)
	})

	it('keeps decimals for small amounts', () => {
		expect(formatMoney(12.5, 'en-US')).toMatch(/12\.5/)
	})

	it('returns em-dash for null', () => {
		expect(formatMoney(null, 'sk-SK')).toBe('—')
	})

	it('returns em-dash for non-finite numbers', () => {
		expect(formatMoney(NaN, 'sk-SK')).toBe('—')
	})
})

// ---------------------------------------------------------------------------
// tsToDate
// ---------------------------------------------------------------------------

describe('tsToDate', () => {
	it('unwraps a Firestore Timestamp', () => {
		const d = new Date('2026-05-15T10:00:00Z')
		const ts = Timestamp.fromDate(d)
		expect(tsToDate(ts)?.getTime()).toBe(d.getTime())
	})

	it('returns null for null / undefined', () => {
		expect(tsToDate(null)).toBeNull()
		expect(tsToDate(undefined)).toBeNull()
	})

	it('returns null for plain strings or numbers', () => {
		expect(tsToDate('2026-05-15')).toBeNull()
		expect(tsToDate(1234567890)).toBeNull()
	})

	it('accepts any object with a toDate() method', () => {
		const fake = { toDate: () => new Date('2026-05-15') }
		expect(tsToDate(fake)?.getFullYear()).toBe(2026)
	})
})
