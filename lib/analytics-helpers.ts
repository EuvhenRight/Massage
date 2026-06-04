/**
 * Pure helpers powering the admin analytics panel.
 *
 * Extracted out of `components/AdminAnalyticsPanel.tsx` so they can be
 * unit-tested without a React renderer. Everything in this file is a pure
 * function (no Firestore, no DOM, no module side-effects).
 *
 * Responsibilities:
 *   - Walk the price catalog and produce a {id, leaf-title} → price map for
 *     revenue resolution.
 *   - Resolve a single appointment's catalog entry, price, and display
 *     label — id-first, then leaf-title fallback (case-insensitive, any
 *     supported locale).
 *   - Resolve KPI period boundaries (`thisMonth`, `lastMonth`, `last30`,
 *     `last90`, `thisYear`, `custom`) in the local timezone.
 *   - Format numbers (percent, EUR currency).
 */

import { Timestamp } from 'firebase/firestore'
import type { AppointmentData } from './book-appointment'
import {
	findServiceDataForAppointment,
	resolveAppointmentRequiredFullDayCount,
	type ServiceData,
} from './services'
import {
	getTitleStrictForLocale,
	type PriceCatalogStructure,
	type PriceService,
	type PriceZone,
	type ZonePriceItem,
} from '@/types/price-catalog'

export const LOCALE_KEYS = ['sk', 'en', 'ru', 'uk'] as const
export type ShortLocale = (typeof LOCALE_KEYS)[number]

export type PeriodKey =
	| 'thisMonth'
	| 'lastMonth'
	| 'last30'
	| 'last90'
	| 'thisYear'
	| 'custom'

export interface CatalogPriceEntry {
	price: number
	/** Localized titles indexed by short locale code — used to render the booking
	 *  list in the admin's active locale, no matter which locale the customer used. */
	titles: { sk: string; en: string; ru: string; uk: string }
}

/** Safely converts a Firestore Timestamp / Date / unknown to a Date. */
export function tsToDate(value: unknown): Date | null {
	if (!value) return null
	if (value instanceof Timestamp) return value.toDate()
	if (typeof value === 'object' && value && 'toDate' in value) {
		return (value as { toDate: () => Date }).toDate()
	}
	return null
}

/**
 * Parses the leading number out of arbitrary price strings ("from 20", "20 €",
 * "20,50€"…) and returns null when no positive number can be extracted.
 * Accepts numbers as-is. Negative or zero values are rejected — a real
 * catalog item with a non-positive price is treated as "unknown" rather
 * than included with a weird sign in the revenue total.
 */
export function parsePriceValue(raw: number | string | undefined | null): number | null {
	if (raw == null) return null
	if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null
	const m = String(raw).replace(',', '.').match(/-?\d+(?:\.\d+)?/)
	if (!m) return null
	const n = parseFloat(m[0])
	return Number.isFinite(n) && n > 0 ? n : null
}

/** Coerces a long locale code like "en-US" or "sk-SK" to one of our 4 supported keys. */
export function normalizeShortLocale(raw: string): ShortLocale {
	const head = raw.slice(0, 2).toLowerCase() as ShortLocale
	return LOCALE_KEYS.includes(head) ? head : 'sk'
}

/**
 * Walks a `PriceCatalogStructure` and returns two indices:
 *   - `byId`    — `ZonePriceItem.id` → entry
 *   - `byTitle` — every available locale's title (lower-cased, trimmed) → entry
 *
 * Items without a parseable price are silently skipped (they don't crash
 * revenue math, but they also can't contribute to it).
 */
export function flattenCatalogPrices(
	catalog: PriceCatalogStructure | null,
): { byId: Map<string, CatalogPriceEntry>; byTitle: Map<string, CatalogPriceEntry> } {
	const byId = new Map<string, CatalogPriceEntry>()
	const byTitle = new Map<string, CatalogPriceEntry>()
	if (!catalog) return { byId, byTitle }

	const ingestItem = (item: ZonePriceItem) => {
		const raw = item.onSale && item.salePrice != null ? item.salePrice : item.price
		const num = parsePriceValue(raw)
		if (num == null) return
		const titles = {
			sk: getTitleStrictForLocale(item, 'sk') || '',
			en: getTitleStrictForLocale(item, 'en') || '',
			ru: getTitleStrictForLocale(item, 'ru') || '',
			uk: getTitleStrictForLocale(item, 'uk') || '',
		}
		const entry: CatalogPriceEntry = { price: num, titles }
		byId.set(item.id, entry)
		// Title fallback: index by every available locale so a Russian booking
		// resolves against the Slovak-only catalog and vice versa.
		for (const loc of LOCALE_KEYS) {
			const t = titles[loc]
			if (t) byTitle.set(t.trim().toLocaleLowerCase(), entry)
		}
	}
	const walkZone = (zone: PriceZone) => {
		zone.items?.forEach(ingestItem)
	}
	const walkService = (svc: PriceService) => {
		svc.items?.forEach(ingestItem)
		svc.zones?.forEach(walkZone)
		svc.sections?.forEach(sec => sec.zones?.forEach(walkZone))
	}
	catalog.man?.services?.forEach(walkService)
	catalog.woman?.services?.forEach(walkService)
	return { byId, byTitle }
}

