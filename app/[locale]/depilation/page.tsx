'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
	Award,
	Sparkles,
	Heart,
	Shield,
	Users,
	Calendar,
	ChevronRight,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import FloatingCTA from '@/components/FloatingCTA'
import DepilationContentCard from '@/components/DepilationContentCard'
import MyServices from '@/components/MyServices'

const IMG = {
	about: '/images/depilation/AB678F7C-B5F1-468E-B739-4B8720842F20_1_105_c-d333239b-5b90-40a1-b3f3-bdb92ec4ba15.png',
	terra: '/images/depilation/FD5A90EF-7384-410B-B069-880FF57AD64E_1_105_c-e553e146-de2e-455a-8edc-21ec8e423efb.png',
	portrait: '/images/depilation/0E99BE5B-A88A-47AB-B264-3FC267ACCCD4_1_105_c-04788ef6-5115-4c2c-8a4c-74129c6e50f5.png',
	portrait2: '/images/depilation/E9A1D7C4-02D4-4718-9455-AB23672CC127_1_105_c-8ea037d5-0afb-4946-85b7-548eb136ccca.png',
	certificate: '/images/depilation/7E17C6FA-202D-4C8B-AE13-C6B908A159C4_1_105_c-74b4a433-f2de-477c-a6b3-42c6f9058950.png',
	comfort: '/images/depilation/AC2A6C46-C748-4442-A844-8308EF549B01_1_105_c-c4a1a659-e4f8-450c-bbf8-ce2e348acbbf.png',
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

const SERVICES = [
	{
		key: 'serviceSugaring' as const,
		descKey: 'serviceSugaringDesc' as const,
		image: IMG.terra,
	},
	{
		key: 'serviceWax' as const,
		descKey: 'serviceWaxDesc' as const,
		image: IMG.comfort,
	},
	{
		key: 'serviceBio' as const,
		descKey: 'serviceBioDesc' as const,
		image: IMG.portrait,
	},
] as const

export default function DepilationPage() {
	const t = useTranslations('depilation')
	const tCommon = useTranslations('common')
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'

	return (
		<>
			<Navbar />
			<FloatingCTA />

			{/* Hero */}
			<section
				id="hero"
				className="relative min-h-[90vh] flex items-center justify-center overflow-hidden noise-overlay"
				aria-labelledby="depilation-hero"
			>
				<div className="absolute inset-0">
					<Image
						src={IMG.portrait}
						alt=""
						fill
						className="object-cover opacity-50"
						priority
						sizes="100vw"
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-nearBlack/80 via-nearBlack/60 to-nearBlack" />
					<div
						className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)]"
						aria-hidden
					/>
				</div>
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					className="relative z-10 text-center px-6"
				>
					<div className="flex justify-center mb-4">
						{/* V logo */}
						<svg
							className="w-16 h-20 text-gold-soft"
							viewBox="0 0 120 140"
							fill="currentColor"
							aria-hidden
						>
							<path d="M60 8 L8 132 L32 132 L60 72 L88 132 L112 132 Z" />
							<circle cx="60" cy="8" r="4" />
						</svg>
					</div>
					<h1
						id="depilation-hero"
						className="font-serif text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-icyWhite tracking-tight aurora-text"
					>
						{tCommon('depilation')}
					</h1>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4 }}
						className="mt-4 text-icyWhite/70 text-base sm:text-lg md:text-xl max-w-lg mx-auto"
					>
						{t('heroSubtitle')}
					</motion.p>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6 }}
						className="mt-4 text-gold-soft/90 text-sm tracking-wider uppercase"
					>
						{t('hero')}
					</motion.p>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.9 }}
						className="mt-12 flex flex-wrap justify-center gap-4"
					>
						<Link
							href={`/${locale}/depilation/booking`}
							className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300"
						>
							{t('bookDepilationButton')}
							<ChevronRight className="w-4 h-4" />
						</Link>
						<Link
							href={`/${locale}/massage`}
							className="text-icyWhite/50 hover:text-gold-soft text-sm tracking-[0.2em] uppercase transition-colors"
						>
							{t('exploreMassage')}
						</Link>
					</motion.div>
				</motion.div>
			</section>

			{/* About Me */}
			<section
				id="about"
				className="py-20 lg:py-28 px-6 lg:px-8"
				aria-labelledby="about-heading"
			>
				<div className="max-w-6xl mx-auto">
					<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						<motion.div
							initial={{ opacity: 0, x: -24 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10"
						>
							<Image
								src={IMG.about}
								alt="Natalie Volik"
								fill
								className="object-cover"
								sizes="(max-width: 1024px) 100vw, 50vw"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-nearBlack/40 to-transparent" />
						</motion.div>
						<div>
							<motion.h2
								id="about-heading"
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className="font-serif text-4xl md:text-5xl text-icyWhite mb-6"
							>
								{t('aboutTitle')}
							</motion.h2>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className="text-icyWhite/80 leading-relaxed mb-4"
							>
								{t('aboutIntro')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className="text-icyWhite/70 leading-relaxed mb-4"
							>
								{t('aboutJourney')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className="text-icyWhite/70 leading-relaxed mb-4"
							>
								{t('aboutExpertise')}
							</motion.p>
							<motion.p
								initial={{ opacity: 0 }}
								whileInView={{ opacity: 1 }}
								viewport={{ once: true }}
								className="text-icyWhite/70 leading-relaxed"
							>
								{t('aboutMedical')} {t('aboutContinuous')}
							</motion.p>
						</div>
					</div>
				</div>
			</section>

			{/* Philosophy */}
			<section
				id="philosophy"
				className="py-20 lg:py-28 px-6 lg:px-8 bg-nearBlack/50"
				aria-labelledby="philosophy-heading"
			>
				<div className="max-w-4xl mx-auto text-center">
					<motion.h2
						id="philosophy-heading"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-3xl md:text-4xl text-icyWhite mb-8"
					>
						{t('philosophyTitle')}
					</motion.h2>
					<motion.blockquote
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="font-serif text-2xl md:text-3xl lg:text-4xl text-gold-soft/95 leading-relaxed"
					>
						&ldquo;{t('philosophyQuote')}&rdquo;
					</motion.blockquote>
				</div>
			</section>

			{/* How I Can Help */}
			<section
				id="how-i-help"
				className="py-20 lg:py-28 px-6 lg:px-8"
				aria-labelledby="how-i-help-heading"
			>
				<div className="max-w-6xl mx-auto">
					<motion.h2
						id="how-i-help-heading"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-4xl md:text-5xl text-icyWhite text-center mb-4"
					>
						{t('howIHelpTitle')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="text-icyWhite/60 text-center mb-12"
					>
						{t('howIHelpIntro')}
					</motion.p>
					<div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
						{VALUES.map(({ key, icon: Icon }, i) => (
							<motion.div
								key={key}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.06 }}
								className="p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-gold-soft/30 hover:bg-white/[0.04] transition-all duration-300"
							>
								<Icon className="w-8 h-8 text-gold-soft/90 mb-3" aria-hidden />
								<p className="text-icyWhite font-medium text-sm">{t(key)}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Achievements */}
			<section
				id="achievements"
				className="py-20 lg:py-28 px-6 lg:px-8 bg-nearBlack/50"
				aria-labelledby="achievements-heading"
			>
				<div className="max-w-6xl mx-auto">
					<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
						<motion.div
							initial={{ opacity: 0, x: -24 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 order-2 lg:order-1"
						>
							<Image
								src={IMG.certificate}
								alt=""
								fill
								className="object-cover"
								sizes="(max-width: 1024px) 100vw, 50vw"
							/>
						</motion.div>
						<div className="order-1 lg:order-2">
							<motion.h2
								id="achievements-heading"
								initial={{ opacity: 0, y: 16 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className="font-serif text-4xl md:text-5xl text-icyWhite mb-8 flex items-center gap-3"
							>
								<Award className="w-10 h-10 text-gold-soft shrink-0" aria-hidden />
								{t('achievementsTitle')}
							</motion.h2>
							<ul className="space-y-3">
								{ACHIEVEMENTS.map((key, i) => (
									<motion.li
										key={key}
										initial={{ opacity: 0, x: 16 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.05 }}
										className="flex items-start gap-3 text-icyWhite/80"
									>
										<span className="text-gold-soft shrink-0 mt-0.5">✦</span>
										{t(key)}
									</motion.li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* My Services — full catalog with photos */}
			<MyServices />

			{/* Services — simplified cards */}
			<section
				id="services"
				className="py-20 lg:py-28 px-6 lg:px-8"
				aria-labelledby="services-heading"
			>
				<div className="max-w-6xl mx-auto">
					<motion.h2
						id="services-heading"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-4xl md:text-5xl text-icyWhite text-center mb-4"
					>
						{t('servicesTitle')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="text-icyWhite/60 text-center mb-14 max-w-2xl mx-auto"
					>
						{t('servicesDesc')}
					</motion.p>
					<div className="grid md:grid-cols-3 gap-8">
						{SERVICES.map(({ key, descKey, image }, i) => (
							<DepilationContentCard
								key={key}
								image={image}
								imageAlt={t(key)}
								title={t(key)}
								index={i}
							>
								<p className="text-icyWhite/70 text-sm leading-relaxed">
									{t(descKey)}
								</p>
							</DepilationContentCard>
						))}
					</div>
				</div>
			</section>

			{/* Booking CTA */}
			<section
				id="booking"
				className="py-24 lg:py-32 px-6 lg:px-8 bg-nearBlack/50"
				aria-labelledby="booking-heading"
			>
				<div className="max-w-3xl mx-auto text-center">
					<motion.h2
						id="booking-heading"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="font-serif text-4xl md:text-5xl text-icyWhite mb-6"
					>
						{t('reserveTitle')}
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="text-icyWhite/70 mb-10 leading-relaxed"
					>
						{t('reserveDesc')}
					</motion.p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href={`/${locale}/depilation/booking`}
							className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gold-soft/20 border border-gold-soft/50 text-gold-soft font-medium tracking-wider uppercase hover:bg-gold-soft/30 hover:shadow-glow transition-all duration-300"
							aria-label={t('bookDepilationButton')}
						>
							{t('bookNow')}
							<ChevronRight className="w-4 h-4" />
						</Link>
						<Link
							href={`/${locale}/depilation/booking`}
							className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-icyWhite/80 font-medium hover:border-gold-soft/40 hover:text-gold-soft transition-colors"
							aria-label={t('viewPricesAndBook')}
						>
							{t('pricePageButton')}
						</Link>
					</div>
				</div>
			</section>
		</>
	)
}
