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
import { motion } from 'framer-motion'
import {
	Award,
	BadgeCheck,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	ExternalLink,
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
	'achievement1',
	'achievement2',
	'achievement3',
	'achievement4',
	'achievement5',
] as const

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

export default function DepilationPage() {
	const t = useTranslations('depilation')
	const tCommon = useTranslations('common')
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const sliderRef = useRef<HTMLDivElement>(null)
	const testimonialRef = useRef<HTMLDivElement>(null)
	const [contactSent, setContactSent] = useState(false)

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

			{/* Mobile floating Book Now */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 1 }}
				className='md:hidden fixed bottom-6 left-6 right-6 z-40'
			>
				<Link
					href={`/${locale}/depilation/booking`}
					className='flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gold-soft/90 text-nearBlack font-medium text-sm tracking-wider uppercase shadow-glow'
				>
					<Calendar className='w-4 h-4' />
					{t('bookNow')}
				</Link>
			</motion.div>

			{/* ── 1. HERO (single viewport) ── */}
			<section
				id='hero'
				className='relative h-screen flex flex-col overflow-hidden noise-overlay'
				aria-labelledby='depilation-hero'
			>
				<div className='absolute inset-0'>
					<Image
						src={IMG.portrait}
						alt=''
						fill
						className='object-cover opacity-50'
						priority
						sizes='100vw'
					/>
					<div className='absolute inset-0 bg-gradient-to-b from-nearBlack/80 via-nearBlack/60 to-nearBlack' />
				</div>

				<div className='relative z-10 flex-1 flex flex-col items-center justify-center px-6'>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7 }}
						className='text-center'
					>
						<p className='text-gold-soft/70 text-xs tracking-[0.3em] uppercase mb-2'>
							{t('heroBadge')}
						</p>
						<div className='flex justify-center mb-0'>
							<Image
								src='/images/Gemini_yellow2.png'
								alt='V2studio'
								width={180}
								height={200}
								className='h-20 sm:h-24 md:h-32 lg:h-36 w-auto drop-shadow-[0_0_30px_rgba(232,184,0,0.15)]'
								priority
							/>
						</div>

						<GlowText text={tCommon('depilation')} />

						<p className='-mt-1 text-gold-soft/90 text-sm tracking-wider uppercase'>
							{t('hero')}
						</p>
						<p className='mt-1 text-icyWhite/60 text-sm sm:text-base max-w-md mx-auto'>
							{t('heroSubtitle')}
						</p>

						<div className='mt-4 flex flex-wrap justify-center gap-3'>
							<Link
								href={`/${locale}/depilation/booking`}
								className='inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-soft text-sm font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300'
							>
								{t('heroBookButton')}
								<ChevronRight className='w-4 h-4' />
							</Link>
							<a
								href='#services'
								className='inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-icyWhite/70 text-sm font-medium tracking-wider uppercase hover:border-gold-soft/40 hover:text-gold-soft transition-all duration-300'
							>
								{t('heroPricesButton')}
							</a>
						</div>
					</motion.div>
				</div>

				{/* Trust bar pinned to bottom of hero viewport */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6, duration: 0.5 }}
					className='relative z-10 py-3 border-t border-white/5 bg-nearBlack/60 backdrop-blur-sm'
					aria-label={t('trustBarLabel')}
				>
					<div className='max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-1.5'>
						{TRUST_ITEMS.map((key, i) => (
							<span
								key={key}
								className='text-gold-soft/80 text-[10px] sm:text-xs lg:text-sm tracking-wider uppercase whitespace-nowrap'
							>
								{i > 0 && (
									<span
										className='text-white/20 mr-4 sm:mr-8 hidden sm:inline'
										aria-hidden
									>
										|
									</span>
								)}
								{t(`trust.${key}`)}
							</span>
						))}
					</div>
				</motion.div>
			</section>

			{/* ── 3. ABOUT ME ── */}
			<section
				id='about'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='about-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
						<motion.div
							initial={{ opacity: 0, x: -24 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className='relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10'
						>
							<Image
								src={IMG.about}
								alt='Natalie Volik'
								fill
								className='object-cover'
								sizes='(max-width: 1024px) 100vw, 50vw'
							/>
							<div className='absolute inset-0 bg-gradient-to-t from-nearBlack/40 to-transparent' />
						</motion.div>
						<div>
							<motion.h2
								id='about-heading'
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-6'
							>
								{t('aboutTitle')}
							</motion.h2>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className='text-icyWhite/80 leading-relaxed mb-4'
							>
								{t('aboutIntro')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className='text-icyWhite/70 leading-relaxed mb-4'
							>
								{t('aboutJourney')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className='text-icyWhite/70 leading-relaxed mb-4'
							>
								{t('aboutExpertise')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className='text-icyWhite/70 leading-relaxed'
							>
								{t('aboutMedical')} {t('aboutContinuous')}
							</motion.p>
						</div>
					</div>
				</div>
			</section>

			{/* ── 4. PHILOSOPHY ── */}
			<section
				id='philosophy'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='philosophy-heading'
			>
				<div className='max-w-4xl mx-auto text-center'>
					<motion.h2
						id='philosophy-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl md:text-4xl text-icyWhite mb-8'
					>
						{t('philosophyTitle')}
					</motion.h2>
					<motion.blockquote
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='font-serif text-2xl md:text-3xl lg:text-4xl text-gold-soft/95 leading-relaxed'
					>
						&ldquo;{t('philosophyQuote')}&rdquo;
					</motion.blockquote>
				</div>
			</section>

			{/* ── 5. HOW I CAN HELP ── */}
			<section
				id='how-i-help'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='how-i-help-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='how-i-help-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('howIHelpTitle')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('howIHelpIntro')}
					</motion.p>
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4'>
						{VALUES.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.06 }}
								className='p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-gold-soft/30 hover:bg-white/[0.04] transition-all duration-300'
							>
								<Icon className='w-8 h-8 text-gold-soft/90 mb-3' aria-hidden />
								<p className='text-icyWhite font-medium text-sm'>{t(key)}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ── 6. ACHIEVEMENTS ── */}
			<section
				id='achievements'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='achievements-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<div className='grid lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
						<motion.div
							initial={{ opacity: 0, x: -24 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className='relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 order-2 lg:order-1'
						>
							<Image
								src={IMG.certificate}
								alt=''
								fill
								className='object-cover'
								sizes='(max-width: 1024px) 100vw, 50vw'
							/>
						</motion.div>
						<div className='order-1 lg:order-2'>
							<motion.h2
								id='achievements-heading'
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-8 flex items-center gap-3'
							>
								<Award
									className='w-10 h-10 text-gold-soft shrink-0'
									aria-hidden
								/>
								{t('achievementsTitle')}
							</motion.h2>
							<ul className='space-y-3'>
								{ACHIEVEMENTS.map((key, i) => (
									<motion.li
										key={key}
										initial={{ opacity: 0, x: 16 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.05 }}
										className='flex items-start gap-3 text-icyWhite/80'
									>
										<span className='text-gold-soft shrink-0 mt-0.5'>✦</span>
										{t(key)}
									</motion.li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* ── 7. SERVICE MENU ── */}
			<section
				id='services'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='services-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='services-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('serviceMenu.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-14 max-w-2xl mx-auto'
					>
						{t('serviceMenu.subtitle')}
					</motion.p>

					<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
						{SERVICE_ZONES.map(({ key: zoneKey, items }, zi) => (
							<motion.div
								key={zoneKey}
								initial={{ opacity: 0, y: 32 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: zi * 0.1 }}
								className='rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden'
							>
								<div className='px-6 py-5 border-b border-white/10'>
									<h3 className='font-serif text-2xl text-icyWhite'>
										{t(`serviceMenu.zone.${zoneKey}`)}
									</h3>
								</div>
								<ul className='divide-y divide-white/5'>
									{items.map(item => {
										const title = t(`serviceMenu.items.${item.key}.name`)
										return (
											<li
												key={item.key}
												className='px-6 py-4 hover:bg-white/[0.02] transition-colors'
											>
												<div className='flex items-start justify-between gap-3'>
													<div className='min-w-0'>
														<p className='text-icyWhite font-medium text-sm'>
															{title}
														</p>
														<p className='text-icyWhite/50 text-xs mt-1'>
															{t(`serviceMenu.items.${item.key}.desc`)}
														</p>
													</div>
													<div className='shrink-0 text-right'>
														<p className='text-gold-soft font-medium text-sm'>
															{t('serviceMenu.from')} {item.price} &euro;
														</p>
														<p className='text-icyWhite/40 text-xs flex items-center justify-end gap-1 mt-0.5'>
															<Clock className='w-3 h-3' />
															{item.duration} {t('serviceMenu.min')}
														</p>
													</div>
												</div>
												<Link
													href={`/${locale}/depilation/booking?service=${encodeURIComponent(title)}&duration=${item.duration}`}
													className='inline-flex items-center gap-1 text-gold-soft/70 hover:text-gold-soft text-xs tracking-wider uppercase mt-2 transition-colors'
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

			{/* ── 8. RESULTS & PROCESS ── */}
			<section
				id='process'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='process-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='process-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('process.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-14 max-w-2xl mx-auto'
					>
						{t('process.subtitle')}
					</motion.p>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{PROCESS_STEPS.map(({ key, step }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.1 }}
								className='relative p-6 rounded-2xl border border-white/10 bg-white/[0.02]'
							>
								<span className='text-gold-soft/30 font-serif text-5xl absolute top-4 right-5'>
									{step}
								</span>
								<h3 className='font-serif text-xl text-icyWhite mb-3 relative'>
									{t(`process.${key}.title`)}
								</h3>
								<p className='text-icyWhite/60 text-sm leading-relaxed relative'>
									{t(`process.${key}.desc`)}
								</p>
							</motion.div>
						))}
					</div>

					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='mt-12 max-w-3xl mx-auto p-6 rounded-2xl border border-gold-soft/15 bg-gold-soft/[0.03]'
					>
						<p className='text-icyWhite/70 text-sm leading-relaxed text-center'>
							{t('process.expectation')}
						</p>
					</motion.div>
				</div>
			</section>

			{/* ── 9. TEAM SPOTLIGHT ── */}
			<section
				id='team'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='team-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='team-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('team.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('team.subtitle')}
					</motion.p>

					<div className='relative'>
						<div
							ref={sliderRef}
							className='flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 scrollbar-hide'
							style={{ scrollbarWidth: 'none' }}
						>
							{/* Natalie card */}
							<motion.article
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className='shrink-0 w-[320px] sm:w-[360px] snap-center rounded-2xl border border-white/10 bg-nearBlack/60 overflow-hidden'
							>
								<div className='relative aspect-[3/4]'>
									<Image
										src={IMG.portrait2}
										alt={t('team.natalie.name')}
										fill
										className='object-cover'
										sizes='360px'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent' />
									<div className='absolute bottom-0 left-0 right-0 p-6'>
										<h3 className='font-serif text-2xl text-icyWhite'>
											{t('team.natalie.name')}
										</h3>
										<p className='text-gold-soft/90 text-sm mt-1'>
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
							</motion.article>

							{/* Second portrait -- different angle */}
							<motion.article
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.1 }}
								className='shrink-0 w-[320px] sm:w-[360px] snap-center rounded-2xl border border-white/10 bg-nearBlack/60 overflow-hidden'
							>
								<div className='relative aspect-[3/4]'>
									<Image
										src={IMG.comfort}
										alt={t('team.natalie.name')}
										fill
										className='object-cover'
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
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-soft transition-colors'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(sliderRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-soft transition-colors'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			{/* ── 10. HYGIENE & SAFETY ── */}
			<section
				id='hygiene'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='hygiene-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='hygiene-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('hygiene.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('hygiene.subtitle')}
					</motion.p>

					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{HYGIENE_ITEMS.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.08 }}
								className='p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-gold-soft/25 transition-all duration-300'
							>
								<Icon className='w-8 h-8 text-gold-soft/90 mb-4' aria-hidden />
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

			{/* ── 11. TESTIMONIALS ── */}
			<section
				id='testimonials'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8'
				aria-labelledby='testimonials-heading'
			>
				<div className='max-w-6xl mx-auto'>
					<motion.h2
						id='testimonials-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('testimonials.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/60 text-center mb-12'
					>
						{t('testimonials.subtitle')}
					</motion.p>

					<div className='relative'>
						<div
							ref={testimonialRef}
							className='flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6'
							style={{ scrollbarWidth: 'none' }}
						>
							{TESTIMONIALS.map((key, i) => (
								<motion.blockquote
									key={key}
									initial={{ opacity: 0, y: 24 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ delay: i * 0.06 }}
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
									<footer className='flex items-center justify-between'>
										<span className='text-icyWhite/60 text-xs font-medium'>
											{t(`testimonials.${key}.author`)}
										</span>
										<span className='text-gold-soft/50 text-xs'>
											{t(`testimonials.${key}.service`)}
										</span>
									</footer>
								</motion.blockquote>
							))}
						</div>

						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'left')}
							className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-soft transition-colors'
							aria-label='Previous'
						>
							<ChevronLeft className='w-5 h-5' />
						</button>
						<button
							type='button'
							onClick={() => scrollSlider(testimonialRef, 'right')}
							className='absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 hidden lg:flex w-10 h-10 items-center justify-center rounded-full bg-nearBlack/80 border border-white/10 text-icyWhite/60 hover:text-gold-soft transition-colors'
							aria-label='Next'
						>
							<ChevronRight className='w-5 h-5' />
						</button>
					</div>
				</div>
			</section>

			{/* ── 12. FAQ ── */}
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
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite text-center mb-4'
					>
						{t('faq.title')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
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

			{/* ── 13. CONTACT ── */}
			<section
				id='contact'
				className='py-14 sm:py-20 lg:py-28 px-5 sm:px-6 lg:px-8 bg-nearBlack/40'
				aria-labelledby='contact-heading'
			>
				<div className='max-w-5xl mx-auto'>
					<motion.header
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
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

					<div className='grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-start'>
						{/* Map + address block */}
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							className='space-y-0'
						>
							<div className='rounded-2xl overflow-hidden ring-1 ring-white/10'>
								<iframe
									src={SITE_CONFIG.googleMapsEmbed}
									className='w-full aspect-[4/3] sm:aspect-[16/10] border-0'
									allowFullScreen
									loading='lazy'
									referrerPolicy='no-referrer-when-downgrade'
									title={t('contact.mapTitle')}
								/>
							</div>
							<div className='mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white/[0.03] ring-1 ring-white/10'>
								<div className='flex items-start gap-3 min-w-0'>
									<MapPin className='w-5 h-5 text-gold-soft shrink-0 mt-0.5' />
									<div>
										<p className='text-icyWhite font-medium text-sm'>{SITE_CONFIG.addressSubtitle}</p>
										<p className='text-icyWhite/60 text-sm mt-0.5'>{SITE_CONFIG.address}</p>
									</div>
								</div>
								<a
									href={SITE_CONFIG.googleMaps}
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-lg bg-gold-soft/15 text-gold-soft text-sm font-medium hover:bg-gold-soft/25 transition-colors'
								>
									<Navigation className='w-4 h-4' />
									{tCommon('getDirections')}
								</a>
							</div>
						</motion.div>

						{/* Contact panel — single card */}
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.05 }}
							className='lg:sticky lg:top-24'
						>
							<div className='rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-6'>
								<p className='flex items-center gap-2 text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
									<Clock className='w-4 h-4 text-gold-soft/70' />
									{t('contact.hours')}
								</p>

								<div className='space-y-2 mb-6'>
									<a
										href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-gold-soft/10 text-gold-soft group-hover:bg-gold-soft/20 transition-colors'>
											<Phone className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-gold-soft transition-colors'>{SITE_CONFIG.phone}</span>
									</a>
									<a
										href={SITE_CONFIG.whatsapp}
										target='_blank'
										rel='noopener noreferrer'
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366] group-hover:bg-[#25D366]/25 transition-colors'>
											<MessageCircle className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium group-hover:text-[#25D366] transition-colors'>WhatsApp</span>
									</a>
									<a
										href={`mailto:${SITE_CONFIG.email}`}
										className='flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.06] transition-colors group'
									>
										<span className='flex w-9 h-9 items-center justify-center rounded-lg bg-gold-soft/10 text-gold-soft group-hover:bg-gold-soft/20 transition-colors'>
											<Mail className='w-4 h-4' />
										</span>
										<span className='text-icyWhite text-sm font-medium truncate group-hover:text-gold-soft transition-colors'>{SITE_CONFIG.email}</span>
									</a>
								</div>

								<div className='flex items-center gap-2 mb-6'>
									<a
										href={SITE_CONFIG.instagram}
										target='_blank'
										rel='noopener noreferrer'
										className='flex w-10 h-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#E4405F] hover:bg-[#E4405F]/20 transition-colors'
										aria-label='Instagram'
									>
										<Instagram className='w-5 h-5' />
									</a>
									<a
										href={SITE_CONFIG.facebook}
										target='_blank'
										rel='noopener noreferrer'
										className='flex w-10 h-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors'
										aria-label='Facebook'
									>
										<Facebook className='w-5 h-5' />
									</a>
								</div>

								<div className='h-px bg-white/10 my-5' />

								<Dialog>
									<DialogTrigger asChild>
										<button
											type='button'
											className='w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gold-soft text-nearBlack font-semibold text-sm tracking-wide hover:bg-gold-soft/90 focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack transition-all'
										>
											<Send className='w-4 h-4' />
											{t('contact.formTitle')}
										</button>
									</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>{t('contact.formTitle')}</DialogTitle>
										<DialogDescription>{t('contact.subtitle')}</DialogDescription>
									</DialogHeader>
									{contactSent ? (
										<motion.div
											initial={{ opacity: 0, scale: 0.95 }}
											animate={{ opacity: 1, scale: 1 }}
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
												<label htmlFor='dlg-name' className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'>
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
													<label htmlFor='dlg-email' className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'>
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
													<label htmlFor='dlg-phone' className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'>
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
												<label htmlFor='dlg-msg' className='text-icyWhite/50 text-xs uppercase tracking-wider mb-1.5 block'>
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
												className='w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium text-sm tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300'
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

			{/* ── 14. FINAL BOOKING CTA ── */}
			<section
				id='booking'
				className='py-16 sm:py-24 lg:py-32 px-5 sm:px-6 lg:px-8 bg-nearBlack/50'
				aria-labelledby='booking-heading'
			>
				<div className='max-w-3xl mx-auto text-center'>
					<motion.h2
						id='booking-heading'
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className='font-serif text-3xl sm:text-4xl md:text-5xl text-icyWhite mb-6'
					>
						{t('reserveTitle')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className='text-icyWhite/70 mb-10 leading-relaxed'
					>
						{t('reserveDesc')}
					</motion.p>
					<div className='flex flex-wrap justify-center gap-4'>
						<Link
							href={`/${locale}/depilation/booking`}
							className='inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300'
						>
							{t('bookNow')}
							<ChevronRight className='w-4 h-4' />
						</Link>
						<a
							href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
							className='inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-icyWhite/80 font-medium hover:border-gold-soft/40 hover:text-gold-soft transition-colors'
						>
							<Phone className='w-4 h-4' />
							{t('callNow')}
						</a>
					</div>
				</div>
			</section>

			{/* ── 15. FOOTER ── */}
			<footer className='border-t border-white/5 py-12 px-6 lg:px-8'>
				<div className='max-w-6xl mx-auto'>
					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10'>
						{/* Brand */}
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

						{/* Navigation */}
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('footer.navTitle')}
							</h4>
							<ul className='space-y-2'>
								{[
									{ href: '#services', label: t('serviceMenu.title') },
									{ href: '#team', label: t('team.title') },
									{ href: '#faq', label: t('faq.title') },
									{ href: '#contact', label: t('contact.title') },
								].map(link => (
									<li key={link.href}>
										<a
											href={link.href}
											className='text-icyWhite/60 hover:text-gold-soft text-sm transition-colors'
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>

						{/* Contact */}
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('contact.title')}
							</h4>
							<ul className='space-y-2 text-sm'>
								<li>
									<a
										href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
										className='text-icyWhite/60 hover:text-gold-soft transition-colors'
									>
										{SITE_CONFIG.phone}
									</a>
								</li>
								<li>
									<a
										href={`mailto:${SITE_CONFIG.email}`}
										className='text-icyWhite/60 hover:text-gold-soft transition-colors'
									>
										{SITE_CONFIG.email}
									</a>
								</li>
								<li className='text-icyWhite/40'>{SITE_CONFIG.address}</li>
							</ul>
						</div>

						{/* Social */}
						<div>
							<h4 className='text-icyWhite/50 text-xs uppercase tracking-wider mb-4'>
								{t('footer.socialTitle')}
							</h4>
							<div className='flex items-center gap-4'>
								<a
									href={SITE_CONFIG.instagram}
									target='_blank'
									rel='noopener noreferrer'
									className='text-icyWhite/50 hover:text-[#E4405F] transition-colors'
									aria-label='Instagram'
								>
									<Instagram className='w-5 h-5' />
								</a>
								<a
									href={SITE_CONFIG.facebook}
									target='_blank'
									rel='noopener noreferrer'
									className='text-icyWhite/50 hover:text-[#1877F2] transition-colors'
									aria-label='Facebook'
								>
									<Facebook className='w-5 h-5' />
								</a>
								<a
									href={SITE_CONFIG.whatsapp}
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

					<div className='border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4'>
						<p className='text-icyWhite/30 text-xs'>
							&copy; {new Date().getFullYear()} V Studio. {t('footer.rights')}
						</p>
						<div className='flex items-center gap-6'>
							<a
								href='#'
								className='text-icyWhite/30 hover:text-icyWhite/50 text-xs transition-colors'
							>
								{t('footer.privacy')}
							</a>
							<a
								href='#'
								className='text-icyWhite/30 hover:text-icyWhite/50 text-xs transition-colors'
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
