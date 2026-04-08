'use client'

import Navbar from '@/components/Navbar'
import PublicPriceCatalogBody from '@/components/PublicPriceCatalogBody'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { Place } from '@/lib/places'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
	hidden: { opacity: 0, y: 12 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
	},
}

export default function PublicPriceCatalogPage({ place }: { place: Place }) {
	const tBooking = useTranslations('booking')
	const tLanding = useTranslations(
		place === 'massage' ? 'massage' : 'depilation',
	)
	const locale = useLocale()
	const [catalog, setCatalog] = useState<PriceCatalogStructure | null>(null)
	const [loading, setLoading] = useState(true)
	const ui = useMemo(() => getPlaceAccentUi(place), [place])

	const load = useCallback(() => {
		setLoading(true)
		void fetch(`/api/price-catalog?place=${place}`, { cache: 'no-store' })
			.then(r => (r.ok ? r.json() : null))
			.then((data: PriceCatalogStructure | null) => setCatalog(data))
			.catch(() => setCatalog(null))
			.finally(() => setLoading(false))
	}, [place])

	useEffect(() => {
		void load()
	}, [load])

	return (
		<>
			<Navbar />
			<main
				className='min-h-svh bg-nearBlack text-icyWhite pt-20 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:pb-12 md:pb-10'
				role='main'
			>
				<section className='py-4 sm:py-6 px-3 sm:px-5 lg:px-6'>
					<div className='max-w-6xl mx-auto'>
						<Link
							href={`/${locale}/${place}`}
							className={`inline-flex items-center gap-0.5 text-[11px] tracking-wider uppercase text-icyWhite/45 ${ui.backHover} transition-colors mb-1.5`}
							aria-label={tBooking('back')}
						>
							<ChevronLeft className='h-3.5 w-3.5 shrink-0' aria-hidden />
							{tBooking('back')}
						</Link>

						<motion.div
							variants={stagger}
							initial='hidden'
							whileInView='show'
							viewport={{ once: true, margin: '-40px' }}
							className='text-center mb-3 sm:mb-3.5'
						>
							<motion.h1
								variants={fadeUp}
								className='font-serif text-2xl sm:text-3xl md:text-4xl text-icyWhite'
							>
								{tLanding('serviceMenu.title')}
							</motion.h1>
						</motion.div>

						<PublicPriceCatalogBody
							catalog={catalog}
							place={place}
							loading={loading}
						/>
					</div>
				</section>
			</main>
		</>
	)
}
