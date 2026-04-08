'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Wave path shared for measurement + render (must match `d`). */
const WAVE_PATH_D =
	'M0 32 C 60 12, 100 12, 160 32 S 280 52, 320 32 S 420 12, 480 32'

export type SectionDividerProps = {
	variant: 'massage' | 'depilation'
	/** Cycles three decorative layouts (0, 1, 2, …) */
	pattern?: number
	className?: string
}

const ACCENT = {
	massage: {
		lineL: 'bg-gradient-to-r from-transparent via-purple-glow/45 to-purple-glow/25',
		lineR: 'bg-gradient-to-l from-transparent via-purple-glow/45 to-purple-glow/25',
		orb: 'bg-purple-glow/30',
		orbGlow: 'bg-purple-glow/20',
		diamond: 'border-purple-glow/40',
		dot: 'bg-purple-glow/55',
		connector: 'bg-gradient-to-r from-purple-glow/25 via-purple-glow/15 to-purple-glow/25',
		waveMid: '#c084fc',
		ambient: 'from-purple-glow/[0.06] via-transparent to-purple-glow/[0.06]',
	},
	depilation: {
		lineL: 'bg-gradient-to-r from-transparent via-gold-soft/50 to-gold-soft/25',
		lineR: 'bg-gradient-to-l from-transparent via-gold-soft/50 to-gold-soft/25',
		orb: 'bg-gold-soft/35',
		orbGlow: 'bg-gold-soft/22',
		diamond: 'border-gold-soft/45',
		dot: 'bg-gold-soft/65',
		connector: 'bg-gradient-to-r from-gold-soft/30 via-gold-soft/18 to-gold-soft/30',
		waveMid: '#e8b84a',
		ambient: 'from-gold-soft/[0.07] via-transparent to-gold-soft/[0.07]',
	},
} as const

type AccentTokens = (typeof ACCENT)[keyof typeof ACCENT]

export default function SectionDivider({
	variant,
	pattern = 0,
	className,
}: SectionDividerProps) {
	const reduce = useReducedMotion()
	const a = ACCENT[variant]
	const p = ((pattern % 3) + 3) % 3

	return (
		<div
			className={cn(
				'relative pointer-events-none select-none py-5 sm:py-7',
				className,
			)}
			aria-hidden
		>
			<div
				className={cn(
					'pointer-events-none absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 sm:h-24',
					'bg-gradient-to-r opacity-90',
					a.ambient,
				)}
			/>
			<div className='relative mx-auto max-w-5xl px-6'>
				{p === 0 && (
					<PatternBeam a={a} reduce={!!reduce} />
				)}
				{p === 1 && <PatternWave a={a} reduce={!!reduce} />}
				{p === 2 && (
					<PatternConstellation a={a} reduce={!!reduce} />
				)}
			</div>
		</div>
	)
}

function PatternBeam({
	a,
	reduce,
}: {
	a: AccentTokens
	reduce: boolean
}) {
	return (
		<div className='flex items-center justify-center gap-3 sm:gap-5'>
			<motion.div
				className={cn('h-px flex-1 max-w-[min(180px,28vw)] rounded-full', a.lineL)}
				animate={
					reduce
						? undefined
						: { opacity: [0.55, 1, 0.55], scaleX: [0.92, 1, 0.92] }
				}
				transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
			/>
			<div className='relative flex h-11 w-11 shrink-0 items-center justify-center'>
				<div
					className={cn(
						'absolute inset-0 rounded-full blur-xl',
						a.orbGlow,
					)}
				/>
				<motion.div
					className={cn(
						'relative h-2.5 w-2.5 rotate-45 rounded-[3px] border bg-nearBlack/40',
						a.diamond,
					)}
					animate={
						reduce
							? undefined
							: { rotate: [45, 52, 45], scale: [1, 1.06, 1] }
					}
					transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
				/>
			</div>
			<motion.div
				className={cn('h-px flex-1 max-w-[min(180px,28vw)] rounded-full', a.lineR)}
				animate={
					reduce
						? undefined
						: { opacity: [0.55, 1, 0.55], scaleX: [0.92, 1, 0.92] }
				}
				transition={{
					duration: 4.5,
					repeat: Infinity,
					ease: 'easeInOut',
					delay: 0.4,
				}}
			/>
		</div>
	)
}

/** Fallback length when `getTotalLength()` is 0 (rare WebKit timing). Matches `WAVE_PATH_D`. */
const WAVE_PATH_LEN_FALLBACK = 575

/**
 * Wave stroke animation: CSS `@keyframes` (default) or imperative `requestAnimationFrame`.
 * Switch to `'raf'` if stroke-dashoffset keyframes stall on a specific browser.
 */
const WAVE_STROKE_DRIVER: 'css' | 'raf' = 'css'

