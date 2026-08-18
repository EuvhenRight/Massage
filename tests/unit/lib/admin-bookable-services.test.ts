/**
 * Unit tests for `buildAdminBookableServices` — the catalog flattening behind
 * the admin booking picker.
 *
 * P0 because a mistake here corrupts the calendar, not just a label. The same
 * line exists under the woman and man branches with a DIFFERENT price and
 * duration ("full face": 35 min for women, 65 for men). Keying the flattened
 * list by title collapsed the pair and kept only one, so booking a man reserved
 * a 35-minute block for a 65-minute service and left the rest of the slot open
 * for someone else.
 */

import { describe, expect, it } from 'vitest'
import { buildAdminBookableServices } from '@/lib/admin-calendar-services'
import type { PriceCatalogStructure, ZonePriceItem } from '@/types/price-catalog'

function item(
	id: string,
	titleRu: string,
	durationMinutes: number,
	price: number | string,
	extra: Partial<ZonePriceItem> = {},
): ZonePriceItem {
	return { id, titleSk: titleRu, titleRu, durationMinutes, price, ...extra }
}

/** Same path under both branches, different duration + price — the real shape. */
function catalogWithSharedPath(): PriceCatalogStructure {
	const zone = (items: ZonePriceItem[]) => ({
		id: `z-${items[0]!.id}`,
		titleSk: 'Tvár',
		titleRu: 'Лицо',
		items,
	})
	return {
		woman: {
			services: [
				{
					id: 'svc-w',
					titleSk: 'Depilácia',
					titleRu: 'Депиляция',
					zones: [zone([item('w1', 'Лицо полностью', 35, 30)])],
				},
			],
		},
		man: {
			services: [
				{
					id: 'svc-m',
					titleSk: 'Depilácia',
					titleRu: 'Депиляция',
					zones: [zone([item('m1', 'Лицо полностью', 65, 50)])],
				},
			],
		},
	}
}

describe('woman / man branches', () => {
	it('keeps both variants of an identically-named line', () => {
		const rows = buildAdminBookableServices(catalogWithSharedPath(), 'depilation', 'ru')
		expect(rows).toHaveLength(2)
	})

	it('keeps each branch its own duration — the calendar block depends on it', () => {
		const rows = buildAdminBookableServices(catalogWithSharedPath(), 'depilation', 'ru')
		const woman = rows.find(r => r.sex === 'woman')
		const man = rows.find(r => r.sex === 'man')
		expect(woman?.durationMinutes).toBe(35)
		expect(man?.durationMinutes).toBe(65)
	})

	it('tags every row with its branch so the picker can filter', () => {
		const rows = buildAdminBookableServices(catalogWithSharedPath(), 'depilation', 'ru')
		expect(rows.map(r => r.sex).sort()).toEqual(['man', 'woman'])
	})

	it('uses the catalog item id, which is unique across branches', () => {
		const rows = buildAdminBookableServices(catalogWithSharedPath(), 'depilation', 'ru')
		expect(new Set(rows.map(r => r.id)).size).toBe(2)
	})
})

describe('flattening', () => {
	it('builds the same "A › B › C" path the public booking flow stores', () => {
		const rows = buildAdminBookableServices(catalogWithSharedPath(), 'depilation', 'ru')
		expect(rows[0]!.title).toBe('Депиляция › Лицо › Лицо полностью')
	})

	it('descends through sections → zones → items', () => {
		const catalog: PriceCatalogStructure = {
			woman: {
				services: [
					{
						id: 's',
						titleSk: 'Depilácia',
						titleRu: 'Депиляция',
						sections: [
							{
								id: 'sec',
								titleSk: 'Laser',
								titleRu: 'Лазер',
								zones: [
									{
										id: 'z',
										titleSk: 'Tvár',
										titleRu: 'Лицо',
										items: [item('i1', 'Верхняя губа', 15, 10)],
									},
								],
							},
						],
					},
				],
			},
			man: { services: [] },
		}
		const rows = buildAdminBookableServices(catalog, 'depilation', 'ru')
		expect(rows).toHaveLength(1)
		expect(rows[0]!.title).toBe('Депиляция › Лазер › Лицо › Верхняя губа')
		expect(rows[0]!.durationMinutes).toBe(15)
	})

	it('handles services with direct items and no zones', () => {
		const catalog: PriceCatalogStructure = {
			woman: {
				services: [
					{
						id: 's',
						titleSk: 'Zábal',
						titleRu: 'Обертывание',
						items: [item('i1', 'Обертывание', 90, 60)],
					},
				],
			},
			man: { services: [] },
		}
		const rows = buildAdminBookableServices(catalog, 'depilation', 'ru')
		expect(rows[0]!.title).toBe('Обертывание › Обертывание')
		expect(rows[0]!.durationMinutes).toBe(90)
	})

	it('carries TBD lines across with their day count', () => {
		const catalog: PriceCatalogStructure = {
			woman: {
				services: [
					{
						id: 's',
						titleSk: 'Kurz',
						titleRu: 'Курс',
						items: [
							item('i1', 'Курс депиляции', 60, '—', {
								bookingGranularity: 'tbd',
								bookingDayCount: 3,
							}),
						],
					},
				],
			},
			man: { services: [] },
		}
		const rows = buildAdminBookableServices(catalog, 'depilation', 'ru')
		expect(rows[0]!.bookingGranularity).toBe('tbd')
		expect(rows[0]!.bookingDayCount).toBe(3)
	})

	it('replaces a nonsense duration rather than letting it poison the sum', () => {
		const catalog: PriceCatalogStructure = {
			woman: {
				services: [
					{
						id: 's',
						titleSk: 'X',
						titleRu: 'X',
						items: [item('i1', 'Y', Number.NaN as unknown as number, 10)],
					},
				],
			},
			man: { services: [] },
		}
		const rows = buildAdminBookableServices(catalog, 'depilation', 'ru')
		expect(rows[0]!.durationMinutes).toBe(60)
	})
})
