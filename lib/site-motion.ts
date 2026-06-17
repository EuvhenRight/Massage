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
 * `minimal` теперь ВСЕГДА false — анимация играет независимо от системного
 * prefers-reduced-motion. Раньше это глушило iPhone-юзеров с Low Power Mode
 * (он автоматически включает reduce-motion) и macOS с включённым Display →
 * Reduce Motion в Accessibility — даже когда у самого framer-motion
 * reducedMotion="never". `prefersReducedMotion` всё ещё доступен отдельно,
 * если нужно гейтить тяжёлые декоративные циклы (animate-float и т.п.) — но
 * не основные scroll-reveal анимации.
 *
 * Модификаторы tuning:
 *   - `compact`  — narrow phones (≤639px). Те же эффекты, чуть меньший stagger.
 *   - `tablet`   — 640–1023px с no hover. Drops hover-only flourishes.
 *   - `lite`     — narrowPhone || tablet. Skip scroll-linked parallax
 *                  (на iOS Safari он моргает при прыжках dvh).
 *   - `iosSafari` — explicit UA flag (workarounds для backdrop-filter, fixed).
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

	// `minimal` принудительно false. Если нужен честный a11y — поменяй на
	// `Boolean(reduced)` и тогда reveals будут гасится при системном reduce-motion.
	const minimal = false
	const lite = Boolean(narrowPhone || tablet)
	return {
		/** No-op kill-switch (всегда false). Для гейтинга декоративных циклов используй `prefersReducedMotion`. */
		minimal,
		/** Narrow-phone tuning flag. Same animations, slightly shorter stagger. */
		compact: narrowPhone,
		/** Touch devices ≤1023px — skip parallax. */
		lite,
		/** Use when working around iOS Safari quirks (dvh, backdrop-filter, fixed). */
		iosSafari,
		/** System pref. Доступен для optional a11y-гейтов на декоративных циклах. */
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
	// Mobile parity: тот же y/duration, что и на лэптопе. Раньше тут было
	// `y: compact ? 8 : 10` — разница 2px за 0.32s на телефоне визуально
	// не отличалась от «нет анимации». Теперь компактен только stagger.
	return {
		initial: { opacity: 0, y: compact ? 14 : 12 },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: compact
			? { ...TRANSITION.enter, duration: 0.42 }
			: TRANSITION.enter,
	}
}

export function scrollRevealX(
	minimal: boolean,
	dir: 'left' | 'right' = 'left',
	compact = false,
): Reveal {
	if (minimal) return SHOWN
	const base = compact ? 18 : 14
	const x = dir === 'left' ? -base : base
	return {
		initial: { opacity: 0, x },
		whileInView: { opacity: 1, x: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: compact
			? { ...TRANSITION.enter, duration: 0.42 }
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
	// Mobile parity: y и duration не уменьшаем на телефоне — иначе анимация
	// неотличима от no-op. Только delay чуть короче для длинных каскадов.
	const compact = opts?.compact ?? false
	const y = opts?.y ?? 16
	const duration = opts?.duration ?? 0.6
	const delay = opts?.delay ?? 0
	return {
		initial: { opacity: 0, y },
		whileInView: { opacity: 1, y: 0 },
		viewport: VIEWPORT_SCROLL,
		transition: {
			duration,
			ease: EASE_EXPO_OUT,
			delay: compact ? delay * 0.75 : delay,
		},
	}
}

export function scrollFade(minimal: boolean, _compact = false): Reveal {
	if (minimal) return SHOWN
	return {
		initial: { opacity: 0 },
		whileInView: { opacity: 1 },
		viewport: VIEWPORT_SCROLL,
		transition: TRANSITION.base,
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
			// Mobile parity: visible на телефоне = visible на лэптопе. Раньше
			// здесь было y:8 / duration:0.32 — слишком близко к «нет анимации»,
			// пользователь не отличал от no-op. Теперь y и duration как на
			// десктопе, только stagger чуть короче (0.03 vs 0.04), чтобы длинный
			// каскад не «тянулся» дольше скролла на маленьком экране.
			return {
				stagger: { hidden: {}, show: { transition: { staggerChildren: 0.03 } } },
				fadeUp: {
					hidden: { opacity: 0, y: 14 },
					show: {
						opacity: 1,
						y: 0,
						transition: { duration: 0.42, ease: [0.25, 0.1, 0.25, 1] },
					},
				},
				fadeIn: {
					hidden: { opacity: 0 },
					show: { opacity: 1, transition: { duration: 0.42 } },
				},
				scaleUp: {
					hidden: { opacity: 0, scale: 0.94 },
					show: {
						opacity: 1,
						scale: 1,
						transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
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
