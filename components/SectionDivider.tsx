'use client'

import { useSiteMotion } from '@/lib/site-motion'
import { useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Studio divider — metallic wave line + centered gold orb (single unit). */
const LINE_GOLD = '#a68b4d'
const ORB_GOLD = '#d4af37'

/** Wave path shared for measurement + render (must match `d`). */
const WAVE_PATH_D =
	'M0 32 C 60 12, 100 12, 160 32 S 280 52, 320 32 S 420 12, 480 32'

export type SectionDividerProps = {
	className?: string
	/** Full-width between sections (default). `inline` fits under headings; `vertical` is the entry-portal column. */
	size?: 'full' | 'inline'
	orientation?: 'horizontal' | 'vertical'
}

/** Fallback length when `getTotalLength()` is 0 (rare WebKit timing). Matches `WAVE_PATH_D`. */
const WAVE_PATH_LEN_FALLBACK = 575

export default function SectionDivider({
	className,
	size = 'full',
	orientation = 'horizontal',
}: SectionDividerProps) {
	const reduce = useReducedMotion()
	const { minimal: minimalDevice } = useSiteMotion()
	const calm = Boolean(reduce || minimalDevice)

	if (orientation === 'vertical') {
		return <VerticalRail className={className} />
	}

	const isInline = size === 'inline'

	return (
		<div
			className={cn(
				'relative pointer-events-none select-none',
				isInline ? 'py-2' : 'py-5 sm:py-7',
				className,
			)}
			aria-hidden
		>
			<div
				className={cn(
					'relative mx-auto px-6',
					isInline ? 'max-w-[4.5rem]' : 'max-w-5xl',
				)}
			>
				<WaveStroke
					reduce={calm}
					compact={isInline}
				/>
			</div>
		</div>
	)
}

function VerticalRail({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'relative hidden min-h-0 w-[11px] shrink-0 select-none self-stretch overflow-hidden md:block',
				className,
			)}
			aria-hidden
		>
			<div className='relative h-full min-h-[50svh] w-full'>
				<div
					className='pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/18 blur-2xl'
					aria-hidden
				/>
				<div
					className='absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-gradient-to-b from-transparent via-[#a68b4d]/90 to-transparent'
					aria-hidden
				/>
				<div
					className='absolute left-1/2 top-1/2 z-[2] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]'
					style={{
						boxShadow: `0 0 20px 6px ${ORB_GOLD}55, 0 0 36px 12px ${ORB_GOLD}33`,
					}}
				/>
			</div>
		</div>
	)
}

function WaveStroke({
	reduce,
	compact,
}: {
	reduce: boolean
	compact: boolean
}) {
	const uid = useId().replace(/:/g, '')
	const gradId = `sd-w-${uid}`
	const wrapRef = useRef<HTMLDivElement>(null)
	const pathRef = useRef<SVGPathElement>(null)
	const [strokeDriver, setStrokeDriver] = useState<'css' | 'raf'>('css')
	const isInView = useInView(wrapRef, {
		once: true,
		amount: 'some',
		margin: '120px 0px 120px 0px',
	})

	const [dashLen, setDashLen] = useState(0)
	const [drawReady, setDrawReady] = useState(false)

	useLayoutEffect(() => {
		const mq = window.matchMedia('(max-width: 768px)')
		const apply = () => setStrokeDriver(mq.matches ? 'raf' : 'css')
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

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

	useEffect(() => {
		if (strokeDriver !== 'raf') return
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
	}, [drawReady, dashLen, reduce, strokeDriver])

	const useCssStroke = strokeDriver === 'css'
	const pathClassName = cn(
		useCssStroke && 'sd-wave-path',
		useCssStroke && drawReady && 'sd-wave-path--play',
	)

	return (
		<div
			ref={wrapRef}
			className={cn(
				'relative mx-auto w-full min-h-[3.5rem]',
				compact && 'min-h-[2.75rem]',
			)}
		>
			<svg
				viewBox='0 0 480 56'
				className={cn(
					'relative z-0 block w-full overflow-visible [transform:translateZ(0)]',
					compact ? 'h-11' : 'h-14',
				)}
				aria-hidden
			>
				<defs>
					<linearGradient id={gradId} x1='0%' y1='0%' x2='100%' y2='0%'>
						<stop offset='0%' stopColor='transparent' />
						<stop offset='50%' stopColor={LINE_GOLD} stopOpacity={0.92} />
						<stop offset='100%' stopColor='transparent' />
					</linearGradient>
				</defs>
				<path
					ref={pathRef}
					d={WAVE_PATH_D}
					fill='none'
					stroke={`url(#${gradId})`}
					strokeWidth={compact ? 1.15 : 1.35}
					strokeLinecap='round'
					vectorEffect='non-scaling-stroke'
					className={pathClassName || undefined}
					style={{
						opacity: dashLen > 0 ? 1 : 0,
						['--sd-wave-len' as string]: useCssStroke ? dashLen : undefined,
						strokeDasharray: dashLen,
						...(strokeDriver === 'raf' && !drawReady
							? { strokeDashoffset: dashLen }
							: {}),
					}}
				/>
			</svg>
			{/* Center orb (HTML, not SVG) — pairs with the wave line above. */}
			<div
				aria-hidden
				className='pointer-events-none absolute left-1/2 z-[2] size-[11px] rounded-full sm:size-[13px]'
				style={{
					top: '57.1429%',
					transform: 'translate(-50%, -50%)',
					backgroundColor: ORB_GOLD,
					boxShadow: `0 0 18px 5px ${ORB_GOLD}66, 0 0 42px 14px ${ORB_GOLD}22`,
				}}
			/>
			<div
				aria-hidden
				className='pointer-events-none absolute left-1/2 top-[57.1429%] z-[1] size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/15 blur-xl'
			/>
		</div>
	)
}
