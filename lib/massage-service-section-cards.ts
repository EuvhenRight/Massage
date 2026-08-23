/**
 * Image cards for the massage landing “Услуги / Services” block — order matches
 * the studio menu. Mirrors `depilation-service-section-cards.ts`, but the studio
 * has no in-house massage photography yet, so these are licensed stock images
 * (Unsplash CDN, whitelisted in `next.config.js`). Swap any entry for a local
 * `/images/massage/*` file once studio photos exist — nothing else changes.
 */
export const MASSAGE_SERVICE_SECTION_IDS = [
	'relaxing',
	'classic',
	'sports',
	'antiCellulite',
	'lymphatic',
	'cupping',
	'honey',
	'guaSha',
	'vacuumRoller',
	'antiCelluliteWraps',
] as const

export type MassageServiceSectionId =
	(typeof MASSAGE_SERVICE_SECTION_IDS)[number]

const unsplash = (id: string) =>
	`https://images.unsplash.com/photo-${id}?w=900&h=900&fit=crop&q=75`

export const MASSAGE_SERVICE_SECTION_IMAGES: Record<
	MassageServiceSectionId,
	string
> = {
	/** Relaxing — hands working an oiled back, warm low light. */
	relaxing: unsplash('1741522509438-a120c0bb5e88'),
	/** Classic — therapist's hands on the lower back. */
	classic: unsplash('1519823551278-64ac92734fb1'),
	/** Sports — leg and foot work with oil. */
	sports: unsplash('1728497872660-cc6b16238c3a'),
	/** Anti-cellulite — deep kneading of the thigh. */
	antiCellulite: unsplash('1752071368979-e26605337768'),
	/** Lymphatic drainage — light leg strokes over a white towel. */
	lymphatic: unsplash('1712638932314-e2b185ca0930'),
	/** Cupping — vacuum cups set along the back. */
	cupping: unsplash('1598555748505-ccca0d9b9f7b'),
	/** Honey — honey jar with dipper beside rolled towels. */
	honey: unsplash('1706795033849-7ca391f007c5'),
	/** Gua sha — jade scraper drawn along the face. */
	guaSha: unsplash('1643379855889-850035817d24'),
	/** Vacuum-roller / apparatus — RF handpiece on the abdomen. */
	vacuumRoller: unsplash('1761819922058-d15028ed9817'),
	/**
	 * Anti-cellulite wraps — body procedure under salon light, no visible branding.
	 * Adjacent rather than literal: every free stock shot of an actual wrap is either
	 * Unsplash+ (never reaches the CDN) or shows another brand's packaging. Swap for a
	 * studio photo when one exists.
	 */
	antiCelluliteWraps: unsplash('1668422550557-f096364b72b4'),
}
