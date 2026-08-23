'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import GlowText from '@/components/GlowText'
import Marquee from '@/components/Marquee'
import MassageServiceSections from '@/components/MassageServiceSections'
import Navbar from '@/components/Navbar'
import SectionDivider from '@/components/SectionDivider'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useIntersectionVisible } from '@/lib/use-intersection-visible'
import { PLACE_CONTACTS } from '@/lib/site-config'
import {
	EASE_EXPO_OUT,
	enterDelay,
	heroEnter,
	scrollFade,
	scrollRevealX,
	scrollRevealY,
	staggerTransition,
	useSiteMotion,
} from '@/lib/site-motion'
import { motion } from 'framer-motion'
import {
	Award,
	BadgeCheck,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Droplets,
	Droplet,
	Feather,
	Fingerprint,
	HeartHandshake,
	Hand,
	Layers,
	Lock,
	Mail,
	MapPin,
	MessageCircle,
	Navigation,
	Phone,
	Send,
	SprayCan,
	Star,
	Waves,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ReactNode, useMemo, useRef, useState } from 'react'

const TRUST_ITEMS = [
	'trustYears',
	'trustCertified',
	'trustIndividual',
	'trustTechniques',
	'trustClients',
] as const

const ABOUT_PARAGRAPHS = [
	'aboutJourney',
	'aboutLearning',
	'aboutApproach',
	'aboutTouch',
	'aboutQuality',
] as const

const VALUES = [
	{ key: 'valueRelaxation' as const, icon: Waves },
	{ key: 'valueIndividual' as const, icon: Fingerprint },
	{ key: 'valueAtmosphere' as const, icon: HeartHandshake },
	{ key: 'valueProducts' as const, icon: Droplets },
	{ key: 'valueLightness' as const, icon: Feather },
]

const CREDENTIALS = [
	'certificates',
	'licenses',
	'development',
	'sports',
	'geography',
	'trust',
] as const

const PROCESS_STEPS = [
	{ key: 'intake' as const, step: 1 },
	{ key: 'preparation' as const, step: 2 },
	{ key: 'procedure' as const, step: 3 },
	{ key: 'closing' as const, step: 4 },
] as const

const HYGIENE_ITEMS = [
	{ key: 'hands' as const, icon: Hand },
	{ key: 'disposables' as const, icon: Layers },
	{ key: 'equipment' as const, icon: SprayCan },
	{ key: 'products' as const, icon: Droplet },
	{ key: 'privacy' as const, icon: Lock },
] as const

const TESTIMONIALS = [
	'ermolaev',
	'kononova',
	'gladkaya',
	'hrechukha',
	'gulyaeva',
	'tokhtar',
	'mykhalov',
	'lanozka',
	'semova',
	'yezhova',
	'bukhantsova',
	'korniienko',
	'nuggets',
	'titova',
	'djazz',
	'yakovenko',
	'tuls',
	'funin',
	'volyk',
	'nicole',
	'yakovchenko',
] as const

const FAQ_ITEMS = [
	'duration',
	'prepare',
	'pressure',
	'frequency',
	'medical',
	'aftercare',
	'booking',
	'couples',
] as const

