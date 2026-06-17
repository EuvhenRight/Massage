'use client'

import { useSiteMotion } from '@/lib/site-motion'
import { useInView, useReducedMotion } from 'framer-motion'
import { useId, useRef } from 'react'
import { cn } from '@/lib/utils'

/** Studio divider — metallic wave line + centered gold orb (single unit). */
const LINE_GOLD = '#a68b4d'
const ORB_GOLD = '#d4af37'

const WAVE_PATH_D =
	'M0 32 C 60 12, 100 12, 160 32 S 280 52, 320 32 S 420 12, 480 32'

/**
 * Хардкод длины пути (заранее измерено через `getTotalLength()` на этом `d`).
 * Раньше тут был 32-попыточный RAF retry — избыточно, путь не меняется.
 */
const WAVE_PATH_LEN = 575

export type SectionDividerProps = {
	className?: string
	size?: 'full' | 'inline'
	orientation?: 'horizontal' | 'vertical'
}

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
				<WaveStroke reduce={calm} compact={isInline} />
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
	const isInView = useInView(wrapRef, {
		once: true,
		amount: 'some',
		margin: '120px 0px 120px 0px',
	})

	const play = isInView

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
					d={WAVE_PATH_D}
					fill='none'
					stroke={`url(#${gradId})`}
					strokeWidth={compact ? 1.15 : 1.35}
					strokeLinecap='round'
					vectorEffect='non-scaling-stroke'
					className={cn('sd-wave-path', play && 'sd-wave-path--play')}
					style={{
						['--sd-wave-len' as string]: WAVE_PATH_LEN,
						strokeDasharray: WAVE_PATH_LEN,
						animationDuration: reduce ? '0.4s' : undefined,
					}}
				/>
			</svg>
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
