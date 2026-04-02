import {
	getScheduleTbdAdminNoteForLocale,
	getScheduleTbdMessageForLocale,
	getTitleForLocale,
	normalizeItemBookingDayCount,
	type PriceCatalogStructure,
	type PriceLocale,
	type PriceService,
	type ZonePriceItem,
} from '@/types/price-catalog'

export type FlatPriceCatalogService = {
	title: string
	durationMinutes: number
	bookingGranularity: 'time' | 'tbd'
	bookingDayCount?: number
	scheduleTbdMessage?: string
	scheduleTbdAdminNote?: string
}

/** Flatten price catalog into a list for booking (time slot vs full working day). */
export function flattenPriceCatalogToServices(
	catalog: PriceCatalogStructure,
	locale: PriceLocale,
): FlatPriceCatalogService[] {
	const result: FlatPriceCatalogService[] = []

	function addItem(item: ZonePriceItem, path: string) {
		const itemTitle = getTitleForLocale(item, locale)
		const fullTitle = path ? `${path} › ${itemTitle}` : itemTitle
		const gran =
			item.bookingGranularity === 'tbd' || item.bookingGranularity === 'day'
				? 'tbd'
				: 'time'
		result.push({
			title: fullTitle,
			durationMinutes: item.durationMinutes,
			bookingGranularity: gran,
			bookingDayCount:
				gran === 'tbd'
					? normalizeItemBookingDayCount(item.bookingDayCount)
					: undefined,
			scheduleTbdMessage:
				gran === 'tbd'
					? getScheduleTbdMessageForLocale(item, locale)
					: undefined,
			scheduleTbdAdminNote:
				gran === 'tbd'
					? getScheduleTbdAdminNoteForLocale(item, locale)
					: undefined,
		})
	}

	function processService(svc: PriceService) {
		const svcTitle = getTitleForLocale(svc, locale)
		const sections = svc.sections ?? []
		const zones = svc.zones ?? []
		const items = svc.items ?? []

		for (const sec of sections) {
			const secTitle = getTitleForLocale(sec, locale)
			for (const zone of sec.zones ?? []) {
				const zoneTitle = getTitleForLocale(zone, locale)
				const path = `${svcTitle} › ${secTitle} › ${zoneTitle}`
				for (const item of zone.items ?? []) addItem(item, path)
			}
		}
		for (const zone of zones) {
			const zoneTitle = getTitleForLocale(zone, locale)
			const path = `${svcTitle} › ${zoneTitle}`
			for (const item of zone.items ?? []) addItem(item, path)
		}
		for (const item of items) {
			addItem(item, svcTitle)
		}
	}

	for (const svc of catalog.man.services) processService(svc)
	for (const svc of catalog.woman.services) processService(svc)

	return result
}

export function isPriceCatalogEmpty(
	catalog: PriceCatalogStructure | null | undefined,
): boolean {
	if (!catalog) return true
	const m = catalog.man?.services?.length ?? 0
	const w = catalog.woman?.services?.length ?? 0
	return m === 0 && w === 0
}

/** Map marketing short titles (e.g. "Swedish — Classic") to full catalog path titles. */
export function matchPresetToCatalogTitle(
	flat: FlatPriceCatalogService[],
	preset: string | null | undefined,
): string | undefined {
	if (!preset?.trim()) return undefined
	const p = preset.trim()
	const exact = flat.find(s => s.title === p)
	if (exact) return exact.title
	const byLast = flat.find(s => {
		const last = s.title.split(' › ').pop()?.trim()
		return last === p
	})
	return byLast?.title
}
