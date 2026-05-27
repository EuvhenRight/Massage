'use client'

import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

type MarqueeProps = {
	/** One segment of content. The component repeats it seamlessly. */
	children: React.ReactNode
	/** Scroll speed in pixels per second. */
	speed?: number
	/** Pause while a pointer hovers the strip (desktop affordance only). */
	pauseOnHover?: boolean
	/** Soft fade at the left/right edges (skipped on iOS, where masks fight the compositor). */
	gradientEdges?: boolean
	/** Classes for the outer viewport (padding, border, height…). */
	className?: string
	/** Classes for the blurred background layer behind the track. */
	backgroundClassName?: string
	ariaLabel?: string
}

/**
 * Seamless horizontal marquee that actually runs on iOS/WebKit.
 *
 * Why this exists: a CSS `@keyframes translateX(-25%)` on a `width: max-content`
 * track, promoted to the compositor and clipped under a `backdrop-filter`
 * ancestor, freezes on iOS Safari/Chrome (percentage resolves against a stale
 * layer size; backdrop-filter suppresses descendant transform animations).
 *
 * Fixes, both required:
 *  1. Animate a **measured pixel** distance (one segment width) instead of a
 *     percentage — sidesteps the intrinsic-width resolution bug.
 *  2. Keep the blurred background as a **sibling** of the animated track, never
 *     an ancestor — removes `backdrop-filter` from the track's ancestor chain.
 *
 * The animation runs via the Web Animations API: same compositor path as a CSS
 * animation (smooth, not `requestAnimationFrame`-throttled), but it accepts the
 * measured px value and restarts cleanly on resize.
 */
export default function Marquee({
	children,
	speed = 40,
	pauseOnHover = false,
	gradientEdges = false,
	className,
	backgroundClassName = 'bg-nearBlack/70 backdrop-blur-md',
	ariaLabel,
}: MarqueeProps) {
	const trackRef = useRef<HTMLDivElement>(null)
	const groupRef = useRef<HTMLDivElement>(null)
	const animRef = useRef<Animation | null>(null)

	// Enough identical copies to fill at least 2× the viewport, so a shift of one
	// segment width is always seamless regardless of segment/viewport size.
	const [copies, setCopies] = useState(2)
	const [isIOS, setIsIOS] = useState(false)

	// Reasons the marquee should hold still; combined into one play/pause call.
	const offscreen = useRef(false)
	const tabHidden = useRef(false)
	const hovered = useRef(false)

	const syncPlayState = useCallback(() => {
		const anim = animRef.current
		if (!anim) return
		if (offscreen.current || tabHidden.current || hovered.current) anim.pause()
		else anim.play()
	}, [])

	useEffect(() => {
		setIsIOS(
			/iP(hone|ad|od)/.test(navigator.userAgent) ||
				(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)),
		)
	}, [])

	// Measure + (re)build the compositor animation. Reruns when copy count changes.
	useEffect(() => {
		const track = trackRef.current
		const group = groupRef.current
		if (!track || !group) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

		let cancelled = false

		const build = () => {
			if (cancelled) return
			const segment = group.getBoundingClientRect().width
			if (segment <= 0) return

			// Grow copy count if one segment doesn't cover 2× the viewport.
			const viewport = track.parentElement?.getBoundingClientRect().width ?? 0
			const needed = Math.max(2, Math.ceil(viewport / segment) + 1)
			if (needed !== copies) {
				setCopies(needed)
				return // re-render → effect reruns → build with the new layout
			}

			animRef.current?.cancel()
			track.style.willChange = 'transform'
			const anim = track.animate(
				[
					{ transform: 'translate3d(0,0,0)' },
					{ transform: `translate3d(${-segment}px,0,0)` },
				],
				{
					duration: (segment / speed) * 1000,
					iterations: Infinity,
					easing: 'linear',
				},
			)
			animRef.current = anim
			syncPlayState()
		}

		build()
		const ro = new ResizeObserver(build)
		ro.observe(group)

		return () => {
			cancelled = true
			ro.disconnect()
			animRef.current?.cancel()
			animRef.current = null
			track.style.willChange = ''
		}
	}, [speed, copies, syncPlayState])

	// Pause when scrolled out of view (no off-screen compositing work / battery).
	useEffect(() => {
		const track = trackRef.current
		const viewport = track?.parentElement
		if (!viewport) return
		const io = new IntersectionObserver(
			([entry]) => {
				offscreen.current = !entry?.isIntersecting
				syncPlayState()
			},
			{ threshold: 0 },
		)
		io.observe(viewport)
		return () => io.disconnect()
	}, [syncPlayState])

	// Pause when the tab is backgrounded.
	useEffect(() => {
		const onVisibility = () => {
			tabHidden.current = document.visibilityState === 'hidden'
			syncPlayState()
		}
		document.addEventListener('visibilitychange', onVisibility)
		return () => document.removeEventListener('visibilitychange', onVisibility)
	}, [syncPlayState])

	const useMask = gradientEdges && !isIOS

	return (
		<div
			className={cn('relative overflow-hidden', className)}
			aria-label={ariaLabel}
			style={
				useMask
					? {
							WebkitMaskImage:
								'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
							maskImage:
								'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
						}
					: undefined
			}
			onMouseEnter={
				pauseOnHover
					? () => {
							hovered.current = true
							syncPlayState()
						}
					: undefined
			}
			onMouseLeave={
				pauseOnHover
					? () => {
							hovered.current = false
							syncPlayState()
						}
					: undefined
			}
		>
			{/* Blurred backdrop — sibling of the track, never its ancestor. */}
			<div
				className={cn('absolute inset-0', backgroundClassName)}
				aria-hidden
			/>
			<div
				ref={trackRef}
				className='relative z-10 flex w-max flex-nowrap [backface-visibility:hidden]'
			>
				{Array.from({ length: copies }).map((_, i) => (
					<div
						key={i}
						ref={i === 0 ? groupRef : undefined}
						className='flex shrink-0 flex-nowrap'
						aria-hidden={i > 0}
					>
						{children}
					</div>
				))}
			</div>
		</div>
	)
}
