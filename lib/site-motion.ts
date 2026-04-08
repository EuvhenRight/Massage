'use client'

import { TRANSITION, VIEWPORT_SCROLL } from '@/lib/motion-tokens'
import type { HTMLMotionProps } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

export { EASE_OUT, TRANSITION, VIEWPORT_SCROLL } from '@/lib/motion-tokens'

type Reveal = Pick<
	HTMLMotionProps<'div'>,
	'initial' | 'whileInView' | 'viewport' | 'transition'
>

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
	return { minimal }
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
	if (minimal) return { initial: false, transition: { duration: 0 } }
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
	if (minimal) return { initial: false, transition: { duration: 0 } }
	const x = dir === 'left' ? -14 : 14
	return {
		initial: { opacity: 0, x },
		whileInView: { opacity: 1, x: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: TRANSITION.enter,
	}
}

export function scrollFade(minimal: boolean): Reveal {
	if (minimal) return { initial: false, transition: { duration: 0 } }
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