/** Resolve a catalog entry for an appointment — id-first, leaf-title fallback. */
export function resolveCatalogEntry(
	apt: AppointmentData,
	byId: Map<string, CatalogPriceEntry>,
	byTitle: Map<string, CatalogPriceEntry>,
): CatalogPriceEntry | null {
	if (apt.serviceId) {
		const byIdHit = byId.get(apt.serviceId)
		if (byIdHit) return byIdHit
	}
	const leaf = apt.service?.split('›').pop()?.trim().toLocaleLowerCase()
	if (leaf) return byTitle.get(leaf) ?? null
	return null
}

/**
 * Effective revenue contribution for one appointment.
 *
 * Multi-day services multiply the catalog price by the day count so the
 * KPI panel shows realistic totals even when a single appointment row
 * actually covers a 3-day course. Returns null when no catalog entry can
 * be resolved — the caller decides whether to show "—" or fall back.
 */
export function appointmentPrice(
	apt: AppointmentData,
	catalogServices: ServiceData[],
	byId: Map<string, CatalogPriceEntry>,
	byTitle: Map<string, CatalogPriceEntry>,
): number | null {
	const entry = resolveCatalogEntry(apt, byId, byTitle)
	if (!entry) return null
	return entry.price * Math.max(1, dayCountFor(apt, catalogServices))
}

/**
 * Service label shown in the admin's locale. Order of preference:
 *   1. Catalog entry's localized title (from price catalog — most authoritative)
 *   2. `apt.serviceXx` field for the admin's locale (stored on booking)
 *   3. Any other `apt.serviceXx` locale variant we have
 *   4. Leaf of `apt.service` path (the raw stored string)
 */
export function appointmentServiceLabel(
	apt: AppointmentData,
	loc: ShortLocale,
	byId: Map<string, CatalogPriceEntry>,
	byTitle: Map<string, CatalogPriceEntry>,
): string {
	const entry = resolveCatalogEntry(apt, byId, byTitle)
	if (entry?.titles[loc]) return entry.titles[loc]!
	for (const fb of LOCALE_KEYS) {
		const t = entry?.titles[fb]
		if (t) return t
	}
	const fieldOrder: ShortLocale[] = [loc, ...LOCALE_KEYS.filter(l => l !== loc)]
	for (const l of fieldOrder) {
		const key = `service${l.charAt(0).toUpperCase()}${l.slice(1)}` as
			| 'serviceSk'
			| 'serviceEn'
			| 'serviceRu'
			| 'serviceUk'
		const v = apt[key]
		if (typeof v === 'string' && v.trim()) return v.split('›').pop()?.trim() || v
	}
	return apt.service?.split('›').pop()?.trim() || apt.service || '—'
}

export function dayCountFor(apt: AppointmentData, services: ServiceData[]): number {
	if (apt.adminBookingMode === 'day' || apt.scheduleTbd) {
		const match = findServiceDataForAppointment(apt, services)
		return resolveAppointmentRequiredFullDayCount(apt, match)
	}
	return 1
}

/**
 * Returns [from, to) bounds for the selected period in the local timezone.
 *
 * `from` is inclusive, `to` is exclusive — that way "this month" and "next
 * month" don't overlap. Custom range parses `YYYY-MM-DD` strings (the date
 * picker output) into local-midnight dates; an invalid string falls back to
 * the first of this month for `from` and "now" for `to`.
 */
export function resolvePeriod(
	key: PeriodKey,
	custom: { from: string; to: string },
	now: Date = new Date(),
): { from: Date; to: Date } {
	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
	const addDays = (d: Date, n: number) => {
		const x = new Date(d)
		x.setDate(x.getDate() + n)
		return x
	}
	switch (key) {
		case 'thisMonth':
			return {
				from: new Date(now.getFullYear(), now.getMonth(), 1),
				to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
			}
		case 'lastMonth':
			return {
				from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
				to: new Date(now.getFullYear(), now.getMonth(), 1),
			}
		case 'last30':
			return { from: addDays(startOfDay(now), -29), to: addDays(startOfDay(now), 1) }
		case 'last90':
			return { from: addDays(startOfDay(now), -89), to: addDays(startOfDay(now), 1) }
		case 'thisYear':
			return {
				from: new Date(now.getFullYear(), 0, 1),
				to: new Date(now.getFullYear() + 1, 0, 1),
			}
		case 'custom': {
			const parseLocal = (s: string) => {
				if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
				const [y, m, d] = s.split('-').map(Number)
				return new Date(y!, m! - 1, d!)
			}
			const from = parseLocal(custom.from) ?? new Date(now.getFullYear(), now.getMonth(), 1)
			const toRaw = parseLocal(custom.to) ?? now
			const to = addDays(toRaw, 1)
			return { from, to }
		}
	}
}

