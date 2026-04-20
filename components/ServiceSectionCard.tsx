'use client'

import { TRANSITION } from '@/lib/motion-tokens'
import { useSiteMotion } from '@/lib/site-motion'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'

export type ServiceSectionCardProps = {
	imageSrc: string
	imageAlt: string
	title: string
	/** Small uppercase label above the title (e.g. “Services”). Omit to hide the badge row. */
	badgeLabel?: string
	/** Link-style CTA at the bottom (e.g. “Details”). */
	ctaLabel: string
	onClick: () => void
	/** Stagger index for scroll-in animation. */
	animationIndex?: number
	/** Passed to `next/image` `sizes`. */
	imageSizes?: string
}

/**
 * Reusable salon “service section” tile: hero image, gradient overlay, title, CTA.
 * Used on depilation (Послуги) and any similar grid.
 */
export function ServiceSectionCard({
	imageSrc,
	imageAlt,
	title,
	badgeLabel,
	ctaLabel,
	onClick,
	animationIndex = 0,
	imageSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
}: ServiceSectionCardProps) {
	const { minimal } = useSiteMotion()

	return (
		<motion.button
			type='button'
			initial={minimal ? false : { opacity: 0, y: 32 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-40px' }}
			transition={
				minimal
					? { duration: 0 }
					: {
							...TRANSITION.enter,
							delay: animationIndex * 0.1,
							duration: 0.6,
							ease: [0.22, 1, 0.36, 1],
						}
			}
			onClick={onClick}
			className='group text-left rounded-3xl overflow-hidden border border-white/[0.08] bg-white/[0.02] hover:border-gold-soft/35 hover:bg-white/[0.04] hover:shadow-[0_0_40px_-12px_rgba(232,184,0,0.18)] transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/40'
		>
			<div className='relative aspect-[4/3] overflow-hidden'>
				<Image
					src={imageSrc}
					alt={imageAlt}
					fill
					className='object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]'
					sizes={imageSizes}
				/>
				<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/40 to-transparent opacity-90' />
				<div className='absolute bottom-0 left-0 right-0 p-5 sm:p-6'>
					{badgeLabel ? (
						<span className='inline-flex items-center gap-1.5 text-gold-soft/90 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-medium mb-2'>
							<Sparkles className='w-3.5 h-3.5 opacity-80' aria-hidden />
							{badgeLabel}
						</span>
					) : null}
					<h3 className='font-serif text-xl sm:text-2xl text-icyWhite leading-snug pr-6'>
						{title}
					</h3>
				</div>
			</div>
			<div className='px-5 sm:px-6 py-4 sm:py-5 border-t border-white/[0.06]'>
				<span className='inline-flex items-center gap-1 text-gold-soft/90 text-xs font-medium tracking-wide group-hover:gap-2 transition-all'>
					{ctaLabel}
					<ArrowRight className='w-3.5 h-3.5' aria-hidden />
				</span>
			</div>
		</motion.button>
	)
}