export default function MassagePage() {
	const t = useTranslations('massage')
	const tCommon = useTranslations('common')
	const tCookie = useTranslations('cookieConsent')
	const { openPreferences } = useCookieConsent()
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const contact = PLACE_CONTACTS.massage
	const sliderRef = useRef<HTMLDivElement>(null)
	const testimonialRef = useRef<HTMLDivElement>(null)
	const [footerRef, footerInView] = useIntersectionVisible()
	const showMobileBook = !footerInView
	const [contactSent, setContactSent] = useState(false)

	// `minimal` теперь всегда false (см. site-motion.ts) — анимация играет
	// независимо от системного Reduce Motion. `compact` тюнит мобильные дистанции.
	const { minimal, compact, narrowPhone, tablet } = useSiteMotion()
	const ry = useMemo(() => scrollRevealY(minimal, compact), [minimal, compact])
	const rxLeft = useMemo(
		() => scrollRevealX(minimal, 'left', compact),
		[minimal, compact],
	)
	const rxRight = useMemo(
		() => scrollRevealX(minimal, 'right', compact),
		[minimal, compact],
	)
	const rf = useMemo(() => scrollFade(minimal, compact), [minimal, compact])
	const ryAbout = ry
	const rxAbout = rxLeft
	const rfAbout = rf
	// Hero без gating — играет на iPhone с Low Power Mode тоже.
	const richStudioBrand = useMemo(
		() => ({
			brand: (chunks: ReactNode) => (
				<span className='inline font-semibold text-gold-glow tracking-[0.06em] drop-shadow-[0_0_12px_rgba(255,214,51,0.35)] normal-case'>
					{chunks}
				</span>
			),
		}),
		[],
	);
	const heroMotion = useMemo(() => heroEnter(false), [])
	const heroMotionDelayed = useMemo(() => heroEnter(false, { delay: 0.06 }), [])
	const trustSegment = TRUST_ITEMS.map(key => t(`trust.${key}`))

	const scrollSlider = (
		ref: React.RefObject<HTMLDivElement | null>,
		dir: 'left' | 'right',
	) => {
		if (!ref.current) return
		const amount = ref.current.offsetWidth * 0.8
		ref.current.scrollBy({
			left: dir === 'left' ? -amount : amount,
			behavior: 'smooth',
		})
	}

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: FAQ_ITEMS.map(key => ({
			'@type': 'Question',
			name: t(`faq.${key}.q`),
			acceptedAnswer: {
				'@type': 'Answer',
				text: t(`faq.${key}.a`),
			},
		})),
	}

	return (
		<>
			<Navbar />

			{/*
			  Mobile BOOK: outer node must stay `fixed` without transform.
			  Framer `y` on the same element breaks `position:fixed` in Safari (fixed behaves like scroll content).
			  Hide when footer is in view so it does not cover footer content.
			*/}
			<div
				className={`md:hidden fixed left-6 right-6 z-40 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] ${showMobileBook ? '' : 'pointer-events-none'}`}
			>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={
						showMobileBook
							? { opacity: 1, y: 0, pointerEvents: 'auto' as const }
							: { opacity: 0, y: 20, pointerEvents: 'none' as const }
					}
					transition={{ duration: 0.35, ease: EASE_EXPO_OUT }}
				>
					<Link
						href={`/${locale}/massage/booking`}
						className='flex w-full items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gold-soft text-nearBlack font-semibold text-sm tracking-wider uppercase shadow-glow-strong backdrop-blur-sm'
					>
						<Calendar className='w-4 h-4' />
						{t('bookNow')}
					</Link>
				</motion.div>
			</div>

			{/* 1. HERO */}
			<section
				id='hero'
				className='relative h-svh flex flex-col overflow-hidden noise-overlay'
				aria-labelledby='massage-hero'
			>
				<div className='absolute inset-0'>
					<Image
						src='https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920'
						alt=''
						fill
						className='object-cover opacity-40'
						priority
						sizes='100vw'
					/>
					<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/80 via-nearBlack/60 to-nearBlack' />
					<div
						className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,184,0,0.08)_0%,transparent_70%)]'
						aria-hidden
					/>
				</div>

				<motion.p
					{...heroMotion}
					className='relative z-10 w-full text-center text-gold-glow/70 text-[10px] sm:text-xs tracking-[0.25em] sm:tracking-[0.3em] uppercase px-6 pt-20 sm:pt-24 md:pt-28'
				>
					{t('heroBadge')}
				</motion.p>

				<div className='relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0'>
					<motion.div
						{...heroMotionDelayed}
						className='text-center'
					>
						<div className='flex justify-center mb-0'>
							<Image
								src='/images/Gemini_yellow2.png'
								alt='V2studio'
								width={180}
								height={200}
								className='h-20 sm:h-24 md:h-32 lg:h-36 w-auto drop-shadow-[0_0_40px_rgba(232,184,0,0.2)]'
								priority
							/>
						</div>

						<GlowText
							text={tCommon('massage')}
							accessibleHeading={t('heroSeoHeading')}
							srOnlyHeadingId='massage-hero'
						/>

						<p className='-mt-1 text-gold-glow/90 text-sm tracking-wider uppercase'>
							{t('hero')}
						</p>

						<div className='mt-4 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 w-full max-w-[17rem] sm:max-w-none mx-auto'>
							<Link
								href={`/${locale}/massage/booking`}
								className='inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-glow text-sm font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-[background-color,border-color,color,box-shadow] duration-300'
							>
								{t('heroBookButton')}
								<ChevronRight className='w-4 h-4' />
							</Link>
							<a
								href='#services'
								className='inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-icyWhite/70 text-sm font-medium tracking-wider uppercase hover:border-gold-soft/40 hover:text-gold-glow transition-[background-color,border-color,color,box-shadow] duration-300'
							>
								{t('heroPricesButton')}
							</a>
						</div>
					</motion.div>
				</div>

				{/* Trust bar — бегущая строка, как на depilation. iOS-safe: WAAPI по
				    измеренной в пикселях дистанции, размытый фон — sibling трека, а не
				    его предок. Скорость по уровням: телефон 36 (узкий экран, текст
				    должен успеть прочитаться), планшет 48, десктоп 60. */}
				<Marquee
					speed={narrowPhone ? 36 : tablet ? 48 : 60}
					gradientEdges
					pauseOnHover
					ariaLabel={t('trustBarLabel')}
					className='hero-trust-bar-massage z-10 shrink-0 py-3 border-t border-white/5'
					backgroundClassName='bg-nearBlack/60 backdrop-blur-sm'
				>
					{trustSegment.map((text, i) => (
						<span
							key={`trust-${i}`}
							className='flex items-center gap-2 sm:gap-3 md:gap-4 pl-3 pr-2.5 sm:pl-4 sm:pr-3 md:px-5 shrink-0'
						>
							<span className='text-gold-glow/80 text-[10px] sm:text-xs lg:text-sm tracking-wider uppercase whitespace-nowrap'>
								{text}
							</span>
						</span>
					))}
				</Marquee>
			</section>

			<SectionDivider variant='rule' />

			{/* 3. ABOUT */}
			<section
				id='about'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='about-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
						<motion.div
							{...rxAbout}
							className='relative aspect-[3/4] max-w-md w-full mx-auto lg:mx-0 rounded-2xl overflow-hidden border border-white/10'
						>
							<Image
								src='/images/massage/serhiy-volyk.png'
								alt={t('team.therapist1.name')}
								fill
								className='object-cover'
								sizes='(max-width: 1024px) 100vw, 50vw'
							/>
							<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/25 to-transparent' />
							<div className='absolute bottom-0 left-0 right-0 p-6'>
								<p className='font-serif text-2xl text-icyWhite'>
									{t('team.therapist1.name')}
								</p>
								<p className='text-gold-glow/90 text-sm mt-1'>
									{t('team.therapist1.role')}
								</p>
							</div>
						</motion.div>
						<div>
							<motion.h2
								id='about-heading'
								{...ryAbout}
								className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-6'
							>
								{t('aboutTitle')}
							</motion.h2>
							<motion.p
								{...rfAbout}
								className='text-icyWhite/80 leading-relaxed mb-4'
							>
								{t('aboutIntro')}
							</motion.p>
							{ABOUT_PARAGRAPHS.map((key, i) => (
								<motion.p
									key={key}
									{...rfAbout}
									className={`text-icyWhite/70 leading-relaxed${
										i < ABOUT_PARAGRAPHS.length - 1 ? ' mb-4' : ''
									}`}
								>
									{t(key)}
								</motion.p>
							))}
						</div>
					</div>
				</div>
			</section>


			<SectionDivider variant='rule' />

			{/* 5. ACHIEVEMENTS */}
			<section
				id='achievements'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='achievements-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
						<motion.div
							{...rxLeft}
							className='relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 order-2 lg:order-1'
						>
							<Image
								src='https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'
								alt=''
								fill
								className='object-cover'
								sizes='(max-width: 1024px) 100vw, 50vw'
							/>
						</motion.div>
						<div className='order-1 lg:order-2'>
							<motion.h2
								id='achievements-heading'
								{...ry}
								className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-8 flex items-center gap-3'
							>
								<Award
									className='w-10 h-10 text-gold-soft shrink-0'
									aria-hidden
								/>
								{t('achievementsTitle')}
							</motion.h2>
							<ul className='space-y-4'>
								{CREDENTIALS.map((key, i) => (
									<motion.li
										key={key}
										{...rxRight}
										transition={staggerTransition(minimal, i, 0.03, compact)}
										className='flex items-start gap-3'
									>
										<span className='text-gold-soft shrink-0 mt-1'>&#10022;</span>
										<span>
											<span className='block text-icyWhite font-medium'>
												{t(`credentials.${key}.title`)}
											</span>
											<span className='block text-icyWhite/60 text-sm leading-relaxed mt-0.5'>
												{t(`credentials.${key}.desc`)}
											</span>
										</span>
									</motion.li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 6. WHAT WE OFFER */}
			<section
				id='how-we-help'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='how-we-help-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='how-we-help-heading'
						{...ry}
						className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite text-center max-w-4xl mx-auto leading-tight sm:leading-snug mb-14'
					>
						{t.rich('howIHelpTitle', richStudioBrand)}
					</motion.h2>
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
						{VALUES.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								{...ry}
								transition={staggerTransition(minimal, i, 0.04, compact)}
								className='group relative p-6 sm:p-7 rounded-2xl glass-card hover:shadow-card-hover transition-[border-color,box-shadow] duration-300 cursor-default'
							>
								<div className='w-12 h-12 rounded-xl bg-gold-soft/10 flex items-center justify-center mb-4 group-hover:bg-gold-soft/20 group-hover:scale-110 transition-[background-color,transform] duration-300'>
									<Icon className='w-6 h-6 text-gold-soft/90' aria-hidden />
								</div>
								<p className='text-icyWhite font-medium text-sm leading-snug'>
									{t(key)}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 7. SERVICES — photo wall */}
			<section
				id='services'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='services-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<MassageServiceSections locale={locale} headingMotion={ry} />
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 8. PROCESS */}
			<section
				id='process'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='process-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='process-heading'
						{...ry}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-14'
					>
						{t('process.title')}
					</motion.h2>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{PROCESS_STEPS.map(({ key, step }, i) => (
							<motion.div
								key={key}
								{...ry}
							transition={staggerTransition(minimal, i, 0.06, compact)}
								className='group relative p-6 rounded-2xl glass-card'
							>
								<span className='absolute top-4 right-5 font-serif text-5xl text-gold-soft/25 transition-colors duration-500 group-hover:text-gold-soft/50'>
									{step}
								</span>
								<div className='mb-5 h-0.5 w-8 rounded-full bg-gold-soft/40 transition-[width] duration-300 group-hover:w-12' />
								<h3 className='font-serif text-xl text-icyWhite mb-3 relative'>
									{t(`process.${key}.title`)}
								</h3>
								<p className='text-icyWhite/60 text-sm leading-relaxed relative'>
									{t(`process.${key}.desc`)}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 9. TEAM */}
			<section
				id='team'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='team-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='team-heading'
						{...ry}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('team.title')}
					</motion.h2>
					<motion.p
						{...rf}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('team.subtitle')}
					</motion.p>

					<div className='relative'>
						<div
							ref={sliderRef}
							className='flex gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x touch-pan-y snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
							style={{ scrollbarWidth: 'none' }}
						>
							{/* Workspace card */}
							<motion.article
								{...ry}
								className='shrink-0 w-[320px] sm:w-[360px] snap-center rounded-2xl overflow-hidden glass-card group'
							>
								<div className='relative aspect-[3/4] overflow-hidden'>
									<Image
										src='https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80'
										alt={t('team.workspace.title')}
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-700'
										sizes='360px'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent' />
									<div className='absolute bottom-0 left-0 right-0 p-6'>
										<h3 className='font-serif text-xl text-icyWhite'>
											{t('team.workspace.title')}
										</h3>
									</div>
								</div>
								<div className='p-6'>
									<p className='text-icyWhite/70 text-sm leading-relaxed'>
										{t('team.workspace.desc')}
									</p>
								</div>
							</motion.article>

							{/* Massage specialist (Sergiy) — primary */}
							<motion.article
								{...ry}
								transition={enterDelay(minimal, 0.08, compact)}
								className='shrink-0 w-[320px] sm:w-[360px] snap-center rounded-2xl overflow-hidden glass-card group'
							>
								<div className='relative aspect-[3/4] overflow-hidden'>
									<Image
										src='/images/massage/serhiy-volyk.png'
										alt={t('team.therapist1.name')}
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-700'
										sizes='360px'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent' />
									<div className='absolute bottom-0 left-0 right-0 p-6'>
										<h3 className='font-serif text-2xl text-icyWhite'>
											{t('team.therapist1.name')}
										</h3>
										<p className='text-gold-glow/90 text-sm mt-1'>
											{t('team.therapist1.role')}
										</p>
									</div>
								</div>
								<div className='p-6'>
									<p className='text-icyWhite/50 text-xs tracking-wider uppercase mb-3'>
										{t('team.therapist1.specialty')}
									</p>
									<p className='text-icyWhite/70 text-sm leading-relaxed'>
										{t('team.therapist1.bio')}
									</p>
								</div>
							</motion.article>

							{/* Depilation specialist (Natalia) — cross-link to depilation page */}
							<motion.article
								{...ry}
								transition={enterDelay(minimal, 0.16, compact)}
								className='shrink-0 w-[320px] sm:w-[360px] snap-center rounded-2xl overflow-hidden glass-card group'
							>
								<Link
									href={`/${locale}/depilation`}
									target='_blank'
									rel='noopener'
									aria-label={`${t('team.natalie.name')} — ${t('team.natalie.role')}`}
									className='block'
								>
									<div className='relative aspect-[3/4] overflow-hidden'>
										<Image
											src='/images/depilation/E9A1D7C4-02D4-4718-9455-AB23672CC127_1_105_c-8ea037d5-0afb-4946-85b7-548eb136ccca.png'
											alt={t('team.natalie.name')}
											fill
											className='object-cover group-hover:scale-105 transition-transform duration-700'
											sizes='360px'
										/>
										<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent' />
										<div className='absolute bottom-0 left-0 right-0 p-6'>
											<h3 className='font-serif text-2xl text-icyWhite'>
												{t('team.natalie.name')}
											</h3>
											<p className='text-gold-glow/90 text-sm mt-1'>
												{t('team.natalie.role')}
											</p>
										</div>
									</div>
									<div className='p-6'>
										<p className='text-icyWhite/50 text-xs tracking-wider uppercase mb-3'>
											{t('team.natalie.specialty')}
										</p>
										<p className='text-icyWhite/70 text-sm leading-relaxed'>
											{t('team.natalie.bio')}
										</p>
									</div>
								</Link>
							</motion.article>
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-glow transition-colors'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-glow transition-colors'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />
			{/* 10. HYGIENE */}
			<section
				id='hygiene'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='hygiene-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='hygiene-heading'
						{...ry}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('hygiene.title')}
					</motion.h2>
					<motion.p
						{...rf}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('hygiene.subtitle')}
					</motion.p>

					<div className='flex flex-wrap justify-center gap-6'>
						{HYGIENE_ITEMS.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								{...ry}
								transition={staggerTransition(minimal, i, 0.05, compact)}
								className='w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-gold-soft/25 transition-[background-color,border-color,color,box-shadow] duration-300'
							>
								<Icon className='w-8 h-8 text-gold-glow/90 mb-4' aria-hidden />
								<h3 className='text-icyWhite font-medium text-sm mb-2'>
									{t(`hygiene.${key}.title`)}
								</h3>
								<p className='text-icyWhite/55 text-xs leading-relaxed'>
									{t(`hygiene.${key}.desc`)}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 11. TESTIMONIALS */}
			<section
				id='testimonials'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='testimonials-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='testimonials-heading'
						{...ry}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('testimonials.title')}
					</motion.h2>
					<motion.p
						{...rf}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('testimonials.subtitle')}
					</motion.p>

					<div className='relative'>
						<div
							ref={testimonialRef}
							className='flex items-start gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x touch-pan-y snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
						>
							{TESTIMONIALS.map((key, i) => (
								<motion.blockquote
									key={key}
									{...ry}
							transition={staggerTransition(minimal, i, 0.04, compact)}
									className='shrink-0 w-[300px] sm:w-[340px] snap-center p-6 rounded-2xl border border-white/10 bg-white/[0.02]'
								>
									<div className='flex gap-1 mb-4'>
										{Array.from({ length: 5 }).map((_, si) => (
											<Star
												key={si}
												className='w-4 h-4 text-gold-soft fill-gold-soft'
											/>
										))}
									</div>
									<p className='text-icyWhite/80 text-sm leading-relaxed mb-4 italic'>
										&ldquo;{t(`testimonials.${key}.text`)}&rdquo;
									</p>
									<footer>
										<span className='text-icyWhite/60 text-xs font-medium'>
											{t(`testimonials.${key}.author`)}
										</span>
									</footer>
								</motion.blockquote>
							))}
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-glow transition-colors'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-glow transition-colors'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 12. FAQ */}
			<section
				id='faq'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='faq-heading'
			>
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
				/>
				<div className='max-w-3xl mx-auto'>
					<motion.h2
						id='faq-heading'
						{...ry}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('faq.title')}
					</motion.h2>
					<motion.p
						{...rf}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('faq.subtitle')}
					</motion.p>

					<Accordion type='single' collapsible className='space-y-2'>
						{FAQ_ITEMS.map(key => (
							<AccordionItem
								key={key}
								value={key}
								className='rounded-xl border border-white/10 bg-white/[0.02] px-6 overflow-hidden'
							>
								<AccordionTrigger className='text-icyWhite text-left text-sm font-medium py-5 [&>svg]:text-gold-soft'>
									{t(`faq.${key}.q`)}
								</AccordionTrigger>
								<AccordionContent className='text-icyWhite/65 text-sm leading-relaxed'>
									{t(`faq.${key}.a`)}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 13. CONTACT */}
			<section
				id='contact'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/40'
				aria-labelledby='contact-heading'
			>
				<div className='max-w-5xl mx-auto'>
					<motion.header
						{...ry}
						className='text-center mb-12'
					>
						<h2
							id='contact-heading'
							className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-3'
						>
							{t('contact.title')}
						</h2>
						<p className='text-icyWhite/55 text-sm sm:text-base max-w-md mx-auto'>
							{t('contact.subtitle')}
						</p>
					</motion.header>

					<div className='grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 lg:items-stretch'>
						<motion.div
							{...ry}
							className='flex min-h-0 flex-col lg:h-full'
						>
							<div className='relative min-h-[260px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:min-h-[280px] lg:min-h-0'>
								<iframe
									src={contact.googleMapsEmbed}
									className='absolute inset-0 h-full w-full border-0'
									allowFullScreen
									loading='lazy'
									referrerPolicy='no-referrer-when-downgrade'
									title={t('contact.mapTitle')}
								/>
							</div>
							<div className='mt-4 flex shrink-0 flex-col gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between'>
								<div className='flex items-start gap-3 min-w-0'>
									<MapPin className='w-5 h-5 text-gold-soft shrink-0 mt-0.5' />
									<div>
										<p className='text-icyWhite font-medium text-sm'>
											{contact.addressSubtitle}
										</p>
										<p className='text-icyWhite/60 text-sm mt-0.5'>
											{contact.address}
										</p>
									</div>
								</div>
								<a
									href={contact.googleMaps}
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-lg bg-gold-soft/15 text-gold-glow text-sm font-medium hover:bg-gold-soft/25 transition-colors'
								>
									<Navigation className='w-4 h-4' />
									{tCommon('getDirections')}
								</a>
							</div>
						</motion.div>

						<motion.div
							{...ry}
							transition={enterDelay(minimal, 0.05, compact)}
							className='flex min-h-0 flex-col lg:h-full'
						>
							<div className='flex h-full min-h-0 flex-col rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10'>
								<div className='space-y-2 mb-6'>
									<a
										href={`tel:${contact.phone.replace(/\s/g, '')}`}
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-gold-soft/10 text-gold-glow group-hover:bg-gold-soft/20 transition-colors'>
											<Phone className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-gold-glow transition-colors'>
											{contact.phone}
										</span>
									</a>
									<a
										href={contact.whatsapp}
										target='_blank'
										rel='noopener noreferrer'
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366] group-hover:bg-[#25D366]/25 transition-colors'>
											<MessageCircle className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-[#25D366] transition-colors'>
											WhatsApp
										</span>
									</a>
									<a
										href={`mailto:${contact.email}`}
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-gold-soft/10 text-gold-glow group-hover:bg-gold-soft/20 transition-colors'>
											<Mail className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium truncate group-hover:text-gold-glow transition-colors'>
											{contact.email}
										</span>
									</a>
								</div>

								<div className='mt-5'>
								<Dialog>
									<DialogTrigger asChild>
										<button
											type='button'
											className='w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gold-soft text-nearBlack font-semibold text-sm tracking-wide hover:bg-gold-soft/90 focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack transition-[background-color,border-color,color,box-shadow] duration-300'
										>
											<Send className='w-4 h-4' />
											{t('contact.formTitle')}
										</button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>{t('contact.formTitle')}</DialogTitle>
											<DialogDescription>
												{t('contact.subtitle')}
											</DialogDescription>
										</DialogHeader>
										{contactSent ? (
											<motion.div
												initial={minimal ? false : { opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ duration: minimal ? 0 : 0.2 }}
												className='p-8 rounded-xl border border-gold-soft/20 bg-gold-soft/[0.04] text-center'
											>
												<BadgeCheck className='w-12 h-12 text-gold-soft mx-auto mb-4' />
												<p className='text-icyWhite/80 text-sm'>
													{t('contact.success')}
												</p>
											</motion.div>
										) : (
											<form
												onSubmit={e => {
													e.preventDefault()
													setContactSent(true)
												}}
												className='space-y-4'
											>
												<div>
													<label
														htmlFor='dlg-name-m'
														className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
													>
														{t('contact.nameLabel')}
													</label>
													<Input
														id='dlg-name-m'
														type='text'
														required
														placeholder={t('contact.namePlaceholder')}
													/>
												</div>
												<div className='grid sm:grid-cols-2 gap-3'>
													<div>
														<label
															htmlFor='dlg-email-m'
															className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
														>
															{t('contact.emailLabel')}
														</label>
														<Input
															id='dlg-email-m'
															type='email'
															required
															placeholder={t('contact.emailPlaceholder')}
														/>
													</div>
													<div>
														<label
															htmlFor='dlg-phone-m'
															className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
														>
															{t('contact.phoneLabel')}
														</label>
														<Input
															id='dlg-phone-m'
															type='tel'
															placeholder={t('contact.phonePlaceholder')}
														/>
													</div>
												</div>
												<div>
													<label
														htmlFor='dlg-msg-m'
														className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
													>
														{t('contact.messageLabel')}
													</label>
													<Textarea
														id='dlg-msg-m'
														rows={4}
														required
														placeholder={t('contact.messagePlaceholder')}
													/>
												</div>
												<button
													type='submit'
													className='w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-wider uppercase hover:bg-gold-soft/25 hover:shadow-glow transition-[background-color,border-color,color,box-shadow] duration-300'
												>
													<Send className='w-4 h-4' />
													{t('contact.submit')}
												</button>
											</form>
										)}
									</DialogContent>
								</Dialog>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			<SectionDivider variant='rule' />

			{/* 14. FINAL BOOKING CTA — оформление то же, что на странице депиляции:
			    вертикальный градиент + мягкое золотое пятно за текстом, крупнее
			    заголовок, кнопки rounded-2xl. Анимация оставлена массажная
			    (`ry`/`rf`), депиляционные variants сюда не тянутся. */}
			<section
				id='booking'
				className='relative py-24 sm:py-32 lg:py-44 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='booking-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack via-nearBlack/95 to-nearBlack' />
				<div className='absolute inset-0 overflow-hidden pointer-events-none'>
					<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-gold-soft/[0.04] blur-[120px]' />
				</div>

				<div className='relative max-w-3xl mx-auto text-center'>
					<motion.h2
						id='booking-heading'
						{...ry}
						className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-6'
					>
						{t('reserveTitle')}
					</motion.h2>
					<motion.p
						{...rf}
						className='text-icyWhite/60 mb-12 leading-relaxed text-lg max-w-xl mx-auto'
					>
						{t.rich('reserveDesc', richStudioBrand)}
					</motion.p>
					<motion.div
						{...ry}
						transition={staggerTransition(minimal, 2, 0.06, compact)}
						className='grid w-full max-w-xl mx-auto grid-cols-1 sm:grid-cols-2 gap-4'
					>
						<Link
							href={`/${locale}/massage/booking`}
							className='group inline-flex w-full min-h-[3.5rem] items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft text-sm font-semibold tracking-wider uppercase hover:bg-gold-soft/25 hover:border-gold-soft/60 hover:shadow-glow transition-[background-color,border-color,box-shadow] duration-300'
						>
							{t('bookNow')}
							<ChevronRight className='w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform' />
						</Link>
						<a
							href={`tel:${contact.phone.replace(/\s/g, '')}`}
							className='inline-flex w-full min-h-[3.5rem] items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/10 text-icyWhite/60 text-sm font-semibold tracking-wider uppercase hover:border-gold-soft/30 hover:text-gold-soft/80 transition-colors duration-300'
						>
							<Phone className='w-4 h-4 shrink-0' />
							{t('callNow')}
						</a>
					</motion.div>
				</div>
			</section>

			{/* 15. FOOTER */}
			<footer
				ref={footerRef}
				className='border-t border-white/5 px-6 lg:px-8 py-12 max-md:pb-20'
			>
				<div className='max-w-6xl mx-auto'>
					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10'>
						<div>
							<Link
								href={`/${locale}`}
								className='block hover:opacity-80 transition-opacity'
							>
								<Image
									src='/images/Gemini_yellow2.png'
									alt='V2studio'
									width={140}
									height={70}
									className='h-14 w-auto'
								/>
							</Link>
							<p className='text-icyWhite/40 text-xs mt-3 leading-relaxed'>
								{t('footer.tagline')}
							</p>
						</div>
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('footer.navTitle')}
							</h4>
							<ul className='space-y-2'>
								{[
									{ href: '#services', label: t('serviceSections.title') },
									{ href: '#team', label: t('team.title') },
									{ href: '#faq', label: t('faq.title') },
									{ href: '#contact', label: t('contact.title') },
								].map(link => (
									<li key={link.href}>
										<a
											href={link.href}
											className='text-icyWhite/60 hover:text-gold-glow text-sm transition-colors'
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('contact.title')}
							</h4>
							<ul className='space-y-2 text-sm'>
								<li>
									<a
										href={`tel:${contact.phone.replace(/\s/g, '')}`}
										className='text-icyWhite/60 hover:text-gold-glow transition-colors'
									>
										{contact.phone}
									</a>
								</li>
								<li>
									<a
										href={`mailto:${contact.email}`}
										className='text-icyWhite/60 hover:text-gold-glow transition-colors'
									>
										{contact.email}
									</a>
								</li>
								<li className='text-icyWhite/40'>{contact.address}</li>
							</ul>
						</div>
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('footer.socialTitle')}
							</h4>
							<div className='flex items-center gap-4'>
								<a
									href={contact.whatsapp}
									target='_blank'
									rel='noopener noreferrer'
									className='text-icyWhite/50 hover:text-[#25D366] transition-colors'
									aria-label='WhatsApp'
								>
									<MessageCircle className='w-5 h-5' />
								</a>
							</div>
						</div>
					</div>

					<div className='border-t border-white/5 pt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4'>
						<p className='text-icyWhite/30 text-xs max-sm:text-center max-sm:w-full'>
							&copy; {new Date().getFullYear()} V2Studio. {t('footer.rights')}
						</p>
						<div className='flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2 max-sm:w-full'>
							<Link
								href={`/${locale}/privacy`}
								className='text-icyWhite/30 hover:text-icyWhite/50 text-xs transition-colors'
							>
								{t('footer.privacy')}
							</Link>
							<Link
								href={`/${locale}/cookies`}
								className='text-icyWhite/30 hover:text-icyWhite/50 text-xs transition-colors'
							>
								{t('footer.cookies')}
							</Link>
							<button
								type='button'
								onClick={openPreferences}
								className='text-icyWhite/30 hover:text-icyWhite/50 text-xs transition-colors'
							>
								{tCookie('manageSettings')}
							</button>
						</div>
					</div>
				</div>
			</footer>
		</>
	)
}
