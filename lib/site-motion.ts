'use client'

import { EASE_EXPO_OUT, TRANSITION, VIEWPORT_SCROLL } from '@/lib/motion-tokens'
import type { HTMLMotionProps } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

export {
	EASE_OUT,
	EASE_EXPO_OUT,
	TRANSITION,
	VIEWPORT_SCROLL,
} from '@/lib/motion-tokens'

type Reveal = Pick<
	HTMLMotionProps<'div'>,
	'initial' | 'animate' | 'whileInView' | 'viewport' | 'transition'
>

/**
 * Visible resting state for reduced motion.
 *
 * Critical: this uses `animate` (not a bare `initial: false`). `minimal` can
 * flip `false → true` *after mount* (system `prefers-reduced-motion` change).
 * If a reveal returned only `initial: false` on that flip, framer-motion would
 * strip `whileInView` while the element was still parked at its `opacity: 0`
 * initial and never reset it — leaving whole sections stuck invisible. Driving
 * `animate: { opacity: 1 }` re-asserts visibility immediately.
 */
const SHOWN: Reveal = {
	initial: false,
	animate: { opacity: 1, x: 0, y: 0 },
	transition: { duration: 0 },
}

/**
 * Motion gating with **mobile/laptop parity** as a design goal.
 *
 * `minimal` is now driven ONLY by the system `prefers-reduced-motion` flag.
 * Mobile users get the same animations as laptop users — we never silently
 * gut the experience based on screen width. Instead, three modifiers tune
 * intensity for specific device classes:
 *
 *   - `compact`  — narrow phones (≤639px). Same effects, smaller distances
 *                  (y:8 vs y:12), shorter staggers, slightly faster duration.
 *                  Keeps the look without overshooting a 375-414px viewport.
 *   - `tablet`   — 640–1023px with no hover. Drops hover-only flourishes
 *                  (multi-shadow cards, `whileHover` scale).
 *   - `lite`     — `narrowPhone || tablet`. Used to skip effects that don't
 *                  survive touch-device quirks well (scroll-linked parallax
 *                  via `useScroll` glitches on iOS Safari when dvh changes
 *                  with URL-bar show/hide).
 *   - `iosSafari` — explicit UA flag. Use to avoid backdrop-filter combined
 *                   with transform animations (known WebKit compositor bug)
 *                   and to skip `position:fixed` + framer `y` collisions.
 */
export function useSiteMotion() {
	const reduced = useReducedMotion()
	const [narrowPhone, setNarrowPhone] = useState(false)
	const [tablet, setTablet] = useState(false)
	const [iosSafari, setIosSafari] = useState(false)

	useEffect(() => {
		const mqPhone = window.matchMedia('(max-width: 639px)')
		const mqTablet = window.matchMedia(
			'(min-width: 640px) and (max-width: 1023px) and (hover: none)',
		)
		const apply = () => {
			setNarrowPhone(mqPhone.matches)
			setTablet(mqTablet.matches)
		}
		apply()
		mqPhone.addEventListener('change', apply)
		mqTablet.addEventListener('change', apply)
		setIosSafari(
			/iP(hone|ad|od)/.test(navigator.userAgent) ||
				(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)),
		)
		return () => {
			mqPhone.removeEventListener('change', apply)
			mqTablet.removeEventListener('change', apply)
		}
	}, [])

	const minimal = Boolean(reduced)
	const lite = Boolean(minimal || narrowPhone || tablet)
	return {
		/** The kill-switch: only set when the user opted into reduced motion. */
		minimal,
		/** Narrow-phone tuning flag. Same animations, smaller distances/durations. */
		compact: narrowPhone,
		/** Touch devices ≤1023px — skip parallax & hover-only flourishes. */
		lite,
		/** Use when working around iOS Safari quirks (dvh, backdrop-filter, fixed). */
		iosSafari,
		/** Alias for system reduced-motion. Use it explicitly when the intent is "honour OS pref". */
		prefersReducedMotion: Boolean(reduced),
		narrowPhone,
		tablet,
	}
}

/** Merge scroll-reveal timing with a stagger delay (avoids wiping `duration` / `ease`).
 *  `compact` shrinks `stepSeconds` by 25% so phone staggers don't drag.
 */
export function staggerTransition(
	minimal: boolean,
	index: number,
	stepSeconds: number,
	compact = false,
) {
	return {
		...TRANSITION.enter,
		delay: minimal ? 0 : index * (compact ? stepSeconds * 0.75 : stepSeconds),
	}
}

/** Fixed delay after shared `TRANSITION.enter` (e.g. second card in a row). */
export function enterDelay(minimal: boolean, delaySec: number, compact = false) {
	return {
		...TRANSITION.enter,
		delay: minimal ? 0 : compact ? delaySec * 0.75 : delaySec,
	}
}

export function scrollRevealY(minimal: boolean, compact = false): Reveal {
	if (minimal) return SHOWN
	return {
		initial: { opacity: 0, y: compact ? 8 : 10 },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: compact
			? { ...TRANSITION.enter, duration: 0.32 }
			: TRANSITION.enter,
	}
}

