/** Shared motion tokens — safe to import from server or client. */
export const EASE_OUT: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

/**
 * "Settle" / expo-out curve. Decelerates hard at the end so motion feels like it
 * arrives and rests — used for hero entrances, drawers and CTAs. Previously
 * inlined as `[0.22, 1, 0.36, 1]` in ~20 places; tokenized for consistency.
 */
export const EASE_EXPO_OUT: [number, number, number, number] = [
	0.22, 1, 0.36, 1,
]

export const TRANSITION = {
	fast: { duration: 0.2, ease: EASE_OUT },
	base: { duration: 0.36, ease: EASE_OUT },
	hero: { duration: 0.42, ease: EASE_OUT },
	enter: { duration: 0.36, ease: EASE_OUT },
	/** Scroll-reveal / settle entrances (cards, sections, buttons). */
	settle: { duration: 0.6, ease: EASE_EXPO_OUT },
	/** Cinematic logo descent in the depilation hero. */
	heroLogo: { duration: 0.9, ease: EASE_EXPO_OUT, delay: 0.15 },
	/** Slower decorative reveals (images, large blocks). */
	slow: { duration: 0.8, ease: EASE_EXPO_OUT },
} as const

export const VIEWPORT_SCROLL = {
	once: true as const,
	amount: 0.12 as const,
	margin: '-48px 0px' as const,
}
