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
	ZonePriceItem,
} from '@/types/price-catalog'
import {
	getScheduleTbdAdminNoteForLocale,
	getScheduleTbdMessageForLocale,
	getTitleForLocale,
	normalizeItemBookingDayCount,
} from '@/types/price-catalog'

const MIN_CATALOG_ITEM_MINUTES = 5
const MAX_CATALOG_ITEM_MINUTES = 12 * 60

/** Catalog durations are author-entered; keep a nonsense value out of the sum. */
function normalizeCatalogItemDuration(raw: unknown): number {
	const n = Math.floor(Number(raw))
	if (!Number.isFinite(n) || n <= 0) return 60
	return Math.min(Math.max(n, MIN_CATALOG_ITEM_MINUTES), MAX_CATALOG_ITEM_MINUTES)
}

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

/**
 * Every bookable price-catalog LINE, flattened for the admin booking picker.
 *
 * {@link buildAdminCalendarServices} deliberately stops at section / root-zone
 * level — that granularity is what the calendar colours and the legend need.
 * The booking modal needs the opposite: the concrete line the customer asked
 * for ("Depilation › Laser › Face › Upper lip"), with its real duration, not a
 * category with a hardcoded 60 minutes.
 *
 * Titles are built with the same `A › B › C` path the public booking flow
 * stores, and ids reuse the catalog item id, so an appointment created here is
 * indistinguishable from one the customer made.
 */
export function buildAdminBookableServices(
	catalog: PriceCatalogStructure,
	place: Place,
	locale: Locale,
): ServiceData[] {
	const byId = new Map<string, ServiceData>()

	const addItem = (
		item: ZonePriceItem,
		pathTitle: string,
		color: string,
		sex: SexKey,
	) => {
		const leaf = getTitleForLocale(item, locale).trim()
		if (!leaf) return
		const title = pathTitle ? `${pathTitle} › ${leaf}` : leaf
		const isTbd =
			item.bookingGranularity === 'tbd' || item.bookingGranularity === 'day'
		// Keyed by catalog id, NOT title: the woman and man branches repeat the
		// same path with different price and duration, and a title-keyed map
		// silently dropped one of them — booking a man against a woman's
		// duration would leave the calendar block too short.
		byId.set(item.id, {
			id: item.id,
			sex,
			title,
			titleSk: item.titleSk,
			titleEn: item.titleEn,
			titleRu: item.titleRu,
			titleUk: item.titleUk,
			color,
			durationMinutes: normalizeCatalogItemDuration(item.durationMinutes),
			place,
			bookingGranularity: isTbd ? 'tbd' : 'time',
			bookingDayCount: isTbd
				? normalizeItemBookingDayCount(item.bookingDayCount ?? 1)
				: undefined,
			scheduleTbdMessage: isTbd
				? getScheduleTbdMessageForLocale(item, locale)
				: undefined,
			scheduleTbdAdminNote: isTbd
				? getScheduleTbdAdminNoteForLocale(item, locale)
				: undefined,
		})
	}

	const walkService = (
		sex: SexKey,
		service: PriceCatalogStructure['man']['services'][number],
	) => {
		const serviceTitle = getTitleForLocale(service, locale).trim()

		const sections = service.sections ?? []
		if (sections.length > 0) {
			for (const section of sections) {
				const sectionTitle = getTitleForLocale(section, locale).trim()
				const color = calendarColorForSection(section)
				for (const zone of section.zones ?? []) {
					const zoneTitle = getTitleForLocale(zone, locale).trim()
					const path = [serviceTitle, sectionTitle, zoneTitle]
						.filter(Boolean)
						.join(' › ')
					for (const item of zone.items ?? []) addItem(item, path, color, sex)
				}
			}
			return
		}

		const zones = service.zones ?? []
		if (zones.length > 0) {
			for (const zone of zones) {
				const zoneTitle = getTitleForLocale(zone, locale).trim()
				const path = [serviceTitle, zoneTitle].filter(Boolean).join(' › ')
				const color = calendarColorForRootZone(service, zone)
				for (const item of zone.items ?? []) addItem(item, path, color, sex)
			}
			return
		}

		const color = calendarColorForDirectItems(service)
		for (const item of service.items ?? []) addItem(item, serviceTitle, color, sex)
	}

	for (const sex of ['woman', 'man'] as SexKey[]) {
		for (const service of catalog[sex].services ?? []) walkService(sex, service)
	}

	return Array.from(byId.values()).sort((a, b) =>
		a.title.localeCompare(b.title, locale),
	)
}
