'use client'

import { EASE_EXPO_OUT, TRANSITION, VIEWPORT_SCROLL } from '@/lib/motion-tokens'
import type { HTMLMotionProps } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

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
 * Visible resting state for reduced/minimal motion.
 *
 * Critical: this uses `animate` (not a bare `initial: false`). `minimal` flips
 * `false → true` *after mount* (the `narrowPhone` matchMedia effect). If a reveal
 * returned only `initial: false` on that flip, framer-motion would strip
 * `whileInView` while the element was still parked at its `opacity: 0` initial and
 * never reset it — leaving whole sections stuck invisible on phones. Driving
 * `animate: { opacity: 1 }` re-asserts visibility immediately, viewport-independent.
 */
const SHOWN: Reveal = {
	initial: false,
	animate: { opacity: 1, x: 0, y: 0 },
	transition: { duration: 0 },
}

/**
 * “Minimal” motion: system reduced-motion preference, or very small phone widths only.
 * We intentionally do **not** use `(pointer: coarse)` here — that hid animations on most
 * laptops/tablets with touch, so UI changes looked like “nothing happened”.
 */
export function useSiteMotion() {
	const reduced = useReducedMotion()
	const [narrowPhone, setNarrowPhone] = useState(false)

	useEffect(() => {
		const mq = window.matchMedia('(max-width: 639px)')
		const apply = () => setNarrowPhone(mq.matches)
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

	const minimal = Boolean(reduced || narrowPhone)
	return {
		minimal,
		/** Use for hero / about: full motion on phones unless the user prefers reduced motion. */
		prefersReducedMotion: Boolean(reduced),
		narrowPhone,
	}
}

/** Merge scroll-reveal timing with a stagger delay (avoids wiping `duration` / `ease`). */
export function staggerTransition(
	minimal: boolean,
	index: number,
	stepSeconds: number,
) {
	return {
		...TRANSITION.enter,
		delay: minimal ? 0 : index * stepSeconds,
	}
}

/** Fixed delay after shared `TRANSITION.enter` (e.g. second card in a row). */
export function enterDelay(minimal: boolean, delaySec: number) {
	return {
		...TRANSITION.enter,
		delay: minimal ? 0 : delaySec,
	}
}

export function scrollRevealY(minimal: boolean): Reveal {
	if (minimal) return SHOWN
	return {
		initial: { opacity: 0, y: 10 },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: TRANSITION.enter,
	}
}

export function scrollRevealX(
	minimal: boolean,
	dir: 'left' | 'right' = 'left',
): Reveal {
	if (minimal) return SHOWN
	const x = dir === 'left' ? -14 : 14
	return {
		initial: { opacity: 0, x },
		whileInView: { opacity: 1, x: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: TRANSITION.enter,
	}
}

/**
 * Flexible scroll-reveal (transform + opacity only → GPU friendly). Collapses to
 * an instant, no-transform show under reduced/minimal motion. Use for any
 * `whileInView` block so every entrance respects the same gating + easing.
 */
export function revealUp(
	minimal: boolean,
	opts?: { y?: number; delay?: number; duration?: number },
): Reveal {
	if (minimal) return SHOWN
	const y = opts?.y ?? 16
	return {
		initial: { opacity: 0, y },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: {
			duration: opts?.duration ?? 0.6,
			ease: EASE_EXPO_OUT,
			delay: opts?.delay ?? 0,
		},
	}
}

export function scrollFade(minimal: boolean): Reveal {
	if (minimal) return SHOWN
	return {
		initial: { opacity: 0 },
		whileInView: { opacity: 1 },
		viewport: VIEWPORT_SCROLL,
		transition: TRANSITION.base,
	}
}

export function heroEnter(
	minimal: boolean,
	opts?: { delay?: number },
): Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'> {
	if (minimal) {
		return { initial: false, animate: {}, transition: { duration: 0 } }
	}
	return {
		initial: { opacity: 0, y: 8 },
		animate: { opacity: 1, y: 0 },
		transition: { ...TRANSITION.hero, delay: opts?.delay ?? 0 },
	}
}