export function formatPercent(n: number): string {
	if (!Number.isFinite(n)) return '—'
	return `${Math.round(n * 100)}%`
}

export interface BookingStatusTotals {
	total: number
	pending: number
	confirmed: number
	cancelled: number
	completed: number
	noShow: number
}

/**
 * Count appointments by lifecycle status. Legacy docs without a
 * `bookingStatus` field are bucketed as `pending` (matching the read-side
 * fallback in `lib/booking-status.ts`), so totals stay consistent across
 * the migration boundary.
 *
 * Caller is responsible for any filtering it wants first (e.g. period,
 * place) — this function is a pure aggregator and treats the input list
 * as the universe to count.
 */
export function bookingStatusTotals(
	appointments: AppointmentData[],
): BookingStatusTotals {
	const totals: BookingStatusTotals = {
		total: 0,
		pending: 0,
		confirmed: 0,
		cancelled: 0,
		completed: 0,
		noShow: 0,
	}
	for (const apt of appointments) {
		totals.total += 1
		switch (apt.bookingStatus) {
			case 'confirmed':
				totals.confirmed += 1
				break
			case 'cancelled':
				totals.cancelled += 1
				break
			case 'completed':
				totals.completed += 1
				break
			case 'no_show':
				totals.noShow += 1
				break
			default:
				totals.pending += 1
		}
	}
	return totals
}

/**
 * Cancellation rate as a 0–1 fraction. Returns 0 for empty / all-pending
 * cohorts so `formatPercent` renders `0%` rather than `—`. Pass the same
 * filtered list you'd pass to `bookingStatusTotals`.
 */
export function cancellationRate(appointments: AppointmentData[]): number {
	const t = bookingStatusTotals(appointments)
	if (t.total === 0) return 0
	return t.cancelled / t.total
}

/**
 * Confirmation rate as a 0–1 fraction: how many bookings the customer
 * actively confirmed via a reminder click (or admin set to confirmed).
 *
 * Counts the *current* status `confirmed` — does NOT include bookings that
 * moved on to `completed` or `no_show` after confirmation. For "ever
 * confirmed" reporting (incl. those that moved past confirmed), use
 * `everConfirmedRate`.
 */
export function confirmationRate(appointments: AppointmentData[]): number {
	const t = bookingStatusTotals(appointments)
	if (t.total === 0) return 0
	return t.confirmed / t.total
}

/**
 * Customer-response rate: fraction of bookings where the customer engaged
 * with the reminder (either confirmed or cancelled). The complement —
 * `pending` rows — represents customers who got reminders but never
 * responded. A low response rate is a useful signal that reminders are
 * being ignored / undelivered.
 */
export function responseRate(appointments: AppointmentData[]): number {
	const t = bookingStatusTotals(appointments)
	if (t.total === 0) return 0
	return (t.confirmed + t.cancelled) / t.total
}

/**
 * Cumulative "ever confirmed" rate using the monotonic `confirmedAt`
 * timestamp. Includes bookings that have since moved on (completed,
 * no_show). Useful for retroactive reporting like "of all bookings last
 * month, what fraction did the customer actively confirm at some point".
 */
export function everConfirmedRate(appointments: AppointmentData[]): number {
	if (appointments.length === 0) return 0
	let everConfirmed = 0
	for (const apt of appointments) {
		if (apt.confirmedAt) everConfirmed += 1
	}
	return everConfirmed / appointments.length
}

export interface BookingBehaviorRow {
	status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
	count: number
	/** 0–1 fraction of `total` for this status. */
	share: number
}

export interface BookingBehaviorBreakdown {
	total: number
	rows: BookingBehaviorRow[]
}

/**
 * Status breakdown for the "customer behavior" admin panel. Returns one
 * row per current status with both a raw count and a fractional share —
 * the UI plots that share as a horizontal bar. Rows are ordered by
 * narrative meaning (pending → confirmed → cancelled → completed →
 * no_show) so the bar chart reads top-down like a funnel.
 */
export function bookingBehaviorBreakdown(
	appointments: AppointmentData[],
): BookingBehaviorBreakdown {
	const totals = bookingStatusTotals(appointments)
	const order: BookingBehaviorRow['status'][] = [
		'pending',
		'confirmed',
		'cancelled',
		'completed',
		'no_show',
	]
	const rows: BookingBehaviorRow[] = order.map(status => {
		const count =
			status === 'pending'
				? totals.pending
				: status === 'confirmed'
					? totals.confirmed
					: status === 'cancelled'
						? totals.cancelled
						: status === 'completed'
							? totals.completed
							: totals.noShow
		return {
			status,
			count,
			share: totals.total > 0 ? count / totals.total : 0,
		}
	})
	return { total: totals.total, rows }
}

export function formatMoney(n: number | null, locale: string): string {
	if (n == null || !Number.isFinite(n)) return '—'
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: n >= 100 ? 0 : 2,
	}).format(n)
}
