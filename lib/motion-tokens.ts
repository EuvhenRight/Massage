/** Shared motion tokens — safe to import from server or client. */
export const EASE_OUT: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

export const TRANSITION = {
	fast: { duration: 0.2, ease: EASE_OUT },
	base: { duration: 0.36, ease: EASE_OUT },
	hero: { duration: 0.42, ease: EASE_OUT },
	enter: { duration: 0.36, ease: EASE_OUT },
} as const

export const VIEWPORT_SCROLL = {
	once: true as const,
	amount: 0.12 as const,
	margin: '-48px 0px' as const,
}