export function scrollRevealX(
	minimal: boolean,
	dir: 'left' | 'right' = 'left',
	compact = false,
): Reveal {
	if (minimal) return SHOWN
	const base = compact ? 10 : 14
	const x = dir === 'left' ? -base : base
	return {
		initial: { opacity: 0, x },
		whileInView: { opacity: 1, x: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: compact
			? { ...TRANSITION.enter, duration: 0.32 }
			: TRANSITION.enter,
	}
}

/**
 * Flexible scroll-reveal (transform + opacity only → GPU friendly). Collapses to
 * an instant, no-transform show under reduced motion. Use for any
 * `whileInView` block so every entrance respects the same gating + easing.
 */
export function revealUp(
	minimal: boolean,
	opts?: { y?: number; delay?: number; duration?: number; compact?: boolean },
): Reveal {
	if (minimal) return SHOWN
	const compact = opts?.compact ?? false
	const yDefault = compact ? 12 : 16
	const y = opts?.y ?? yDefault
	const yScaled = compact && !opts?.y ? y : opts?.y ? (compact ? Math.round(opts.y * 0.7) : opts.y) : yDefault
	const durationDefault = compact ? 0.45 : 0.6
	return {
		initial: { opacity: 0, y: yScaled },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: {
			duration: opts?.duration ?? durationDefault,
			ease: EASE_EXPO_OUT,
			delay: opts?.delay ?? 0,
		},
	}
}

export function scrollFade(minimal: boolean, compact = false): Reveal {
	if (minimal) return SHOWN
	return {
		initial: { opacity: 0 },
		whileInView: { opacity: 1 },
		viewport: VIEWPORT_SCROLL,
		transition: compact
			? { ...TRANSITION.base, duration: 0.3 }
			: TRANSITION.base,
	}
}

/**
 * Standard fadeUp/scaleUp/fadeIn/stagger variants used across landings.
 *
 * Three tiers (mobile/laptop parity preserved):
 *   - `minimal` (prefers-reduced-motion) → zero motion.
 *   - `compact` (mobile, no reduce-motion) → same effects, smaller distances.
 *   - default (laptop) → full distances and durations.
 */
export function useStandardVariants(minimal: boolean, compact = false) {
	return useMemo(() => {
		if (minimal) {
			return {
				stagger: { hidden: {}, show: { transition: { staggerChildren: 0 } } },
				fadeUp: {
					hidden: { opacity: 1, y: 0 },
					show: { opacity: 1, y: 0, transition: { duration: 0 } },
				},
				fadeIn: {
					hidden: { opacity: 1 },
					show: { opacity: 1, transition: { duration: 0 } },
				},
				scaleUp: {
					hidden: { opacity: 1, scale: 1 },
					show: { opacity: 1, scale: 1, transition: { duration: 0 } },
				},
			} as const
		}
		if (compact) {
			// Мобильный: те же эффекты, но смещение меньше (y:8 вместо y:12),
			// stagger короче (0.03 vs 0.04), длительность чуть меньше — чтобы
			// весь блок не «дрейфил» на 320-414px viewport.
			return {
				stagger: { hidden: {}, show: { transition: { staggerChildren: 0.03 } } },
				fadeUp: {
					hidden: { opacity: 0, y: 8 },
					show: {
						opacity: 1,
						y: 0,
						transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] },
					},
				},
				fadeIn: {
					hidden: { opacity: 0 },
					show: { opacity: 1, transition: { duration: 0.32 } },
				},
				scaleUp: {
					hidden: { opacity: 0, scale: 0.97 },
					show: {
						opacity: 1,
						scale: 1,
						transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
					},
				},
			} as const
		}
		return {
			stagger: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
			fadeUp: {
				hidden: { opacity: 0, y: 12 },
				show: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
				},
			},
			fadeIn: {
				hidden: { opacity: 0 },
				show: { opacity: 1, transition: { duration: 0.4 } },
			},
			scaleUp: {
				hidden: { opacity: 0, scale: 0.96 },
				show: {
					opacity: 1,
					scale: 1,
					transition: { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] },
				},
			},
		} as const
	}, [minimal, compact])
}

/**
 * Above-the-fold entrance (hero badge/content, entry-portal panels, floating CTA).
 *
 * TRANSFORM-ONLY by design — never animates opacity. framer SSR-renders the
 * `initial` state, and on a hard load iOS Safari can fail to start the
 * post-hydration animation; an `opacity: 0` initial would then ship the content
 * invisible until a re-render. A `translateY` initial degrades to a harmless
 * offset instead. The `minimal` branch also drives `y: 0` (not an empty
 * `animate`) so it re-asserts position if `minimal`/reduced flips after mount.
 */
export function heroEnter(
	minimal: boolean,
	opts?: { delay?: number },
): Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
	if (minimal) {
		return { initial: false, animate: { y: 0 }, transition: { duration: 0 } }
	}
	return {
		initial: { y: 8 },
		animate: { y: 0 },
		transition: { ...TRANSITION.hero, delay: opts?.delay ?? 0 },
	}
}
