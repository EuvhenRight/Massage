import {
	collection,
	doc,
	getDocs,
	query,
	where,
	writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Place } from '@/lib/places'
import type {
	PriceCatalogStructure,
	PriceService,
	SexKey,
	ZonePriceItem,
} from '@/types/price-catalog'
import { normalizeItemBookingDayCount } from '@/types/price-catalog'
import {
	calendarColorForDirectItems,
	calendarColorForRootZone,
	calendarColorForSection,
} from '@/lib/price-catalog-normalize'

const SERVICES = 'services'
const BATCH_LIMIT = 400

export function priceItemServiceDocId(
	place: Place,
	sex: SexKey,
	itemId: string,
): string {
	return `${place}_${sex}_${itemId.replace(/\//g, '_')}`
}

type Row = {
	docId: string
	sex: SexKey
	item: ZonePriceItem
	color: string
}

function collectRows(place: Place, catalog: PriceCatalogStructure): Row[] {
	const rows: Row[] = []

	const walkService = (sex: SexKey, svc: PriceService) => {
		for (const section of svc.sections ?? []) {
			const color = calendarColorForSection(section)
			for (const zone of section.zones ?? []) {
				for (const item of zone.items ?? []) {
					rows.push({
						docId: priceItemServiceDocId(place, sex, item.id),
						sex,
						item,
						color,
					})
				}
			}
		}

		for (const zone of svc.zones ?? []) {
			const color = calendarColorForRootZone(svc, zone)
			for (const item of zone.items ?? []) {
				rows.push({
					docId: priceItemServiceDocId(place, sex, item.id),
					sex,
					item,
					color,
				})
			}
		}

		const directColor = calendarColorForDirectItems(svc)
		for (const item of svc.items ?? []) {
			rows.push({
				docId: priceItemServiceDocId(place, sex, item.id),
				sex,
				item,
				color: directColor,
			})
		}
	}

	for (const sex of ['woman', 'man'] as SexKey[]) {
		for (const svc of catalog[sex].services ?? []) {
			walkService(sex, svc)
		}
	}

	return rows.filter(r => (r.item.titleSk ?? '').trim().length > 0)
}

function servicePayload(
	place: Place,
	sex: SexKey,
	item: ZonePriceItem,
	color: string,
) {
	const titleSk = (item.titleSk ?? '').trim()
	const titleEn = (item.titleEn ?? '').trim() || titleSk
	const titleRu = (item.titleRu ?? '').trim() || titleSk
	const titleUk = (item.titleUk ?? '').trim() || titleSk
	const duration = Math.max(
		5,
		Math.min(240, Number(item.durationMinutes) || 60),
	)
	const gran =
		item.bookingGranularity === 'day'
			? 'day'
			: item.bookingGranularity === 'tbd'
				? 'tbd'
				: 'time'
	const base = {
		title: titleSk,
		titleSk,
		titleEn,
		titleRu,
		titleUk,
		color,
		durationMinutes: duration,
		place,
		catalogSex: sex,
		priceItemId: item.id,
		fromPriceCatalog: true,
		bookingGranularity: gran,
	}
	if (gran === 'day') {
		return {
			...base,
			bookingDayCount: normalizeItemBookingDayCount(item.bookingDayCount),
		}
	}
	if (gran === 'tbd') {
		return {
			...base,
			scheduleTbdMessageSk: (item.scheduleTbdMessageSk ?? '').trim(),
			scheduleTbdMessageEn: (item.scheduleTbdMessageEn ?? '').trim(),
			scheduleTbdMessageRu: (item.scheduleTbdMessageRu ?? '').trim(),
			scheduleTbdMessageUk: (item.scheduleTbdMessageUk ?? '').trim(),
			scheduleTbdAdminNoteSk: (item.scheduleTbdAdminNoteSk ?? '').trim(),
			scheduleTbdAdminNoteEn: (item.scheduleTbdAdminNoteEn ?? '').trim(),
			scheduleTbdAdminNoteRu: (item.scheduleTbdAdminNoteRu ?? '').trim(),
			scheduleTbdAdminNoteUk: (item.scheduleTbdAdminNoteUk ?? '').trim(),
		}
	}
	return base
}

/**
 * Upserts Firestore `services` from bookable price items and removes stale
 * `fromPriceCatalog` docs for this place (legacy manual services untouched).
 */
export async function syncPriceCatalogToServices(
	place: Place,
	catalog: PriceCatalogStructure,
): Promise<void> {
	const rows = collectRows(place, catalog)
	const wantedIds = new Set(rows.map(r => r.docId))

	const snap = await getDocs(
		query(collection(db, SERVICES), where('place', '==', place)),
	)

	const toDelete = snap.docs.filter(d => {
		const data = d.data()
		return data.fromPriceCatalog === true && !wantedIds.has(d.id)
	})

	for (let i = 0; i < toDelete.length; i += BATCH_LIMIT) {
		const batch = writeBatch(db)
		for (const d of toDelete.slice(i, i + BATCH_LIMIT)) {
			batch.delete(d.ref)
		}
		await batch.commit()
	}

	for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
		const batch = writeBatch(db)
		for (const r of rows.slice(i, i + BATCH_LIMIT)) {
			const ref = doc(db, SERVICES, r.docId)
			batch.set(
				ref,
				servicePayload(place, r.sex, r.item, r.color),
				{ merge: true },
			)
		}
		await batch.commit()
	}
}