function PatternWave({
	a,
	reduce,
}: {
	a: AccentTokens
	reduce: boolean
}) {
	const uid = useId().replace(/:/g, '')
	const gradId = `sd-w-${uid}`
	const wrapRef = useRef<HTMLDivElement>(null)
	const pathRef = useRef<SVGPathElement>(null)
	const isInView = useInView(wrapRef, {
		once: true,
		/** Thin row: any pixel visible is enough (ratio thresholds can miss on mobile). */
		amount: 'some',
		margin: '0px',
	})

	const [dashLen, setDashLen] = useState(0)
	const [drawReady, setDrawReady] = useState(false)

	useLayoutEffect(() => {
		let cancelled = false
		let attempts = 0
		const maxAttempts = 32

		const measure = () => {
			if (cancelled || !pathRef.current) return
			try {
				const L = pathRef.current.getTotalLength()
				if (L > 0) {
					setDashLen(L)
					return
				}
			} catch {
				/* Safari / older engines */
			}
			attempts += 1
			if (attempts < maxAttempts) {
				requestAnimationFrame(measure)
			} else {
				setDashLen(WAVE_PATH_LEN_FALLBACK)
			}
		}

		measure()
		return () => {
			cancelled = true
		}
	}, [])

	// Start draw after in-view + layout (double rAF).
	useEffect(() => {
		if (!dashLen || !isInView) return
		let raf2: number | undefined
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => setDrawReady(true))
		})
		return () => {
			cancelAnimationFrame(raf1)
			if (raf2 !== undefined) cancelAnimationFrame(raf2)
		}
	}, [dashLen, isInView])

	// Imperative stroke draw (optional alternative to CSS keyframes).
	useEffect(() => {
		if (WAVE_STROKE_DRIVER !== 'raf') return
		if (!drawReady || !dashLen || !pathRef.current) return
		const path = pathRef.current
		const L = dashLen
		const drawMs = reduce ? 400 : 1350
		const easeOut = (t: number) => 1 - (1 - t) ** 3
		let cancelled = false
		const t0 = performance.now()

		let rafId = 0
		const tick = (now: number) => {
			if (cancelled || !pathRef.current) return
			const t = Math.min(1, (now - t0) / drawMs)
			const e = easeOut(t)
			pathRef.current.style.strokeDasharray = `${L}`
			pathRef.current.style.strokeDashoffset = `${L * (1 - e)}`
			if (t < 1) rafId = requestAnimationFrame(tick)
			else pathRef.current.style.strokeDashoffset = '0'
		}
		path.style.strokeDasharray = `${L}`
		path.style.strokeDashoffset = `${L}`
		rafId = requestAnimationFrame(tick)
		return () => {
			cancelled = true
			cancelAnimationFrame(rafId)
		}
	}, [drawReady, dashLen, reduce])

	const useCssStroke = WAVE_STROKE_DRIVER === 'css'
	const pathClassName = cn(
		useCssStroke && 'sd-wave-path',
		useCssStroke && drawReady && 'sd-wave-path--play',
	)
	const dotClassName = cn(
		'sd-wave-dot',
		drawReady && 'sd-wave-dot--play',
	)

	return (
		<div ref={wrapRef} className='mx-auto w-full max-w-3xl'>
			<svg
				viewBox='0 0 480 56'
				className='h-14 w-full overflow-visible [transform:translateZ(0)]'
				aria-hidden
			>
				<defs>
					<linearGradient id={gradId} x1='0%' y1='0%' x2='100%' y2='0%'>
						<stop offset='0%' stopColor='transparent' />
						<stop offset='50%' stopColor={a.waveMid} stopOpacity={0.55} />
						<stop offset='100%' stopColor='transparent' />
					</linearGradient>
				</defs>
				<path
					ref={pathRef}
					d={WAVE_PATH_D}
					fill='none'
					stroke={`url(#${gradId})`}
					strokeWidth='1.35'
					strokeLinecap='round'
					vectorEffect='non-scaling-stroke'
					className={pathClassName || undefined}
					style={{
						opacity: dashLen > 0 ? 1 : 0,
						['--sd-wave-len' as string]: useCssStroke ? dashLen : undefined,
						strokeDasharray: dashLen,
						...(WAVE_STROKE_DRIVER === 'raf' && !drawReady
							? { strokeDashoffset: dashLen }
							: {}),
					}}
				/>
				{!reduce && (
					<circle
						cx='240'
						cy='32'
						r='3'
						fill={a.waveMid}
						fillOpacity={0.85}
						className={dotClassName}
					/>
				)}
			</svg>
		</div>
	)
}

function PatternConstellation({
	a,
	reduce,
}: {
	a: AccentTokens
	reduce: boolean
}) {
	const dots = [0, 1, 2, 3, 4]
	return (
		<div className='flex items-center justify-center gap-0 sm:gap-1'>
			{dots.map((i, idx) => (
				<div key={i} className='flex items-center'>
					{idx > 0 && (
						<div
							className={cn(
								'mx-1 h-px w-6 sm:w-10 rounded-full opacity-80',
								a.connector,
							)}
						/>
					)}
					<motion.span
						className={cn(
							'block h-1.5 w-1.5 rounded-full shadow-[0_0_12px_currentColor]',
							a.dot,
						)}
						animate={
							reduce
								? undefined
								: {
										opacity: [0.45, 1, 0.45],
										scale: [0.92, 1.08, 0.92],
									}
						}
						transition={{
							duration: 2.8,
							repeat: Infinity,
							ease: 'easeInOut',
							delay: i * 0.22,
						}}
					/>
				</div>
			))}
		</div>
	)
}
