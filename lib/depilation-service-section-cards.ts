/**
 * Image cards for the depilation landing “Послуги / Services” block — order matches studio menu.
 * Mix of local assets and remote images so categories stay visually distinct.
 */
export const DEPILATION_SERVICE_SECTION_IDS = [
	'laser',
	'wax',
	'sugar',
	'electro',
	'piercing',
	'cosmetology',
	'courses',
	'intimateWhitening',
	'antiCelluliteWraps',
] as const

export type DepilationServiceSectionId =
	(typeof DEPILATION_SERVICE_SECTION_IDS)[number]

/** Public price list `<li id>` for deep links (slug of English catalog line title). */
export const DEPILATION_SERVICE_PRICE_ROW_ID: Partial<
	Record<DepilationServiceSectionId, string>
> = {
	intimateWhitening: 'price-intimate-whitening',
	antiCelluliteWraps: 'price-anti-cellulite-wraps',
}

export const DEPILATION_SERVICE_SECTION_IMAGES: Record<
	DepilationServiceSectionId,
	string
> = {
	/** Laser epilation — studio photo (skin diagram). */
	laser: '/images/depilation/laser_epilation.png',
	/** Wax epilation — studio photo (wax product). */
	wax: '/images/depilation/Wax_epilation.jpeg',
	/** Sugaring — studio photo (TERRA product). */
	sugar: '/images/depilation/Shugaring.jpeg',
	/** Electroepilation — studio photo (equipment). */
	electro: '/images/depilation/Electro_epilation.jpeg',
	/** Piercing — studio photo. */
	piercing: '/images/depilation/Piersing.jpeg',
	/** Cosmetology — studio photo. */
	cosmetology: '/images/depilation/Cosmetology.jpeg',
	/** Training courses — studio photo. */
	courses: '/images/depilation/Cursus.png',
	/** Intimate whitening — studio photo. */
	intimateWhitening: '/images/depilation/Intimate_whitening.png',
	/** Anti-cellulite wraps — studio photo. */
	antiCelluliteWraps: '/images/depilation/Anti-cellulite_wraps.jpeg',
}
