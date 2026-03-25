'use client'

import GlowText from '@/components/GlowText'
import Navbar from '@/components/Navbar'
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
import { SITE_CONFIG } from '@/lib/site-config'
import {
	motion,
	useMotionValueEvent,
	useScroll,
	useTransform,
} from 'framer-motion'
import {
	ArrowDown,
	Award,
	BadgeCheck,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Facebook,
	Heart,
	Instagram,
	Mail,
	MapPin,
	MessageCircle,
	Navigation,
	Phone,
	Send,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
	ThermometerSun,
	Trophy,
	Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useRef, useState } from 'react'

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
	{ key: 'valueHygiene' as const, icon: Shield },
	{ key: 'valueDelicacy' as const, icon: Heart },
	{ key: 'valueIndividual' as const, icon: Users },
	{ key: 'valueService' as const, icon: Sparkles },
	{ key: 'valueAtmosphere' as const, icon: Calendar },
]

const ACHIEVEMENTS = [
	{ key: 'achievement1' as const, icon: Trophy },
	{ key: 'achievement2' as const, icon: Award },
	{ key: 'achievement3' as const, icon: BadgeCheck },
	{ key: 'achievement4' as const, icon: Sparkles },
	{ key: 'achievement5' as const, icon: Star },
]

const TRUST_ITEMS = [
	'trustYears',
	'trustChampion',
	'trustMedical',
	'trustTechniques',
	'trustClients',
] as const

const SERVICE_ZONES = [
	{
		key: 'face' as const,
		items: [
			{ key: 'sugaringUpperLip', duration: 10, price: 8 },
			{ key: 'sugaringFullFace', duration: 20, price: 15 },
			{ key: 'waxUpperLip', duration: 10, price: 8 },
			{ key: 'waxEyebrow', duration: 15, price: 10 },
			{ key: 'electroFace', duration: 15, price: 18 },
		],
	},
	{
		key: 'body' as const,
		items: [
			{ key: 'sugaringUnderarms', duration: 15, price: 10 },
			{ key: 'sugaringFullArms', duration: 25, price: 18 },
			{ key: 'sugaringFullLegs', duration: 40, price: 25 },
			{ key: 'waxFullLegs', duration: 40, price: 25 },
			{ key: 'bioFullBody', duration: 60, price: 45 },
			{ key: 'laserFullLegs', duration: 45, price: 50 },
		],
	},
	{
		key: 'intimate' as const,
		items: [
			{ key: 'sugaringClassicBikini', duration: 20, price: 15 },
			{ key: 'sugaringDeepBikini', duration: 30, price: 25 },
			{ key: 'waxClassicBikini', duration: 20, price: 15 },
			{ key: 'waxDeepBikini', duration: 30, price: 25 },
		],
	},
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

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
	hidden: { opacity: 0, y: 28 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
	},
}
const fadeIn = {
	hidden: { opacity: 0 },
	show: { opacity: 1, transition: { duration: 0.7 } },
}
const scaleUp = {
	hidden: { opacity: 0, scale: 0.92 },
	show: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
	},
}

