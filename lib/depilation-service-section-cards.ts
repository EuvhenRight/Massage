/**
 * Image cards for the depilation landing “Послуги / Services” block — order matches studio menu.
 * Each service uses a distinct remote image (verified CDN) so categories are visually different.
 */
export const DEPILATION_SERVICE_SECTION_IDS = [
	'laser',
	'wax',
	'sugar',
	'electro',
	'piercing',
	'cosmetology',
	'courses',
	'additional',
] as const

export type DepilationServiceSectionId =
	(typeof DEPILATION_SERVICE_SECTION_IDS)[number]

const unsplash = (id: string, w = 1400, h = 1050) =>
	`https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=85`

const pexels = (photoId: number, w = 1200) =>
	`https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

export const DEPILATION_SERVICE_SECTION_IMAGES: Record<
	DepilationServiceSectionId,
	string
> = {
	/** Laser epilation — treatment / handpiece, clinical aesthetic (Unsplash). */
	laser: unsplash('photo-1582719478250-c89cae4dc85b'),
	/** Body waxing / depilation (Unsplash). */
	wax: unsplash('photo-1519824145371-296894a0daa9'),
	/** Sugaring — soft hands-on skin care, natural feel (Unsplash). */
	sugar: unsplash('photo-1515377905703-c4788e51af15'),
	/** Electro / precision — close aesthetic treatment (Unsplash). */
	electro: unsplash('photo-1522337360788-8b13dee7a37e'),
	/** Ear piercing / jewellery (Pexels). */
	piercing: pexels(1027131),
	/** Cosmetology — facial treatment (Unsplash). */
	cosmetology: unsplash('photo-1570172619644-dfd03ed5d881'),
	/** Training — desk, notes, learning (Unsplash). */
	courses: unsplash('photo-1516975080664-ed2fc6a32937'),
	/** Wraps / spa wellness — calm body care (Unsplash). */
	additional: unsplash('photo-1540555700478-4be289fbecef'),
}
