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
	DEPILATION_SERVICE_SECTION_IDS,
	DEPILATION_SERVICE_SECTION_IMAGES,
	type DepilationServiceSectionId,
} from '@/lib/depilation-service-section-cards'
import { motion, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

type DepilationServiceSectionsProps = {
	locale: string
	stagger: Variants
	fadeUp: Variants
}

export default function DepilationServiceSections({
	locale,
	stagger,
	fadeUp,
}: DepilationServiceSectionsProps) {
	const t = useTranslations('depilation')
	const [openId, setOpenId] = useState<DepilationServiceSectionId | null>(null)

	const cards = useMemo(() => [...DEPILATION_SERVICE_SECTION_IDS], [])

	return (
		<>
			<motion.div
				variants={stagger}
				initial='hidden'
				whileInView='show'
				viewport={{ once: true, margin: '-60px' }}
				className='text-center mb-12 sm:mb-16'
			>
				<motion.h2
					variants={fadeUp}
					id='services-heading'
					className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite'
				>
					{t('serviceMenu.title')}
				</motion.h2>
			</motion.div>

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7'>
				{cards.map((id, zi) => (
					<ServiceSectionCard
						key={id}
						imageSrc={DEPILATION_SERVICE_SECTION_IMAGES[id]}
						imageAlt={t(`serviceSections.cards.${id}.title`)}
						title={t(`serviceSections.cards.${id}.title`)}
						badgeLabel={t('serviceSections.tapHint')}
						ctaLabel={t('serviceSections.learnMore')}
						onClick={() => setOpenId(id)}
						animationIndex={zi}
					/>
				))}
			</div>

			<Dialog open={openId !== null} onOpenChange={o => !o && setOpenId(null)}>
				{openId && (
					<DialogContent
						hideClose
						className='max-w-lg overflow-visible border-0 bg-transparent p-0 shadow-none text-icyWhite'
					>
						{/* Mobile: close centered above the card. md+: outside past the right edge (laptop). */}
						<div className='relative pt-2 md:pt-4'>
							<DialogClose asChild>
								<button
									type='button'
									aria-label={t('serviceSections.closeModal')}
									className='absolute left-1/2 top-0 z-[60] inline-flex h-11 w-11 -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center justify-center rounded-md text-icyWhite/75 transition-colors hover:text-gold-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:left-auto md:right-[-34px] md:translate-x-0 md:translate-y-0'
								>
									<X className='h-6 w-6' strokeWidth={2} aria-hidden />
								</button>
							</DialogClose>
							<div className='flex max-h-[min(90vh,760px)] flex-col overflow-hidden rounded-2xl border border-white/12 bg-nearBlack/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] backdrop-blur-xl'>
								<div className='relative isolate aspect-[20/9] min-h-[140px] w-full shrink-0 overflow-hidden sm:aspect-[2/1] sm:min-h-[160px]'>
									<Image
										src={DEPILATION_SERVICE_SECTION_IMAGES[openId]}
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
									<div className='mt-5 space-y-5 text-base leading-[1.65] text-icyWhite/82 sm:text-[1.0625rem] sm:leading-relaxed md:text-lg md:leading-[1.6]'>
										<p className='text-pretty'>
											{t(`serviceSections.cards.${openId}.body`)}
										</p>
										<ServiceBullets id={openId} t={t} />
										{openId === 'courses' && <CoursesExtra t={t} />}
									</div>
								</div>
								<div className='shrink-0 border-t border-white/[0.08] bg-nearBlack/90 px-5 py-4 sm:px-6'>
									<div className='flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch'>
										<Link
											href={`/${locale}/depilation/price`}
											className='inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gold-soft/40 bg-gold-soft/[0.08] px-4 py-3 text-center text-sm font-medium text-gold-soft transition-colors hover:bg-gold-soft/15'
										>
											{t('serviceSections.viewPrices')}
										</Link>
										<Link
											href={`/${locale}/depilation/booking?${new URLSearchParams(
												{
													from: 'services',
													category: openId,
													service: t(`serviceSections.cards.${openId}.title`),
												},
											).toString()}`}
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

function ServiceBullets({
	id,
	t,
}: {
	id: DepilationServiceSectionId
	t: ReturnType<typeof useTranslations<'depilation'>>
}) {
	const raw = t.raw(`serviceSections.cards.${id}.bullets`) as unknown
	if (!Array.isArray(raw)) return null
	const bullets = raw.filter((x): x is string => typeof x === 'string')
	if (bullets.length === 0) return null
	return (
		<ul
			className='m-0 list-none space-y-3.5 p-0 text-base leading-[1.65] sm:space-y-4 sm:text-[1.0625rem] sm:leading-relaxed md:text-lg md:leading-[1.6]'
			role='list'
		>
			{bullets.map((line, i) => (
				<li key={i} className='flex gap-3.5'>
					<span
						className='mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-soft shadow-[0_0_0_3px_rgba(232,184,0,0.12)]'
						aria-hidden
					/>
					<span className='text-pretty'>{line}</span>
				</li>
			))}
		</ul>
	)
}

function CoursesExtra({
	t,
}: {
	t: ReturnType<typeof useTranslations<'depilation'>>
}) {
	return (
		<div className='space-y-4 rounded-2xl border border-gold-soft/30 bg-gold-soft/[0.07] px-4 py-4 sm:px-5 sm:py-5'>
			<div>
				<p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft sm:text-xs'>
					{t('serviceSections.cards.courses.scheduleLabel')}
				</p>
				<p className='mt-2 text-[15px] leading-relaxed text-icyWhite/86 sm:text-base'>
					{t('serviceSections.cards.courses.scheduleText')}
				</p>
			</div>
			<div className='border-t border-gold-soft/15 pt-4'>
				<p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft sm:text-xs'>
					{t('serviceSections.cards.courses.topicsLabel')}
				</p>
				<p className='mt-2 text-[15px] leading-relaxed text-icyWhite/84 sm:text-base'>
					{t('serviceSections.cards.courses.topicsText')}
				</p>
			</div>
		</div>
	)
}
