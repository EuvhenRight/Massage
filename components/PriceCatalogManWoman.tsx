'use client'

import PriceCatalogMergedGlass from '@/components/PriceCatalogMergedGlass'
import type { Place } from '@/lib/places'
import type { PriceCatalogStructure } from '@/types/price-catalog'

type PriceCatalogManWomanProps = {
	catalog: PriceCatalogStructure | null
	place: Place
}

/**
 * Single public price list: one flow, each row shows **woman** and **man** prices.
 */
export default function PriceCatalogManWoman({
	catalog,
	place,
}: PriceCatalogManWomanProps) {
	return <PriceCatalogMergedGlass catalog={catalog} place={place} />
}
