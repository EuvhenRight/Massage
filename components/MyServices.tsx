'use client'

import { scrollFade, scrollRevealY, useSiteMotion } from '@/lib/site-motion'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

/** Stock photos from Unsplash - beauty salon, depilation, spa (free to use) */
const SERVICE_IMAGES: Record<string, string> = {
	sugaring:
		'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&q=80',
	wax: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
	bio: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80',
	laser: 'https://images.unsplash.com/photo-1570172611664-30635e77079d?w=800&q=80',
	electro: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
	face: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
	body: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800&q=80',
	bikini: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
	legs: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
}

export type ServiceId =
	| 'sugaring'
	| 'wax'
	| 'bio'
	| 'laser'
	| 'electro'
	| 'face'
	| 'body'
	| 'bikini'
	| 'legs'

interface ServiceItem {
	id: ServiceId
	durationMinutes: number
	price: number
	zones?: string[]
}

/** Services with title, description, time, price (from price catalog) */
const SERVICES: ServiceItem[] = [
	{ id: 'sugaring', durationMinutes: 10, price: 12, zones: ['face', 'body', 'bikini', 'legs'] },
	{ id: 'wax', durationMinutes: 10, price: 12, zones: ['face', 'body', 'bikini', 'legs'] },
	{ id: 'bio', durationMinutes: 15, price: 18, zones: ['face', 'body', 'bikini', 'legs'] },
	{ id: 'laser', durationMinutes: 15, price: 18, zones: ['face', 'body', 'bikini', 'legs'] },
	{ id: 'electro', durationMinutes: 10, price: 15, zones: ['face'] },
]

export default function MyServices() {
	const t = useTranslations('depilation')
	const tPrice = useTranslations('price')
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const { minimal } = useSiteMotion()
	const ry = useMemo(() => scrollRevealY(minimal), [minimal])
	const rf = useMemo(() => scrollFade(minimal), [minimal])

	return (
		<section
			id="my-services"
			className="py-20 lg:py-28 px-6 lg:px-8 bg-nearBlack/30"
			aria-labelledby="my-services-heading"
		>
			<div className="max-w-6xl mx-auto">
				<motion.h2
					id="my-services-heading"
					{...ry}
					className="font-serif text-4xl md:text-5xl text-icyWhite text-center mb-4"
				>
					{t('myServices.title')}
				</motion.h2>
				<motion.p
					{...rf}
					className="text-icyWhite/60 text-center mb-14 max-w-2xl mx-auto"
				>
					{t('myServices.subtitle')}
				</motion.p>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
					{SERVICES.map((service, i) => (
						<motion.article
							key={service.id}
							{...ry}
							transition={{
								duration: minimal ? 0 : 0.36,
								delay: minimal ? 0 : i * 0.05,
							}}
							viewport={{ once: true, margin: '-48px' }}
							className="group overflow-hidden rounded-2xl border border-white/5 bg-nearBlack/60 backdrop-blur-sm hover:border-gold-soft/25 hover:shadow-card transition-all duration-500"
						>
							<div className="aspect-[4/3] relative overflow-hidden">
								<Image
									src={SERVICE_IMAGES[service.id] ?? SERVICE_IMAGES.body}
									alt=""
									fill
									className="object-cover transition-transform duration-700 group-hover:scale-105"
									sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-nearBlack via-nearBlack/20 to-transparent" />
								<div className="absolute bottom-0 left-0 right-0 p-6">
									<h3 className="font-serif text-2xl text-icyWhite">
										{t(`myServices.${service.id}`)}
									</h3>
									<div className="flex items-center gap-3 mt-2 text-sm text-gold-soft/90">
										<span>{t('myServices.from')} {service.durationMinutes} {tPrice('min')}</span>
										<span>·</span>
										<span>{t('myServices.from')} {service.price} €</span>
									</div>
								</div>
							</div>
							<div className="p-6">
								<p className="text-icyWhite/70 text-sm leading-relaxed mb-4">
									{t(`myServices.${service.id}Desc`)}
								</p>
								<Link
									href={`/${locale}/depilation/booking`}
									className="inline-flex items-center gap-2 text-gold-soft text-sm font-medium tracking-wider uppercase hover:text-gold-glow transition-colors"
								>
									{t('bookDepilationButton')}
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</Link>
							</div>
						</motion.article>
					))}
				</div>
			</div>
		</section>
	)
}
