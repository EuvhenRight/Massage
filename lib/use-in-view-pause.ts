'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Pauses CSS-keyframe-driven decorative animations (e.g. `animate-float`,
 * `animate-pulse-soft`) when their element scrolls out of view. Saves battery
 * on mobile and prevents off-screen compositor work for ambient glow orbs.
 *
 * Usage: `<div ref={ref} style={style} className='animate-float' />`
 */
export function useInViewPause<T extends HTMLElement = HTMLDivElement>(
	rootMargin = '200px',
) {
	const ref = useRef<T>(null)
	const [inView, setInView] = useState(true)

	useEffect(() => {
		const el = ref.current
		if (!el) return
		const io = new IntersectionObserver(
			([entry]) => setInView(Boolean(entry?.isIntersecting)),
			{ rootMargin },
		)
		io.observe(el)
		return () => io.disconnect()
	}, [rootMargin])

	const style: React.CSSProperties = inView
		? {}
		: { animationPlayState: 'paused' as const }

	return { ref, style, inView }
}
