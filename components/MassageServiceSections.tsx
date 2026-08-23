'use client'

import { ServiceSectionCard } from '@/components/ServiceSectionCard'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	MASSAGE_SERVICE_SECTION_IDS,
	MASSAGE_SERVICE_SECTION_IMAGES,
	type MassageServiceSectionId,
} from '@/lib/massage-service-section-cards'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

type MassageServiceSectionsProps = {
	locale: string
	/** Scroll-in animation props from the page (`scrollRevealY` / `scrollFade`). */
	headingMotion: Record<string, unknown>
}

/**
 * Massage “Услуги” photo wall — same pattern as `DepilationServiceSections`:
 * a grid of image tiles, each opening a modal with the full description.
 *
 * Simpler than the depilation twin on purpose: massage services carry no
 * per-card bullet lists and no deep links into individual price rows, so the
 * modal is image + text + two CTAs.
 */
export default function MassageServiceSections({
	locale,
	headingMotion,
}: MassageServiceSectionsProps) {
	const t = useTranslations('massage')
	const [openId, setOpenId] = useState<MassageServiceSectionId | null>(null)

	return (
		<>
			<motion.h2
				{...headingMotion}
				id='services-heading'
				className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite text-center mb-12 sm:mb-16'
			>
				{t('serviceSections.title')}
			</motion.h2>

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7'>
				{MASSAGE_SERVICE_SECTION_IDS.map((id, i) => (
					<ServiceSectionCard
						key={id}
						imageSrc={MASSAGE_SERVICE_SECTION_IMAGES[id]}
						imageAlt={t(`serviceSections.cards.${id}.title`)}
						title={t(`serviceSections.cards.${id}.title`)}
						badgeLabel={t('serviceSections.tapHint')}
						ctaLabel={t('serviceSections.learnMore')}
						onClick={() => setOpenId(id)}
						animationIndex={i}
					/>
				))}
			</div>

			<Dialog open={openId !== null} onOpenChange={o => !o && setOpenId(null)}>
				{openId && (
					<DialogContent
						hideClose
						className='max-w-lg overflow-visible border-0 bg-transparent p-0 shadow-none text-icyWhite'
					>
						{/* Mobile: close centered above the card. md+: outside past the right edge. */}
						<div className='relative pt-2 md:pt-4'>
							<DialogClose asChild>
								<button
									type='button'
									aria-label={t('serviceSections.closeModal')}
									className='absolute sm:right-0 sm:top-0 right-[-16px] top-[72px] z-[60] inline-flex h-11 w-11 -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center justify-center rounded-md text-icyWhite/75 transition-colors hover:text-gold-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:left-auto md:right-[-34px] md:translate-x-0 md:translate-y-0'
								>
									<X className='h-6 w-6' strokeWidth={2} aria-hidden />
								</button>
							</DialogClose>
							<div className='flex max-h-[min(90vh,760px)] flex-col overflow-hidden rounded-2xl border border-white/12 bg-nearBlack/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] backdrop-blur-xl'>
								<div className='relative isolate aspect-[12/12] min-h-[140px] w-full shrink-0 overflow-hidden sm:aspect-[5/5] sm:min-h-[160px]'>
									<Image
										src={MASSAGE_SERVICE_SECTION_IMAGES[openId]}
										alt={t(`serviceSections.cards.${openId}.title`)}
										fill
										className='object-cover'
										sizes='(max-width: 512px) 100vw, 512px'
									/>
									<div
										className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/55 to-nearBlack/15'
										aria-hidden
									/>
								</div>
								<div className='min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6'>
									<DialogHeader className='mb-0 space-y-0 text-left'>
										<DialogTitle className='font-serif text-2xl leading-[1.15] tracking-tight text-icyWhite sm:text-[1.65rem] md:text-3xl md:leading-tight'>
											{t(`serviceSections.cards.${openId}.title`)}
										</DialogTitle>
									</DialogHeader>
									<p className='mt-5 text-base leading-[1.65] text-icyWhite/82 sm:text-[1.0625rem] sm:leading-relaxed md:text-lg md:leading-[1.6]'>
										{t(`serviceSections.cards.${openId}.body`)}
									</p>
								</div>
								<div className='shrink-0 border-t border-white/[0.08] bg-nearBlack/90 px-5 py-4 sm:px-6'>
									<div className='flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch'>
										<Link
											href={`/${locale}/massage/price`}
											className='inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gold-soft/40 bg-gold-soft/[0.08] px-4 py-3 text-center text-sm font-medium text-gold-soft transition-colors hover:bg-gold-soft/15'
										>
											{t('serviceSections.viewPrices')}
										</Link>
										<Link
											href={`/${locale}/massage/booking?${new URLSearchParams({
												from: 'services',
												category: openId,
												service: t(`serviceSections.cards.${openId}.title`),
											}).toString()}`}
											className='inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gold-soft px-4 py-3 text-center text-sm font-semibold tracking-wide text-nearBlack shadow-[0_2px_16px_-4px_rgba(232,184,0,0.45)] transition-colors hover:bg-gold-soft/92'
										>
											{t('serviceSections.book')}
										</Link>
									</div>
								</div>
							</div>
						</div>
					</DialogContent>
				)}
			</Dialog>
		</>
	)
}
