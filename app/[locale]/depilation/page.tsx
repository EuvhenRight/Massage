'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import DepilationServiceSections from '@/components/DepilationServiceSections'
import GlowText from '@/components/GlowText'
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
import { SITE_CONFIG } from '@/lib/site-config'
import { useSiteMotion } from '@/lib/site-motion'
import {
	motion,
	useMotionValueEvent,
	useScroll,
	useTransform,
} from 'framer-motion'
import {
	ArrowDown,
	BadgeCheck,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Facebook,
	Feather,
	FingerprintPattern,
	Gem,
	HeartHandshake,
	Instagram,
	Mail,
	MapPin,
	MessageCircle,
	Navigation,
	Phone,
	Send,
	ShieldCheck,
	Sparkles,
	Star,
	ThermometerSun,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

const IMG = {
	about:
		'/images/depilation/AB678F7C-B5F1-468E-B739-4B8720842F20_1_105_c-d333239b-5b90-40a1-b3f3-bdb92ec4ba15.png',
	terra:
		'/images/depilation/FD5A90EF-7384-410B-B069-880FF57AD64E_1_105_c-e553e146-de2e-455a-8edc-21ec8e423efb.png',
	portrait:
		'/images/depilation/0E99BE5B-A88A-47AB-B264-3FC267ACCCD4_1_105_c-04788ef6-5115-4c2c-8a4c-74129c6e50f5.png',
	portrait2:
		'/images/depilation/E9A1D7C4-02D4-4718-9455-AB23672CC127_1_105_c-8ea037d5-0afb-4946-85b7-548eb136ccca.png',
	certificate:
		'/images/depilation/7E17C6FA-202D-4C8B-AE13-C6B908A159C4_1_105_c-74b4a433-f2de-477c-a6b3-42c6f9058950.png',
	comfort:
		'/images/depilation/AC2A6C46-C748-4442-A844-8308EF549B01_1_105_c-c4a1a659-e4f8-450c-bbf8-ce2e348acbbf.png',
}

const VALUES = [
	{ key: 'valueHygiene' as const, icon: ShieldCheck },
	{ key: 'valueDelicacy' as const, icon: Feather },
	{ key: 'valueIndividual' as const, icon: FingerprintPattern },
	{ key: 'valueService' as const, icon: Gem },
	{ key: 'valueAtmosphere' as const, icon: HeartHandshake },
]

const ACHIEVEMENT_KEYS = [
	'achievement1',
	'achievement2',
	'achievement3',
	'achievement4',
	'achievement5',
] as const

const TRUST_ITEMS = [
	'trustYears',
	'trustMedical',
	'trustChampion',
	'trustTechniques',
	'trustClients',
] as const

const PROCESS_STEPS = [
	{ key: 'consultation' as const, step: 1 },
	{ key: 'preparation' as const, step: 2 },
	{ key: 'procedure' as const, step: 3 },
	{ key: 'aftercare' as const, step: 4 },
] as const

const HYGIENE_ITEMS = [
	{ key: 'singleUse' as const, icon: ShieldCheck },
	{ key: 'sanitization' as const, icon: Sparkles },
	{ key: 'sterilization' as const, icon: ThermometerSun },
	{ key: 'certified' as const, icon: BadgeCheck },
] as const

const TESTIMONIALS = [
	'review1',
	'review2',
	'review3',
	'review4',
	'review5',
	'review6',
	'review7',
	'review8',
	'review9',
	'review10',
	'review11',
	'review12',
	'review13',
	'review14',
	'review15',
	'review16',
	'review17',
	'review18',
	'review19',
	'review20',
	'review21',
] as const

const FAQ_ITEMS = [
	'painful',
	'prepare',
	'results',
	'technique',
	'men',
	'aftercare',
	'booking',
	'sensitive',
] as const

export default function DepilationPage() {
	const t = useTranslations('depilation')
	const tCommon = useTranslations('common')
	const tCookie = useTranslations('cookieConsent')
	const { openPreferences } = useCookieConsent()
	const richStudioBrand = useMemo(
		() => ({
			brand: (chunks: ReactNode) => (
				<span className='inline font-semibold text-gold-glow tracking-[0.06em] drop-shadow-[0_0_12px_rgba(255,214,51,0.35)] normal-case'>
					{chunks}
				</span>
			),
		}),
		[],
	)
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const sliderRef = useRef<HTMLDivElement>(null)
	const testimonialRef = useRef<HTMLDivElement>(null)
	const [contactSent, setContactSent] = useState(false)

	/** Parallax + scroll-fade on the hero confuse iOS Safari (dvh jumps, scale + translate). Desktop only. */
	const [heroParallaxDesktop, setHeroParallaxDesktop] = useState(false)
	useEffect(() => {
		const mq = window.matchMedia('(min-width: 1024px)')
		const apply = () => setHeroParallaxDesktop(mq.matches)
		apply()
		mq.addEventListener('change', apply)
		return () => mq.removeEventListener('change', apply)
	}, [])

	const { minimal } = useSiteMotion()
	const heroScrollFx = !minimal && heroParallaxDesktop

	const stagger = useMemo(
		() =>
			minimal
				? { hidden: {}, show: { transition: { staggerChildren: 0 } } }
				: { hidden: {}, show: { transition: { staggerChildren: 0.04 } } },
		[minimal],
	)
	const fadeUp = useMemo(
		() =>
			minimal
				? {
						hidden: { opacity: 1, y: 0 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0 },
						},
					}
				: {
						hidden: { opacity: 0, y: 12 },
						show: {
							opacity: 1,
							y: 0,
							transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
						},
					},
		[minimal],
	)
	const fadeIn = useMemo(
		() =>
			minimal
				? {
						hidden: { opacity: 1 },
						show: { opacity: 1, transition: { duration: 0 } },
					}
				: {
						hidden: { opacity: 0 },
						show: { opacity: 1, transition: { duration: 0.4 } },
					},
		[minimal],
	)
	const scaleUp = useMemo(
		() =>
			minimal
				? {
						hidden: { opacity: 1, scale: 1 },
						show: { opacity: 1, scale: 1, transition: { duration: 0 } },
					}
				: {
						hidden: { opacity: 0, scale: 0.96 },
						show: {
							opacity: 1,
							scale: 1,
							transition: { duration: 0.36, ease: [0.25, 0.1, 0.25, 1] },
						},
					},
		[minimal],
	)

	const heroRef = useRef<HTMLElement>(null)
	const { scrollYProgress } = useScroll({
		target: heroRef,
		offset: ['start start', 'end start'],
	})
	const heroImgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
	const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

	const [heroScrolled, setHeroScrolled] = useState(false)
	const [showFloatingCTA, setShowFloatingCTA] = useState(false)
	useMotionValueEvent(scrollYProgress, 'change', v => {
		setHeroScrolled(v > 0.1)
		setShowFloatingCTA(v > 0.85)
	})

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

	/** One segment = full trust list; 4 identical segments → loop at -25% translate = seamless */
	const TRUST_MARQUEE_COPIES = 4
	const trustSegment = TRUST_ITEMS.map(key => t(`trust.${key}`))
	const duplicatedTrust = Array.from(
		{ length: TRUST_MARQUEE_COPIES },
		() => trustSegment,
	).flat()

	return (
		<>
			<Navbar />

			{/* Mobile floating Book Now — appears after scrolling past hero */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={
					showFloatingCTA
						? { opacity: 1, y: 0 }
						: { opacity: 0, y: 20, pointerEvents: 'none' as const }
				}
				transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
				className='md:hidden fixed left-6 right-6 z-40 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]'
			>
				<Link
					href={`/${locale}/depilation/booking`}
					className='flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gold-soft text-nearBlack font-semibold text-sm tracking-wider uppercase shadow-glow-strong backdrop-blur-sm'
				>
					<Calendar className='w-4 h-4' />
					{t('bookNow')}
				</Link>
			</motion.div>

			{/* ── 1. HERO — cinematic fullscreen with parallax ── */}
			<section
				ref={heroRef}
				id='hero'
				className='relative h-[100svh] lg:h-[100dvh] flex flex-col overflow-hidden noise-overlay'
				aria-labelledby='depilation-hero'
			>
				{/* Parallax background — lg+ only; mobile uses stable svh + no motion.y */}
				<motion.div
					className='absolute inset-0'
					style={heroScrollFx ? { y: heroImgY } : undefined}
				>
					<Image
						src={IMG.portrait}
						alt=''
						fill
						className='object-cover scale-100 lg:scale-110'
						priority
						sizes='100vw'
					/>
					<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/70 via-nearBlack/50 to-nearBlack' />
				</motion.div>

				{/* Ambient glow orbs */}
				<div className='absolute inset-0 overflow-hidden pointer-events-none'>
					<div className='absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-gold-soft/[0.04] blur-[120px] animate-float' />
					<div className='absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-gold-soft/[0.03] blur-[100px] animate-float-delayed' />
				</div>

				{/* Badge line */}
				<motion.p
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className='relative z-10 w-full shrink-0 text-center text-gold-soft/60 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.35em] uppercase px-6 pt-20 sm:pt-24 md:pt-28'
				>
					{t.rich('heroBadge', richStudioBrand)}
				</motion.p>

				{/* Main hero content — scroll-linked fade only with parallax (lg+). */}
				<motion.div
					style={heroScrollFx ? { opacity: heroOpacity } : undefined}
					className='relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-6 overflow-hidden'
				>
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
						className='text-center'
					>
						<div className='flex justify-center mb-10 sm:mb-20 md:mb-20 lg:mb-0'>
							<Image
								src='/images/Gemini_yellow2.png'
								alt='V2studio'
								width={180}
								height={200}
								className='h-28 sm:h-28 md:h-32 lg:h-36 w-auto drop-shadow-[0_0_40px_rgba(232,184,0,0.2)]'
								priority
							/>
						</div>

						<GlowText text={tCommon('depilation')} />

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.8, duration: 0.8 }}
							className='-mt-1 text-gold-soft/80 text-xs sm:text-sm tracking-wider uppercase max-w-lg mx-auto leading-relaxed'
						>
							{t('heroLine1')}
							<br />
							{t('heroLine2')}
						</motion.p>

						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1, duration: 0.6 }}
							className='mt-6 flex flex-wrap justify-center gap-3'
						>
							<Link
								href={`/${locale}/depilation/booking`}
								className='group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft text-sm font-medium tracking-wider uppercase hover:bg-gold-soft/25 hover:border-gold-soft/60 hover:shadow-glow transition-all duration-500'
							>
								{t('heroBookButton')}
								<ChevronRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
							</Link>
							<Link
								href={`/${locale}/depilation/price`}
								className='inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/10 text-icyWhite/60 text-sm font-medium tracking-wider uppercase hover:border-gold-soft/30 hover:text-gold-soft/80 transition-all duration-500'
							>
								{t('heroPricesButton')}
							</Link>
						</motion.div>
					</motion.div>

					{/* Scroll indicator */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: heroScrolled ? 0 : 1 }}
						transition={{ duration: 0.4 }}
						className='absolute bottom-6 sm:bottom-6 left-1/2 -translate-x-1/2'
					>
						<motion.div
							animate={
								minimal ? undefined : { y: [0, 6, 0] }
							}
							transition={
								minimal
									? undefined
									: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
							}
						>
							<ArrowDown className='w-5 h-5 text-gold-soft/40' />
						</motion.div>
					</motion.div>
				</motion.div>

				{/* Trust bar — seamless 4-segment loop + soft edges on mobile/tablet.
				    Do not wrap the CSS-animated track in a Framer transform parent: iOS Safari
				    often fails to run nested transform animations. */}
				<div
					className='hero-trust-bar-depilation relative z-10 mt-auto shrink-0 py-3.5 sm:py-4 border-t border-white/[0.06] bg-nearBlack/70 backdrop-blur-md overflow-hidden trust-marquee-viewport'
					aria-label={t('trustBarLabel')}
				>
					<div className='marquee-track-trust' aria-hidden>
						{duplicatedTrust.map((text, i) => (
							<span
								key={`trust-marquee-${i}`}
								className='flex items-center gap-2 sm:gap-3 md:gap-4 pl-3 pr-2.5 sm:pl-4 sm:pr-3 md:px-5 shrink-0'
							>
								<span
									className='w-1 h-1 rounded-full bg-gold-soft/50 shrink-0'
									aria-hidden
								/>
								<span className='text-gold-soft/70 text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap font-medium'>
									{text}
								</span>
							</span>
						))}
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={0} />

			{/* ── 2. ABOUT ME — editorial split layout ── */}
			<section
				id='about'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='about-heading'
			>
				{/* Subtle ambient glow */}
				<div className='absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold-soft/[0.02] blur-[150px] pointer-events-none' />

				<div className='max-w-6xl mx-auto'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-stretch'>
						<motion.div
							initial={{ opacity: 0, x: -40, scale: 0.96 }}
							whileInView={{ opacity: 1, x: 0, scale: 1 }}
							viewport={{ once: true, margin: '-80px' }}
							transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
							className='relative order-1 md:h-full md:min-h-0'
						>
							<div className='relative w-full aspect-[3/4] rounded-3xl overflow-hidden md:aspect-auto md:h-full md:min-h-0'>
								<Image
									src={IMG.about}
									alt='Natalie Volik'
									fill
									className='object-cover'
									sizes='(max-width: 768px) 100vw, 50vw'
								/>
								<div className='absolute inset-0 bg-gradient-to-t from-nearBlack/60 via-transparent to-transparent' />
							</div>
							{/* Floating accent frame */}
							<div className='absolute -bottom-4 -right-4 w-full h-full rounded-3xl border border-gold-soft/15 pointer-events-none' />
						</motion.div>

						<motion.div
							variants={stagger}
							initial='hidden'
							whileInView='show'
							viewport={{ once: true, margin: '-80px' }}
							className='flex flex-col md:h-full md:min-h-0 order-2 lg:pl-2 max-w-[40rem] md:max-w-none gap-5 sm:gap-6'
						>
							<motion.div variants={fadeUp} className='space-y-3'>
								<h2
									id='about-heading'
									className='font-serif text-3xl sm:text-4xl md:text-[2.125rem] lg:text-[2.375rem] text-icyWhite tracking-tight leading-[1.15]'
								>
									{t('aboutTitle')}
								</h2>
								<div
									className='h-px w-12 bg-gold-soft/45 rounded-full'
									aria-hidden
								/>
							</motion.div>
							<motion.p
								variants={fadeUp}
								className='text-base sm:text-[1.0625rem] text-gold-soft/88 font-medium leading-[1.65]'
							>
								{t.rich('aboutIntro', richStudioBrand)}
							</motion.p>
							<motion.p
								variants={fadeUp}
								className='text-base sm:text-[1.0625rem] text-icyWhite/72 leading-[1.65]'
							>
								{t('aboutJourney')}
							</motion.p>
							<motion.div
								variants={fadeUp}
								className='border-l-2 border-gold-soft/45 pl-4 sm:pl-5 py-0.5'
							>
								<p className='text-base sm:text-[1.0625rem] text-icyWhite/78 leading-[1.65] font-medium'>
									{t('aboutExpertise')}
								</p>
							</motion.div>
							<motion.p
								variants={fadeUp}
								className='text-base sm:text-[1.0625rem] text-icyWhite/72 leading-[1.65]'
							>
								{t('aboutMedical')}
							</motion.p>
							<motion.p
								variants={fadeUp}
								className='text-base sm:text-[1.0625rem] text-icyWhite/62 leading-[1.65] italic pt-5 sm:pt-6 mt-1 border-t border-white/[0.08] md:mt-auto'
							>
								{t('aboutContinuous')}
							</motion.p>
						</motion.div>
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={1} />

			{/* ── 3. ACHIEVEMENTS — horizontal scroll cards ── */}
			<section
				id='achievements'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='achievements-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/50 via-nearBlack/80 to-nearBlack/50' />

				<div className='relative max-w-6xl mx-auto'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-stretch'>
						<motion.div
							initial={{ opacity: 0, x: -40 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
							className='relative order-2 md:order-1 md:h-full md:min-h-0'
						>
							<div className='relative w-full aspect-[4/3] rounded-3xl overflow-hidden md:aspect-auto md:h-full md:min-h-0'>
								<Image
									src={IMG.certificate}
									alt=''
									fill
									className='object-cover'
									sizes='(max-width: 768px) 100vw, 50vw'
								/>
								<div className='absolute inset-0 bg-gradient-to-tr from-nearBlack/50 to-transparent' />
							</div>
						</motion.div>

						<div className='order-1 md:order-2 flex flex-col md:h-full md:min-h-0 lg:pl-2'>
							<motion.h2
								variants={fadeUp}
								initial='hidden'
								whileInView='show'
								viewport={{ once: true, margin: '-60px' }}
								id='achievements-heading'
								className='font-serif text-3xl sm:text-4xl md:text-[2.125rem] text-icyWhite tracking-tight mb-2'
							>
								{t('achievementsTitle')}
							</motion.h2>
							<motion.div
								variants={fadeUp}
								initial='hidden'
								whileInView='show'
								viewport={{ once: true, margin: '-60px' }}
								className='h-px w-12 bg-gold-soft/45 rounded-full mb-8'
								aria-hidden
							/>
							<motion.ul
								variants={stagger}
								initial='hidden'
								whileInView='show'
								viewport={{ once: true, margin: '-60px' }}
								className='m-0 flex list-none flex-col gap-3 p-0 sm:gap-3.5'
								role='list'
							>
								{ACHIEVEMENT_KEYS.map(key => (
									<motion.li
										key={key}
										variants={fadeUp}
										className='group relative flex items-start gap-3.5 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent px-4 py-3.5 transition-all duration-300 hover:border-gold-soft/25 hover:shadow-[0_0_28px_-8px_rgba(232,184,0,0.15)] sm:gap-4 sm:px-5 sm:py-4'
									>
										<span
											className='mt-0.5 select-none font-serif text-base leading-none text-gold-glow drop-shadow-[0_0_14px_rgba(255,214,51,0.45)] sm:mt-1 sm:text-lg'
											aria-hidden
										>
											✦
										</span>
										<p className='min-w-0 flex-1 text-sm font-medium leading-relaxed tracking-wide text-icyWhite/82 group-hover:text-icyWhite/90 sm:text-[0.9375rem]'>
											{t(key)}
										</p>
									</motion.li>
								))}
							</motion.ul>
						</div>
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={2} />

			{/* ── 4. WHAT YOU GET — value cards with glass effect ── */}
			<section
				id='how-i-help'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='how-i-help-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='how-i-help-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite max-w-4xl mx-auto leading-tight sm:leading-snug'
						>
							{t.rich('howIHelpTitle', richStudioBrand)}
						</motion.h2>
					</motion.div>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-40px' }}
						className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'
					>
						{VALUES.map(({ key, icon: Icon }) => (
							<motion.div
								key={key}
								variants={scaleUp}
								className='group relative p-6 sm:p-7 rounded-2xl glass-card hover:shadow-card-hover transition-all duration-500 cursor-default'
							>
								<div className='w-12 h-12 rounded-xl bg-gold-soft/10 flex items-center justify-center mb-4 group-hover:bg-gold-soft/20 group-hover:scale-110 transition-all duration-500'>
									<Icon className='w-6 h-6 text-gold-soft/90' aria-hidden />
								</div>
								<p className='text-icyWhite font-medium text-sm leading-snug'>
									{t(key)}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={0} />

			{/* ── 5. SERVICE MENU — premium card grid ── */}
			<section
				id='services'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='services-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<DepilationServiceSections
						locale={locale}
						stagger={stagger}
						fadeUp={fadeUp}
					/>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={1} />

			{/* ── 7. PROCESS — connected timeline ── */}
			<section
				id='process'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='process-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/50 via-nearBlack/80 to-nearBlack/50' />

				<div className='relative max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-16'
					>
						<motion.h2
							variants={fadeUp}
							id='process-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-10 sm:mb-12'
						>
							{t('process.title')}
						</motion.h2>
					</motion.div>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{PROCESS_STEPS.map(({ key, step }, i) => (
							<motion.div
								key={key}
								initial={minimal ? false : { opacity: 0, y: 32 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-40px' }}
								transition={{
									delay: minimal ? 0 : i * 0.1,
									duration: minimal ? 0 : 0.6,
									ease: [0.22, 1, 0.36, 1],
								}}
								className='relative p-7 rounded-3xl glass-card group'
							>
								{/* Step number watermark */}
								<span className='absolute top-4 right-5 font-serif text-6xl text-gold-soft/[0.08] group-hover:text-gold-soft/[0.15] transition-colors duration-500'>
									{step}
								</span>
								{/* Gold top accent line */}
								<div className='w-8 h-0.5 bg-gold-soft/40 rounded-full mb-5 group-hover:w-12 transition-all duration-500' />
								<h3 className='font-serif text-xl text-icyWhite mb-3 relative'>
									{t(`process.${key}.title`)}
								</h3>
								<p className='text-icyWhite/55 text-sm leading-relaxed relative'>
									{t(`process.${key}.desc`)}
								</p>
							</motion.div>
						))}
					</div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.4, duration: 0.6 }}
						className='mt-14 max-w-3xl mx-auto p-7 rounded-3xl border border-gold-soft/10 bg-gold-soft/[0.02] backdrop-blur-sm'
					>
						<p className='text-icyWhite/65 text-sm leading-relaxed text-center'>
							{t('process.expectation')}
						</p>
					</motion.div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={2} />

			{/* ── 8. TEAM SPOTLIGHT — cinematic cards ── */}
			<section
				id='team'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='team-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='team-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('team.title')}
						</motion.h2>
						<motion.p variants={fadeUp} className='text-icyWhite/50 text-lg'>
							{t('team.subtitle')}
						</motion.p>
					</motion.div>

					<div className='relative'>
						<div
							ref={sliderRef}
							className='flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
						>
							{/* Natalie card */}
							<motion.article
								initial={{ opacity: 0, y: 32 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
								className='shrink-0 w-[320px] sm:w-[380px] snap-center rounded-3xl overflow-hidden glass-card group'
							>
								<div className='relative aspect-[3/4] overflow-hidden'>
									<Image
										src={IMG.portrait2}
										alt={t('team.natalie.name')}
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-700'
										sizes='380px'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/30 to-transparent' />
									<div className='absolute bottom-0 left-0 right-0 p-7'>
										<h3 className='font-serif text-2xl text-icyWhite'>
											{t('team.natalie.name')}
										</h3>
										<p className='text-gold-soft/80 text-sm mt-1'>
											{t('team.natalie.role')}
										</p>
									</div>
								</div>
								<div className='p-7'>
									<p className='text-icyWhite/40 text-xs tracking-[0.15em] uppercase mb-3'>
										{t('team.natalie.specialty')}
									</p>
									<p className='text-icyWhite/65 text-sm leading-relaxed'>
										{t('team.natalie.bio')}
									</p>
								</div>
							</motion.article>

							{/* Workspace card */}
							<motion.article
								initial={{ opacity: 0, y: 32 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									delay: 0.12,
									duration: 0.7,
									ease: [0.22, 1, 0.36, 1],
								}}
								className='shrink-0 w-[320px] sm:w-[380px] snap-center rounded-3xl overflow-hidden glass-card group'
							>
								<div className='relative aspect-[3/4] overflow-hidden'>
									<Image
										src={IMG.comfort}
										alt={t('team.workspace.title')}
										fill
										className='object-cover group-hover:scale-105 transition-transform duration-700'
										sizes='380px'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/30 to-transparent' />
									<div className='absolute bottom-0 left-0 right-0 p-7'>
										<h3 className='font-serif text-xl text-icyWhite'>
											{t('team.workspace.title')}
										</h3>
									</div>
								</div>
								<div className='p-7'>
									<p className='text-icyWhite/65 text-sm leading-relaxed'>
										{t('team.workspace.desc')}
									</p>
								</div>
							</motion.article>
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-11 h-11 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/50 hover:text-gold-soft hover:border-gold-soft/30 transition-all duration-300 backdrop-blur-sm'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-11 h-11 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/50 hover:text-gold-soft hover:border-gold-soft/30 transition-all duration-300 backdrop-blur-sm'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={0} />

			{/* ── 9. HYGIENE & SAFETY — bento grid ── */}
			<section
				id='hygiene'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='hygiene-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/50 via-nearBlack/80 to-nearBlack/50' />

				<div className='relative max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='hygiene-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('hygiene.title')}
						</motion.h2>
						<motion.p variants={fadeUp} className='text-icyWhite/50 text-lg'>
							{t('hygiene.subtitle')}
						</motion.p>
					</motion.div>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-5'>
						{HYGIENE_ITEMS.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 28 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-40px' }}
								transition={{
									delay: i * 0.08,
									duration: 0.6,
									ease: [0.22, 1, 0.36, 1],
								}}
								className='relative p-7 rounded-3xl glass-card group hover:shadow-card-hover transition-all duration-500'
							>
								<div className='w-12 h-12 rounded-xl bg-gold-soft/10 flex items-center justify-center mb-5 group-hover:bg-gold-soft/20 group-hover:scale-110 transition-all duration-500'>
									<Icon className='w-6 h-6 text-gold-soft/80' aria-hidden />
								</div>
								<h3 className='text-icyWhite font-semibold text-sm mb-2'>
									{t(`hygiene.${key}.title`)}
								</h3>
								<p className='text-icyWhite/45 text-xs leading-relaxed'>
									{t(`hygiene.${key}.desc`)}
								</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={1} />

			{/* ── 10. TESTIMONIALS — elegant scroll ── */}
			<section
				id='testimonials'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='testimonials-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='testimonials-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('testimonials.title')}
						</motion.h2>
						<motion.p variants={fadeUp} className='text-icyWhite/50 text-lg'>
							{t('testimonials.subtitle')}
						</motion.p>
					</motion.div>

					<div className='relative'>
						<div
							ref={testimonialRef}
							className='flex gap-5 overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
						>
							{TESTIMONIALS.map((key, i) => (
								<motion.blockquote
									key={key}
									initial={{ opacity: 0, y: 28 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										delay: i * 0.06,
										duration: 0.6,
										ease: [0.22, 1, 0.36, 1],
									}}
									className='group shrink-0 w-[300px] sm:w-[380px] snap-center overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-6 sm:p-7 transition-all duration-300 hover:border-gold-soft/25 hover:shadow-[0_0_28px_-8px_rgba(232,184,0,0.15)]'
								>
									<div className='flex gap-1 mb-4'>
										{Array.from({ length: 5 }).map((_, si) => (
											<Star
												key={si}
												className='w-4 h-4 text-gold-soft fill-gold-soft'
											/>
										))}
									</div>
									<p className='text-icyWhite/78 text-sm leading-relaxed mb-5 italic whitespace-pre-wrap'>
										&ldquo;{t(`testimonials.${key}.text`)}&rdquo;
									</p>
									<footer className='pt-4 border-t border-white/[0.06] space-y-2'>
										<div className='flex items-start justify-between gap-3'>
											<div className='min-w-0'>
												<span className='text-icyWhite/85 text-xs font-semibold block'>
													{t(`testimonials.${key}.author`)}
												</span>
												<span className='text-icyWhite/40 text-[10px] leading-snug block mt-0.5'>
													{t(`testimonials.${key}.meta`)}
												</span>
											</div>
											<span className='text-gold-soft/50 text-[10px] shrink-0 text-right max-w-[40%]'>
												{t(`testimonials.${key}.service`)}
											</span>
										</div>
									</footer>
								</motion.blockquote>
							))}
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-11 h-11 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/50 hover:text-gold-soft hover:border-gold-soft/30 transition-all duration-300 backdrop-blur-sm'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-11 h-11 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/50 hover:text-gold-soft hover:border-gold-soft/30 transition-all duration-300 backdrop-blur-sm'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={2} />

			{/* ── 11. FAQ ── */}
			<section
				id='faq'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='faq-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/50 via-nearBlack/80 to-nearBlack/50' />
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
				/>
				<div className='relative max-w-3xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='faq-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('faq.title')}
						</motion.h2>
						<motion.p variants={fadeUp} className='text-icyWhite/50 text-lg'>
							{t('faq.subtitle')}
						</motion.p>
					</motion.div>

					<Accordion type='single' collapsible className='space-y-3'>
						{FAQ_ITEMS.map((key, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.04, duration: 0.5 }}
							>
								<AccordionItem
									value={key}
									className='rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 overflow-hidden backdrop-blur-sm hover:border-white/[0.1] transition-colors duration-300'
								>
									<AccordionTrigger className='text-icyWhite text-left text-sm font-medium py-5 [&>svg]:text-gold-soft'>
										{t(`faq.${key}.q`)}
									</AccordionTrigger>
									<AccordionContent className='text-icyWhite/60 text-sm leading-relaxed'>
										{t(`faq.${key}.a`)}
									</AccordionContent>
								</AccordionItem>
							</motion.div>
						))}
					</Accordion>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={0} />

			{/* ── 12. CONTACT ── */}
			<section
				id='contact'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='contact-heading'
			>
				<div className='max-w-5xl mx-auto'>
					<motion.header
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-14'
					>
						<motion.h2
							variants={fadeUp}
							id='contact-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-3'
						>
							{t('contact.title')}
						</motion.h2>
						<motion.p
							variants={fadeUp}
							className='text-icyWhite/50 text-sm sm:text-base max-w-md mx-auto'
						>
							{t('contact.subtitle')}
						</motion.p>
					</motion.header>

					<div className='grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-start'>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
							className='space-y-0'
						>
							<div className='rounded-3xl overflow-hidden ring-1 ring-white/[0.06]'>
								<iframe
									src={SITE_CONFIG.googleMapsEmbed}
									className='w-full aspect-[4/3] sm:aspect-[16/10] border-0'
									allowFullScreen
									loading='lazy'
									referrerPolicy='no-referrer-when-downgrade'
									title={t('contact.mapTitle')}
								/>
							</div>
							<div className='mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 rounded-2xl glass-card'>
								<div className='flex items-start gap-3 min-w-0'>
									<MapPin className='w-5 h-5 text-gold-soft shrink-0 mt-0.5' />
									<div>
										<p className='text-icyWhite font-medium text-sm'>
											{SITE_CONFIG.addressSubtitle}
										</p>
										<p className='text-icyWhite/50 text-sm mt-0.5'>
											{SITE_CONFIG.address}
										</p>
									</div>
								</div>
								<a
									href={SITE_CONFIG.googleMaps}
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center gap-2 shrink-0 px-5 py-2.5 rounded-xl bg-gold-soft/10 text-gold-soft text-sm font-medium hover:bg-gold-soft/20 transition-colors duration-300'
								>
									<Navigation className='w-4 h-4' />
									{tCommon('getDirections')}
								</a>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.1, duration: 0.6 }}
							className='lg:sticky lg:top-24'
						>
							<div className='rounded-3xl glass-card p-7'>
								<p className='flex items-center gap-2 text-icyWhite/40 text-xs uppercase tracking-[0.15em] mb-5'>
									<Clock className='w-4 h-4 text-gold-soft/60' />
									{t('contact.hours')}
								</p>

								<div className='space-y-2 mb-6'>
									<a
										href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
										className='flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-300 group'
									>
										<span className='flex w-10 h-10 items-center justify-center rounded-xl bg-gold-soft/10 text-gold-soft group-hover:bg-gold-soft/20 transition-colors'>
											<Phone className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-gold-soft transition-colors'>
											{SITE_CONFIG.phone}
										</span>
									</a>
									<a
										href={SITE_CONFIG.whatsapp}
										target='_blank'
										rel='noopener noreferrer'
										className='flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-300 group'
									>
										<span className='flex w-10 h-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] group-hover:bg-[#25D366]/20 transition-colors'>
											<MessageCircle className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-[#25D366] transition-colors'>
											WhatsApp
										</span>
									</a>
									<a
										href={`mailto:${SITE_CONFIG.email}`}
										className='flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-300 group'
									>
										<span className='flex w-10 h-10 items-center justify-center rounded-xl bg-gold-soft/10 text-gold-soft group-hover:bg-gold-soft/20 transition-colors'>
											<Mail className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium truncate group-hover:text-gold-soft transition-colors'>
											{SITE_CONFIG.email}
										</span>
									</a>
								</div>

								<div className='flex items-center gap-2.5 mb-6'>
									<a
										href={SITE_CONFIG.instagram}
										target='_blank'
										rel='noopener noreferrer'
										className='flex w-10 h-10 items-center justify-center rounded-xl bg-white/[0.04] text-[#E4405F] hover:bg-[#E4405F]/15 transition-colors duration-300'
										aria-label='Instagram'
									>
										<Instagram className='w-5 h-5' />
									</a>
									<a
										href={SITE_CONFIG.facebook}
										target='_blank'
										rel='noopener noreferrer'
										className='flex w-10 h-10 items-center justify-center rounded-xl bg-white/[0.04] text-[#1877F2] hover:bg-[#1877F2]/15 transition-colors duration-300'
										aria-label='Facebook'
									>
										<Facebook className='w-5 h-5' />
									</a>
								</div>

								<div className='h-px bg-white/[0.06] my-5' />

								<Dialog>
									<DialogTrigger asChild>
										<button
											type='button'
											className='w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gold-soft text-nearBlack font-semibold text-sm tracking-wide hover:bg-gold-soft/90 focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack transition-all duration-300'
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
												initial={{ opacity: 0, scale: 0.95 }}
												animate={{ opacity: 1, scale: 1 }}
												className='p-8 rounded-2xl border border-gold-soft/20 bg-gold-soft/[0.04] text-center'
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
														htmlFor='dlg-name'
														className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
													>
														{t('contact.nameLabel')}
													</label>
													<Input
														id='dlg-name'
														type='text'
														required
														placeholder={t('contact.namePlaceholder')}
													/>
												</div>
												<div className='grid sm:grid-cols-2 gap-3'>
													<div>
														<label
															htmlFor='dlg-email'
															className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
														>
															{t('contact.emailLabel')}
														</label>
														<Input
															id='dlg-email'
															type='email'
															required
															placeholder={t('contact.emailPlaceholder')}
														/>
													</div>
													<div>
														<label
															htmlFor='dlg-phone'
															className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
														>
															{t('contact.phoneLabel')}
														</label>
														<Input
															id='dlg-phone'
															type='tel'
															placeholder={t('contact.phonePlaceholder')}
														/>
													</div>
												</div>
												<div>
													<label
														htmlFor='dlg-msg'
														className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'
													>
														{t('contact.messageLabel')}
													</label>
													<Textarea
														id='dlg-msg'
														rows={4}
														required
														placeholder={t('contact.messagePlaceholder')}
													/>
												</div>
												<button
													type='submit'
													className='w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-wider uppercase hover:bg-gold-soft/25 hover:shadow-glow transition-all duration-300'
												>
													<Send className='w-4 h-4' />
													{t('contact.submit')}
												</button>
											</form>
										)}
									</DialogContent>
								</Dialog>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			<SectionDivider variant='depilation' pattern={1} />

			{/* ── 13. FINAL BOOKING CTA — dramatic ── */}
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
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true }}
					>
						<motion.span
							initial={{ width: 0 }}
							whileInView={{ width: 48 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
							className='block h-px bg-gold-soft/40 mx-auto mb-10'
						/>
						<motion.h2
							variants={fadeUp}
							id='booking-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-6'
						>
							{t('reserveTitle')}
						</motion.h2>
						<motion.p
							variants={fadeUp}
							className='text-icyWhite/60 mb-12 leading-relaxed text-lg max-w-xl mx-auto'
						>
							{t.rich('reserveDesc', richStudioBrand)}
						</motion.p>
						<motion.div
							variants={fadeUp}
							className='grid w-full max-w-xl mx-auto grid-cols-1 sm:grid-cols-2 gap-4'
						>
							<Link
								href={`/${locale}/depilation/booking`}
								className='group inline-flex w-full min-h-[3.5rem] items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft text-sm font-semibold tracking-wider uppercase hover:bg-gold-soft/25 hover:border-gold-soft/60 hover:shadow-glow transition-all duration-500'
							>
								{t('bookNow')}
								<ChevronRight className='w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform' />
							</Link>
							<a
								href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
								className='inline-flex w-full min-h-[3.5rem] items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/10 text-icyWhite/60 text-sm font-semibold tracking-wider uppercase hover:border-gold-soft/30 hover:text-gold-soft/80 transition-all duration-500'
							>
								<Phone className='w-4 h-4 shrink-0' />
								{t('callNow')}
							</a>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* ── 14. FOOTER ── */}
			<footer className='border-t border-white/[0.04] px-6 lg:px-8 py-14 max-md:pb-[calc(7rem+env(safe-area-inset-bottom,0px))]'>
				<div className='max-w-6xl mx-auto'>
					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12'>
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
							<p className='text-icyWhite/35 text-xs mt-4 leading-relaxed'>
								{t('footer.tagline')}
							</p>
						</div>

						<div>
							<h4 className='text-icyWhite/40 text-xs uppercase tracking-[0.15em] mb-4'>
								{t('footer.navTitle')}
							</h4>
							<ul className='space-y-2.5'>
								{[
									{ href: '#services', label: t('serviceMenu.title') },
									{ href: '#team', label: t('team.title') },
									{ href: '#faq', label: t('faq.title') },
									{ href: '#contact', label: t('contact.title') },
								].map(link => (
									<li key={link.href}>
										<a
											href={link.href}
											className='text-icyWhite/50 hover:text-gold-soft text-sm transition-colors duration-300'
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						<div>
							<h4 className='text-icyWhite/40 text-xs uppercase tracking-[0.15em] mb-4'>
								{t('contact.title')}
							</h4>
							<ul className='space-y-2.5 text-sm'>
								<li>
									<a
										href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
										className='text-icyWhite/50 hover:text-gold-soft transition-colors duration-300'
									>
										{SITE_CONFIG.phone}
									</a>
								</li>
								<li>
									<a
										href={`mailto:${SITE_CONFIG.email}`}
										className='text-icyWhite/50 hover:text-gold-soft transition-colors duration-300'
									>
										{SITE_CONFIG.email}
									</a>
								</li>
								<li className='text-icyWhite/30'>{SITE_CONFIG.address}</li>
							</ul>
						</div>

						<div>
							<h4 className='text-icyWhite/40 text-xs uppercase tracking-[0.15em] mb-4'>
								{t('footer.socialTitle')}
							</h4>
							<div className='flex items-center gap-3'>
								<a
									href={SITE_CONFIG.instagram}
									target='_blank'
									rel='noopener noreferrer'
									className='flex w-10 h-10 items-center justify-center rounded-xl bg-white/[0.04] text-icyWhite/40 hover:text-[#E4405F] hover:bg-[#E4405F]/10 transition-all duration-300'
									aria-label='Instagram'
								>
									<Instagram className='w-5 h-5' />
								</a>
								<a
									href={SITE_CONFIG.facebook}
									target='_blank'
									rel='noopener noreferrer'
									className='flex w-10 h-10 items-center justify-center rounded-xl bg-white/[0.04] text-icyWhite/40 hover:text-[#1877F2] hover:bg-[#1877F2]/10 transition-all duration-300'
									aria-label='Facebook'
								>
									<Facebook className='w-5 h-5' />
								</a>
								<a
									href={SITE_CONFIG.whatsapp}
									target='_blank'
									rel='noopener noreferrer'
									className='flex w-10 h-10 items-center justify-center rounded-xl bg-white/[0.04] text-icyWhite/40 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-300'
									aria-label='WhatsApp'
								>
									<MessageCircle className='w-5 h-5' />
								</a>
							</div>
						</div>
					</div>

					<div className='border-t border-white/[0.04] pt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4'>
						<p className='text-icyWhite/25 text-xs max-sm:text-center max-sm:w-full'>
							&copy; {new Date().getFullYear()} V2Studio. {t('footer.rights')}
						</p>
						<div className='flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2 max-sm:w-full'>
							<Link
								href={`/${locale}/privacy`}
								className='text-icyWhite/25 hover:text-icyWhite/40 text-xs transition-colors duration-300'
							>
								{t('footer.privacy')}
							</Link>
							<Link
								href={`/${locale}/cookies`}
								className='text-icyWhite/25 hover:text-icyWhite/40 text-xs transition-colors duration-300'
							>
								{t('footer.cookies')}
							</Link>
							<button
								type='button'
								onClick={openPreferences}
								className='text-icyWhite/25 hover:text-icyWhite/40 text-xs transition-colors duration-300'
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