export default function DepilationPage() {
	const t = useTranslations('depilation')
	const tCommon = useTranslations('common')
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const sliderRef = useRef<HTMLDivElement>(null)
	const testimonialRef = useRef<HTMLDivElement>(null)
	const [contactSent, setContactSent] = useState(false)

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

	const trustContent = TRUST_ITEMS.map(key => t(`trust.${key}`))
	const duplicatedTrust = [...trustContent, ...trustContent]

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
				className='md:hidden fixed bottom-6 left-6 right-6 z-40'
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
				className='relative h-[100dvh] flex flex-col overflow-hidden noise-overlay'
				aria-labelledby='depilation-hero'
			>
				{/* Parallax background */}
				<motion.div className='absolute inset-0' style={{ y: heroImgY }}>
					<Image
						src={IMG.portrait}
						alt=''
						fill
						className='object-cover scale-110'
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
					{t('heroBadge')}
				</motion.p>

				{/* Main hero content */}
				<motion.div
					style={{ opacity: heroOpacity }}
					className='relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-6 overflow-hidden'
				>
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
						className='text-center'
					>
						<div className='flex justify-center mb-14 sm:mb-0'>
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
							{t('hero')}
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
							<a
								href='#services'
								className='inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/10 text-icyWhite/60 text-sm font-medium tracking-wider uppercase hover:border-gold-soft/30 hover:text-gold-soft/80 transition-all duration-500'
							>
								{t('heroPricesButton')}
							</a>
						</motion.div>
					</motion.div>

					{/* Scroll indicator */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: heroScrolled ? 0 : 1 }}
						transition={{ duration: 0.4 }}
						className='absolute bottom-6 sm:bottom-16 left-1/2 -translate-x-1/2'
					>
						<motion.div
							animate={{ y: [0, 8, 0] }}
							transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
						>
							<ArrowDown className='w-5 h-5 text-gold-soft/40' />
						</motion.div>
					</motion.div>
				</motion.div>

				{/* Trust bar — infinite marquee, anchored to bottom */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.2, duration: 0.6 }}
					className='relative z-10 mt-auto shrink-0 py-4 border-t border-white/[0.06] bg-nearBlack/70 backdrop-blur-md overflow-hidden'
					aria-label={t('trustBarLabel')}
				>
					<div className='marquee-track'>
						{duplicatedTrust.map((text, i) => (
							<span
								key={i}
								className='flex items-center gap-3 sm:gap-4 px-4 sm:px-6 shrink-0'
							>
								<span
									className='w-1 h-1 rounded-full bg-gold-soft/50'
									aria-hidden
								/>
								<span className='text-gold-soft/70 text-[11px] sm:text-xs tracking-[0.2em] uppercase whitespace-nowrap font-medium'>
									{text}
								</span>
							</span>
						))}
					</div>
				</motion.div>
			</section>

			{/* ── 2. ABOUT ME — editorial split layout ── */}
			<section
				id='about'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='about-heading'
			>
				{/* Subtle ambient glow */}
				<div className='absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold-soft/[0.02] blur-[150px] pointer-events-none' />

				<div className='max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
						<motion.div
							initial={{ opacity: 0, x: -40, scale: 0.96 }}
							whileInView={{ opacity: 1, x: 0, scale: 1 }}
							viewport={{ once: true, margin: '-80px' }}
							transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
							className='relative'
						>
							<div className='relative aspect-[3/4] rounded-3xl overflow-hidden'>
								<Image
									src={IMG.about}
									alt='Natalie Volik'
									fill
									className='object-cover'
									sizes='(max-width: 1024px) 100vw, 50vw'
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
						>
							<motion.h2
								id='about-heading'
								variants={fadeUp}
								className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-8'
							>
								{t('aboutTitle')}
							</motion.h2>
							<motion.p
								variants={fadeUp}
								className='text-gold-soft/90 text-lg sm:text-xl font-medium leading-relaxed mb-5'
							>
								{t('aboutIntro')}
							</motion.p>
							<motion.p
								variants={fadeUp}
								className='text-icyWhite/70 leading-relaxed mb-4'
							>
								{t('aboutJourney')}
							</motion.p>
							<motion.div
								variants={fadeUp}
								className='my-6 p-4 rounded-2xl glass-card'
							>
								<p className='text-gold-soft/80 font-medium text-sm tracking-wide'>
									{t('aboutExpertise')}
								</p>
							</motion.div>
							<motion.p
								variants={fadeUp}
								className='text-icyWhite/65 leading-relaxed mb-4'
							>
								{t('aboutMedical')}
							</motion.p>
							<motion.p
								variants={fadeUp}
								className='text-icyWhite/60 leading-relaxed italic'
							>
								{t('aboutContinuous')}
							</motion.p>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ── 3. PHILOSOPHY — immersive quote ── */}
			<section
				id='philosophy'
				className='relative py-24 sm:py-32 lg:py-40 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='philosophy-heading'
			>
				{/* Gradient backdrop */}
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack via-nearBlack/95 to-nearBlack' />
				<div className='absolute inset-0 overflow-hidden pointer-events-none'>
					<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-gold-soft/[0.03] blur-[150px]' />
				</div>

				<div className='relative max-w-4xl mx-auto text-center'>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
					>
						<motion.span
							initial={{ width: 0 }}
							whileInView={{ width: 64 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className='block h-px bg-gold-soft/40 mx-auto mb-10'
						/>
						<h2
							id='philosophy-heading'
							className='font-serif text-2xl md:text-3xl text-icyWhite/50 mb-8 tracking-wide'
						>
							{t('philosophyTitle')}
						</h2>
						<blockquote className='font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-gold-soft/90 leading-snug sm:leading-relaxed'>
							&ldquo;{t('philosophyQuote')}&rdquo;
						</blockquote>
						<motion.span
							initial={{ width: 0 }}
							whileInView={{ width: 64 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6, delay: 0.4 }}
							className='block h-px bg-gold-soft/40 mx-auto mt-10'
						/>
					</motion.div>
				</div>
			</section>

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
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('howIHelpTitle')}
						</motion.h2>
						<motion.p variants={fadeUp} className='text-icyWhite/50 text-lg'>
							{t('howIHelpIntro')}
						</motion.p>
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

			{/* ── 5. ACHIEVEMENTS — horizontal scroll cards ── */}
			<section
				id='achievements'
				className='relative py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8 overflow-hidden'
				aria-labelledby='achievements-heading'
			>
				<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/50 via-nearBlack/80 to-nearBlack/50' />

				<div className='relative max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-20 items-center'>
						<motion.div
							initial={{ opacity: 0, x: -40 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true, margin: '-60px' }}
							transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
							className='relative order-2 lg:order-1'
						>
							<div className='relative aspect-[4/3] rounded-3xl overflow-hidden'>
								<Image
									src={IMG.certificate}
									alt=''
									fill
									className='object-cover'
									sizes='(max-width: 1024px) 100vw, 50vw'
								/>
								<div className='absolute inset-0 bg-gradient-to-tr from-nearBlack/50 to-transparent' />
							</div>
						</motion.div>

						<motion.div
							variants={stagger}
							initial='hidden'
							whileInView='show'
							viewport={{ once: true, margin: '-60px' }}
							className='order-1 lg:order-2'
						>
							<motion.h2
								variants={fadeUp}
								id='achievements-heading'
								className='font-serif text-4xl sm:text-5xl text-icyWhite mb-10'
							>
								{t('achievementsTitle')}
							</motion.h2>
							<div className='space-y-3'>
								{ACHIEVEMENTS.map(({ key, icon: Icon }) => (
									<motion.div
										key={key}
										variants={fadeUp}
										className='flex items-center gap-4 p-4 rounded-xl glass-card group hover:border-gold-soft/20 transition-all duration-400'
									>
										<div className='w-10 h-10 rounded-lg bg-gold-soft/10 flex items-center justify-center shrink-0 group-hover:bg-gold-soft/20 transition-colors'>
											<Icon className='w-5 h-5 text-gold-soft/80' aria-hidden />
										</div>
										<p className='text-icyWhite/80 text-sm font-medium'>
											{t(key)}
										</p>
									</motion.div>
								))}
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ── 6. SERVICE MENU — premium card grid ── */}
			<section
				id='services'
				className='py-20 sm:py-28 lg:py-36 px-5 sm:px-6 lg:px-8'
				aria-labelledby='services-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.div
						variants={stagger}
						initial='hidden'
						whileInView='show'
						viewport={{ once: true, margin: '-60px' }}
						className='text-center mb-16'
					>
						<motion.h2
							variants={fadeUp}
							id='services-heading'
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('serviceMenu.title')}
						</motion.h2>
						<motion.p
							variants={fadeUp}
							className='text-icyWhite/50 max-w-2xl mx-auto text-lg'
						>
							{t('serviceMenu.subtitle')}
						</motion.p>
					</motion.div>

					<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
						{SERVICE_ZONES.map(({ key: zoneKey, items }, zi) => (
							<motion.div
								key={zoneKey}
								initial={{ opacity: 0, y: 40 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-40px' }}
								transition={{
									delay: zi * 0.12,
									duration: 0.7,
									ease: [0.22, 1, 0.36, 1],
								}}
								className='rounded-3xl glass-card overflow-hidden group'
							>
								<div className='px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]'>
									<h3 className='font-serif text-2xl text-icyWhite'>
										{t(`serviceMenu.zone.${zoneKey}`)}
									</h3>
								</div>
								<ul className='divide-y divide-white/[0.04]'>
									{items.map(item => {
										const title = t(`serviceMenu.items.${item.key}.name`)
										return (
											<li
												key={item.key}
												className='px-6 py-4 hover:bg-white/[0.03] transition-colors duration-300'
											>
												<div className='flex items-start justify-between gap-3'>
													<div className='min-w-0'>
														<p className='text-icyWhite font-medium text-sm'>
															{title}
														</p>
														<p className='text-icyWhite/45 text-xs mt-1 leading-relaxed'>
															{t(`serviceMenu.items.${item.key}.desc`)}
														</p>
													</div>
													<div className='shrink-0 text-right'>
														<p className='text-gold-soft font-semibold text-sm'>
															{t('serviceMenu.from')} {item.price} &euro;
														</p>
														<p className='text-icyWhite/35 text-xs flex items-center justify-end gap-1 mt-0.5'>
															<Clock className='w-3 h-3' />
															{item.duration} {t('serviceMenu.min')}
														</p>
													</div>
												</div>
												<Link
													href={`/${locale}/depilation/booking?service=${encodeURIComponent(title)}&duration=${item.duration}`}
													className='inline-flex items-center gap-1 text-gold-soft/60 hover:text-gold-soft text-xs tracking-wider uppercase mt-2.5 transition-colors duration-300'
												>
													{t('serviceMenu.book')}
													<ChevronRight className='w-3 h-3' />
												</Link>
											</li>
										)
									})}
								</ul>
							</motion.div>
						))}
					</div>
				</div>
			</section>

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
							className='font-serif text-4xl sm:text-5xl md:text-6xl text-icyWhite mb-4'
						>
							{t('process.title')}
						</motion.h2>
						<motion.p
							variants={fadeUp}
							className='text-icyWhite/50 max-w-2xl mx-auto text-lg'
						>
							{t('process.subtitle')}
						</motion.p>
					</motion.div>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{PROCESS_STEPS.map(({ key, step }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 32 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: '-40px' }}
								transition={{
									delay: i * 0.1,
									duration: 0.6,
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
							className='flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
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
									className='shrink-0 w-[300px] sm:w-[360px] snap-center p-7 rounded-3xl glass-card'
								>
									<div className='flex gap-1 mb-5'>
										{Array.from({ length: 5 }).map((_, si) => (
											<Star
												key={si}
												className='w-4 h-4 text-gold-soft fill-gold-soft'
											/>
										))}
									</div>
									<p className='text-icyWhite/75 text-sm leading-relaxed mb-5 italic'>
										&ldquo;{t(`testimonials.${key}.text`)}&rdquo;
									</p>
									<footer className='flex items-center justify-between pt-4 border-t border-white/[0.06]'>
										<span className='text-icyWhite/60 text-xs font-semibold'>
											{t(`testimonials.${key}.author`)}
										</span>
										<span className='text-gold-soft/40 text-xs'>
											{t(`testimonials.${key}.service`)}
										</span>
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
													<input
														id='dlg-name'
														type='text'
														required
														className='w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-icyWhite text-sm placeholder:text-icyWhite/25 focus:border-gold-soft/40 focus:outline-none transition-colors'
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
														<input
															id='dlg-email'
															type='email'
															required
															className='w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-icyWhite text-sm placeholder:text-icyWhite/25 focus:border-gold-soft/40 focus:outline-none transition-colors'
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
														<input
															id='dlg-phone'
															type='tel'
															className='w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-icyWhite text-sm placeholder:text-icyWhite/25 focus:border-gold-soft/40 focus:outline-none transition-colors'
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
													<textarea
														id='dlg-msg'
														rows={4}
														required
														className='w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-icyWhite text-sm placeholder:text-icyWhite/25 focus:border-gold-soft/40 focus:outline-none transition-colors resize-none'
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
							{t('reserveDesc')}
						</motion.p>
						<motion.div
							variants={fadeUp}
							className='flex flex-wrap justify-center gap-4'
						>
							<Link
								href={`/${locale}/depilation/booking`}
								className='group inline-flex items-center gap-2 px-10 py-4.5 rounded-2xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-semibold tracking-wider uppercase hover:bg-gold-soft/25 hover:border-gold-soft/60 hover:shadow-glow transition-all duration-500'
							>
								{t('bookNow')}
								<ChevronRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
							</Link>
							<a
								href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
								className='inline-flex items-center gap-2 px-8 py-4.5 rounded-2xl border border-white/10 text-icyWhite/60 font-medium hover:border-gold-soft/30 hover:text-gold-soft/80 transition-all duration-500'
							>
								<Phone className='w-4 h-4' />
								{t('callNow')}
							</a>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* ── 14. FOOTER ── */}
			<footer className='border-t border-white/[0.04] py-14 px-6 lg:px-8'>
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

					<div className='border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4'>
						<p className='text-icyWhite/25 text-xs'>
							&copy; {new Date().getFullYear()} V Studio. {t('footer.rights')}
						</p>
						<div className='flex items-center gap-6'>
							<a
								href='#'
								className='text-icyWhite/25 hover:text-icyWhite/40 text-xs transition-colors duration-300'
							>
								{t('footer.privacy')}
							</a>
							<a
								href='#'
								className='text-icyWhite/25 hover:text-icyWhite/40 text-xs transition-colors duration-300'
							>
								{t('footer.cookies')}
							</a>
						</div>
					</div>
				</div>
			</footer>
		</>
	)
}
