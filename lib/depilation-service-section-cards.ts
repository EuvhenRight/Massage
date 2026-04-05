/**
 * Image cards for the depilation landing “Services” block — mirrors price catalog sections.
 * Photos: Unsplash (see next.config remotePatterns).
 */
export const DEPILATION_SERVICE_SECTION_IDS = [
	'laser',
	'wax',
	'sugar',
	'cosmetology',
	'courses',
	'additional',
	'piercing',
] as const

export type DepilationServiceSectionId =
	(typeof DEPILATION_SERVICE_SECTION_IDS)[number]

export const DEPILATION_SERVICE_SECTION_IMAGES: Record<
	DepilationServiceSectionId,
	string
> = {
	laser:
		'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&q=80&auto=format&fit=crop',
	wax: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&q=80&auto=format&fit=crop',
	sugar:
		'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80&auto=format&fit=crop',
	cosmetology:
		'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1200&q=80&auto=format&fit=crop',
	courses:
		'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80&auto=format&fit=crop',
	additional:
		'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=1200&q=80&auto=format&fit=crop',
	piercing:
		'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&q=80&auto=format&fit=crop',
}
