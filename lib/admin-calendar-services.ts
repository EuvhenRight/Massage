import {
	calendarColorForDirectItems,
	calendarColorForRootZone,
	calendarColorForSection,
} from '@/lib/price-catalog-normalize'
import type { Place } from '@/lib/places'
import type { Locale, ServiceData } from '@/lib/services'
import type {
	LocalizedText,
	PriceCatalogStructure,
	SexKey,
} from '@/types/price-catalog'
import { getTitleForLocale } from '@/types/price-catalog'

function pushUniqueService(
	target: Map<string, ServiceData>,
	service: ServiceData,
): void {
	const title = service.title.trim()
	if (!title) return
	const key = title.toLocaleLowerCase()
	if (!target.has(key)) {
		target.set(key, service)
	}
}

export function buildAdminCalendarServices(
	catalog: PriceCatalogStructure,
	place: Place,
	locale: Locale,
): ServiceData[] {
	const byTitle = new Map<string, ServiceData>()

	const addEntry = (id: string, titleSource: LocalizedText, color: string) => {
		const title = getTitleForLocale(titleSource, locale).trim()
		if (!title) return
		pushUniqueService(byTitle, {
			id,
			title,
			titleSk: titleSource.titleSk,
			titleEn: titleSource.titleEn,
			titleRu: titleSource.titleRu,
			titleUk: titleSource.titleUk,
			color,
			durationMinutes: 60,
			place,
		})
	}

	const walkService = (
		sex: SexKey,
		service:
			PriceCatalogStructure['man']['services'][number],
	) => {
		const sections = service.sections ?? []
		if (sections.length > 0) {
			for (const section of sections) {
				addEntry(
					`section:${place}:${sex}:${service.id}:${section.id}`,
					section,
					calendarColorForSection(section),
				)
			}
			return
		}

		const zones = service.zones ?? []
		if (zones.length > 0) {
			for (const zone of zones) {
				addEntry(
					`zone:${place}:${sex}:${service.id}:${zone.id}`,
					zone,
					calendarColorForRootZone(service, zone),
				)
			}
			return
		}

		if ((service.items?.length ?? 0) > 0) {
			addEntry(
				`service:${place}:${sex}:${service.id}`,
				service,
				calendarColorForDirectItems(service),
			)
		}
	}

	for (const sex of ['woman', 'man'] as SexKey[]) {
		for (const service of catalog[sex].services ?? []) {
			walkService(sex, service)
		}
	}

	return Array.from(byTitle.values()).sort((a, b) =>
		a.title.localeCompare(b.title, locale),
	)
}

/** Synthetic calendar row id from `buildAdminCalendarServices` for a price-catalog section. */
export function isPriceCatalogSectionCalendarId(id: string): boolean {
	return id.startsWith('section:')
}
