'use client'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DEPILATION_SERVICE_SECTION_IDS,
	DEPILATION_SERVICE_SECTION_IMAGES,
	type DepilationServiceSectionId,
} from '@/lib/depilation-service-section-cards'
import { motion, type Variants } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
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

	const cards = useMemo(
		() => [...DEPILATION_SERVICE_SECTION_IDS],
		[],
	)

	return (
		<>
			<motion.div
				variants={stagger}
				initial='hidden'
				whileInView='show'
				viewport={{ once: true, margin: '-60px' }}
				className='text-center mb-12 sm:mb-16'
			>
				<motion.p
					variants={fadeUp}
					className='text-gold-soft/80 text-[11px] sm:text-xs tracking-[0.28em] uppercase mb-3'
				>
					{t('serviceSections.kicker')}
				</motion.p>
				<motion.h2
					variants={fadeUp}
					id='services-heading'
					className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
				>
					{t('serviceMenu.title')}
				</motion.h2>
				<motion.p
					variants={fadeUp}
					className='text-icyWhite/50 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed'
				>
					{t('serviceSections.subtitle')}
				</motion.p>
			</motion.div>

			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7'>
				{cards.map((id, zi) => (
					<motion.button
						key={id}
						type='button'
						initial={{ opacity: 0, y: 32 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-40px' }}
						transition={{
							delay: zi * 0.06,
							duration: 0.55,
							ease: [0.22, 1, 0.36, 1],
						}}
						onClick={() => setOpenId(id)}
						className='group text-left rounded-3xl overflow-hidden border border-white/[0.08] bg-white/[0.02] hover:border-gold-soft/35 hover:bg-white/[0.04] hover:shadow-[0_0_40px_-12px_rgba(232,184,0,0.18)] transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-soft/40'
					>
						<div className='relative aspect-[4/3] overflow-hidden'>
							<Image
								src={DEPILATION_SERVICE_SECTION_IMAGES[id]}
								alt=''
								fill
								className='object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]'
								sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
							/>
							<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/40 to-transparent opacity-90' />
							<div className='absolute bottom-0 left-0 right-0 p-5 sm:p-6'>
								<span className='inline-flex items-center gap-1.5 text-gold-soft/90 text-[10px] sm:text-[11px] tracking-[0.2em] uppercase font-medium mb-2'>
									<Sparkles className='w-3.5 h-3.5 opacity-80' aria-hidden />
									{t('serviceSections.tapHint')}
								</span>
								<h3 className='font-serif text-xl sm:text-2xl text-icyWhite leading-snug pr-6'>
									{t(`serviceSections.cards.${id}.title`)}
								</h3>
							</div>
						</div>
						<div className='px-5 sm:px-6 py-4 sm:py-5 border-t border-white/[0.06]'>
							<p className='text-icyWhite/65 text-sm leading-relaxed line-clamp-3'>
								{t(`serviceSections.cards.${id}.teaser`)}
							</p>
							<span className='mt-3 inline-flex items-center gap-1 text-gold-soft/90 text-xs font-medium tracking-wide group-hover:gap-2 transition-all'>
								{t('serviceSections.learnMore')}
								<ArrowRight className='w-3.5 h-3.5' aria-hidden />
							</span>
						</div>
					</motion.button>
				))}
			</div>

			<Dialog open={openId !== null} onOpenChange={o => !o && setOpenId(null)}>
				{openId && (
					<DialogContent className='max-w-lg max-h-[min(88vh,720px)] overflow-y-auto border-white/10 bg-nearBlack/95 text-icyWhite backdrop-blur-xl sm:rounded-2xl'>
						<div className='relative -mx-6 -mt-6 mb-4 aspect-[21/9] sm:aspect-[2/1] overflow-hidden rounded-t-lg'>
							<Image
								src={DEPILATION_SERVICE_SECTION_IMAGES[openId]}
								alt=''
								fill
								className='object-cover'
								sizes='(max-width: 512px) 100vw, 512px'
							/>
							<div className='absolute inset-0 bg-gradient-to-t from-nearBlack/90 to-transparent' />
						</div>
						<DialogHeader>
							<DialogTitle className='font-serif text-2xl text-icyWhite text-left pr-8'>
								{t(`serviceSections.cards.${openId}.title`)}
							</DialogTitle>
							<DialogDescription className='text-icyWhite/60 text-left text-sm leading-relaxed'>
								{t(`serviceSections.cards.${openId}.teaser`)}
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 text-sm text-icyWhite/78 leading-relaxed'>
							<p>{t(`serviceSections.cards.${openId}.body`)}</p>
							<ServiceBullets id={openId} t={t} />
							{openId === 'courses' && <CoursesExtra t={t} />}
						</div>
						<div className='flex flex-col sm:flex-row gap-3 pt-2'>
							<Link
								href={`/${locale}/depilation/price`}
								className='inline-flex justify-center items-center rounded-xl border border-gold-soft/35 bg-gold-soft/10 px-4 py-3 text-sm font-medium text-gold-soft hover:bg-gold-soft/15 transition-colors'
							>
								{t('serviceSections.viewPrices')}
							</Link>
							<Link
								href={`/${locale}/depilation/booking`}
								className='inline-flex justify-center items-center rounded-xl bg-gold-soft text-nearBlack px-4 py-3 text-sm font-semibold tracking-wide hover:bg-gold-soft/90 transition-colors'
							>
								{t('serviceSections.book')}
							</Link>
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
		<ul className='list-none space-y-2.5 m-0 p-0' role='list'>
			{bullets.map((line, i) => (
				<li key={i} className='flex gap-3'>
					<span
						className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-soft/70'
						aria-hidden
					/>
					<span>{line}</span>
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
		<div className='rounded-2xl border border-gold-soft/25 bg-gold-soft/[0.06] px-4 py-3.5 space-y-2'>
			<p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft/90'>
				{t('serviceSections.cards.courses.scheduleLabel')}
			</p>
			<p className='text-icyWhite/85 text-sm'>
				{t('serviceSections.cards.courses.scheduleText')}
			</p>
			<p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft/90 pt-1'>
				{t('serviceSections.cards.courses.topicsLabel')}
			</p>
			<p className='text-icyWhite/80 text-sm'>
				{t('serviceSections.cards.courses.topicsText')}
			</p>
		</div>
	)
}
