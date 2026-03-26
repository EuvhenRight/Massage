import type {
	PriceCatalogStructure,
	PriceSection,
	PriceService,
	PriceZone,
} from '@/types/price-catalog'
import { generatePriceItemId } from '@/types/price-catalog'
import {
	DEFAULT_SECTION_CALENDAR_COLOR,
	pickNextCalendarColor,
} from '@/lib/section-calendar-colors'

function ensureId<T extends { id: string }>(item: T): T {
	return { ...item, id: item.id || generatePriceItemId() }
}

function fillServiceCalendarColors(svc: PriceService): void {
	const sections = svc.sections ?? []
	const sectionColors: string[] = []
	for (const sec of sections) {
		if (!sec.calendarColor?.trim()) {
			sec.calendarColor = pickNextCalendarColor(sectionColors)
		}
		sectionColors.push(sec.calendarColor!)
	}

	const rootZones = svc.zones ?? []
	const rootZoneColors: string[] = []
	for (const z of rootZones) {
		if (!z.calendarColor?.trim()) {
			z.calendarColor = pickNextCalendarColor(rootZoneColors)
		}
		rootZoneColors.push(z.calendarColor!)
	}

	if ((svc.items?.length ?? 0) > 0 && !svc.calendarColor?.trim()) {
		svc.calendarColor = pickNextCalendarColor([])
	}
}

/**
 * Ensure ids on all nodes, then assign missing section / root-zone / service calendar colors.
 */
export function normalizePriceCatalog(
	catalog: PriceCatalogStructure,
): PriceCatalogStructure {
	const out: PriceCatalogStructure = {
		man: {
			services: (catalog.man.services ?? []).map(s => {
				const svc = ensureId({ ...s })
				svc.sections = (svc.sections ?? []).map(sec => {
					const section = ensureId({ ...sec })
					section.zones = (section.zones ?? []).map(z => {
						const zone = ensureId({ ...z })
						zone.items = zone.items?.map(i => ensureId(i)) ?? []
						return zone
					})
					return section
				})
				svc.zones = (svc.zones ?? []).map(z => {
					const zone = ensureId({ ...z })
					zone.items = zone.items?.map(i => ensureId(i)) ?? []
					return zone
				})
				svc.items = svc.items?.map(i => ensureId(i)) ?? []
				fillServiceCalendarColors(svc)
				return svc
			}),
		},
		woman: {
			services: (catalog.woman.services ?? []).map(s => {
				const svc = ensureId({ ...s })
				svc.sections = (svc.sections ?? []).map(sec => {
					const section = ensureId({ ...sec })
					section.zones = (section.zones ?? []).map(z => {
						const zone = ensureId({ ...z })
						zone.items = zone.items?.map(i => ensureId(i)) ?? []
						return zone
					})
					return section
				})
				svc.zones = (svc.zones ?? []).map(z => {
					const zone = ensureId({ ...z })
					zone.items = zone.items?.map(i => ensureId(i)) ?? []
					return zone
				})
				svc.items = svc.items?.map(i => ensureId(i)) ?? []
				fillServiceCalendarColors(svc)
				return svc
			}),
		},
	}
	return out
}

export function calendarColorForSection(section: PriceSection): string {
	return section.calendarColor?.trim() || DEFAULT_SECTION_CALENDAR_COLOR
}

export function calendarColorForRootZone(
	svc: PriceService,
	zone: PriceZone,
): string {
	return (
		zone.calendarColor?.trim() ||
		svc.calendarColor?.trim() ||
		DEFAULT_SECTION_CALENDAR_COLOR
	)
}

export function calendarColorForDirectItems(svc: PriceService): string {
	return svc.calendarColor?.trim() || DEFAULT_SECTION_CALENDAR_COLOR
}
