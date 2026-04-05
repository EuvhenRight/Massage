'use client'

import PriceCatalogManWoman from '@/components/PriceCatalogManWoman'
import type { Place } from '@/lib/places'
import { cn } from '@/lib/utils'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import { motion, useReducedMotion } from 'framer-motion'
import { MousePointerClick } from 'lucide-react'
import { useTranslations } from 'next-intl'

type PublicPriceCatalogBodyProps = {
	catalog: PriceCatalogStructure | null
	place: Place
	loading: boolean
}

/**
 * Loading / empty state, then {@link PriceCatalogManWoman} (woman + man in one component).
 * Booking hint: fixed bottom-right (same corner / safe-area pattern as admin FAB dock).
 */
export default function PublicPriceCatalogBody({
	catalog,
	place,
	loading,
}: PublicPriceCatalogBodyProps) {
	const t = useTranslations('price')
	const tCommon = useTranslations('common')
	const reduceMotion = useReducedMotion()
	const isMassage = place === 'massage'
	const hasWoman = (catalog?.woman.services?.length ?? 0) > 0
	const hasMan = (catalog?.man.services?.length ?? 0) > 0
	const hasAny = hasWoman || hasMan

	if (loading) {
		return (
			<p className='text-icyWhite/50 text-sm text-center'>
				{tCommon('loading')}
			</p>
		)
	}

	if (!hasAny) {
		return (
			<p className='text-icyWhite/60 text-sm leading-relaxed text-center max-w-xl mx-auto'>
				{t('noPricesYet')}
			</p>
		)
	}

	return (
		<>
			<motion.aside
				className={cn(
					'fixed z-40 flex max-w-[min(20rem,calc(100vw-2rem))]',
					'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))]',
					'sm:bottom-6 sm:right-6',
				)}
				initial={
					reduceMotion ? false : { opacity: 0, y: 28, scale: 0.94, x: 8 }
				}
				animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
				transition={
					reduceMotion
						? { duration: 0 }
						: {
								type: 'spring',
								stiffness: 380,
								damping: 28,
								mass: 0.9,
							}
				}
				role='note'
			>
				<div
					className={cn(
						'relative overflow-hidden rounded-2xl border px-3.5 py-3 sm:px-4 sm:py-3.5 backdrop-blur-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.75)] transition-transform duration-300 hover:scale-[1.02]',
						isMassage
							? 'border-purple-soft/40 bg-nearBlack/[0.94]'
							: 'border-gold-soft/40 bg-nearBlack/[0.94]',
					)}
				>
					{!reduceMotion && (
						<motion.div
							className='pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'
							aria-hidden
						>
							<motion.div
								className={cn(
									'absolute -left-1/4 top-0 h-full w-1/2 skew-x-[-12deg] opacity-80',
									isMassage
										? 'bg-gradient-to-r from-purple-glow/0 via-purple-glow/[0.12] to-purple-glow/0'
										: 'bg-gradient-to-r from-gold-glow/0 via-gold-soft/[0.18] to-gold-glow/0',
								)}
								initial={{ x: '-120%' }}
								animate={{ x: ['-120%', '220%'] }}
								transition={{
									duration: 3.2,
									repeat: Infinity,
									ease: [0.45, 0, 0.55, 1],
									repeatDelay: 2,
								}}
							/>
						</motion.div>
					)}
					<div className='relative flex gap-2.5 items-start'>
						<div
							className={cn(
								'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
								isMassage
									? 'bg-purple-soft/20 text-purple-soft'
									: 'bg-gold-soft/25 text-gold-soft',
							)}
						>
							<MousePointerClick className='h-4 w-4' aria-hidden />
						</div>
						<p className='min-w-0 flex-1 text-left text-xs sm:text-[13px] leading-snug tracking-wide text-icyWhite/90'>
							{t('clickPriceToBookHint')}
						</p>
					</div>
					<motion.div
						className={cn(
							'pointer-events-none absolute bottom-0 left-0 right-0 h-px',
							isMassage
								? 'bg-gradient-to-r from-transparent via-purple-soft/45 to-transparent'
								: 'bg-gradient-to-r from-transparent via-gold-soft/50 to-transparent',
						)}
						initial={{ scaleX: 0, opacity: 0 }}
						animate={{ scaleX: 1, opacity: 1 }}
						transition={
							reduceMotion
								? { duration: 0 }
								: { delay: 0.25, duration: 0.55, ease: [0.22, 1, 0.36, 1] }
						}
						aria-hidden
					/>
				</div>
			</motion.aside>
			<PriceCatalogManWoman catalog={catalog} place={place} />
		</>
	)
}
