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
	laser: unsplash('photo-1582719478250-c89cae4dc85b'),
	wax: unsplash('photo-1519824145371-296894a0daa9'),
	sugar: unsplash('photo-1600334129128-685c5582fd35'),
	electro: unsplash('photo-1522335789203-aabd1fc54bc9'),
	piercing: pexels(3785147),
	cosmetology: unsplash('photo-1512496015851-a90fb38ba796'),
	courses: pexels(3762800),
	additional: unsplash('photo-1544161515-4ab6ce6db874'),
}
