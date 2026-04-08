import Navbar from '@/components/Navbar'
import { SITE_CONFIG } from '@/lib/site-config'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export function generateStaticParams() {
	return routing.locales.map(locale => ({ locale }))
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<Metadata> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: 'privacyPolicy' })
	return {
		title: t('metaTitle'),
		description: t('metaDescription'),
	}
}

const SECTIONS = [
	{ titleKey: 'sectionController', bodyKey: 'controller' },
	{ titleKey: 'sectionLegal', bodyKey: 'legal' },
	{ titleKey: 'sectionData', bodyKey: 'data' },
	{ titleKey: 'sectionPurposes', bodyKey: 'purposes' },
	{ titleKey: 'sectionRetention', bodyKey: 'retention' },
	{ titleKey: 'sectionRights', bodyKey: 'rights' },
	{ titleKey: 'sectionCookies', bodyKey: 'cookies' },
	{ titleKey: 'sectionChanges', bodyKey: 'changes' },
] as const

export default async function PrivacyPage({
	params,
}: {
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: 'privacyPolicy' })
	const ctx = {
		address: SITE_CONFIG.address,
		addressSubtitle: SITE_CONFIG.addressSubtitle,
		email: SITE_CONFIG.email,
		phone: SITE_CONFIG.phone,
	}

	return (
		<>
			<Navbar />
			<main
				className='min-h-svh bg-nearBlack text-icyWhite pt-24 pb-20 px-6 md:px-10'
				role='main'
			>
				<div className='mx-auto max-w-2xl'>
					<Link
						href={`/${locale}`}
						className='text-xs tracking-wider uppercase text-gold-soft/70 hover:text-gold-soft transition-colors mb-10 inline-block'
					>
						{t('backHome')}
					</Link>
					<h1 className='font-serif text-3xl md:text-4xl text-icyWhite mb-4'>
						{t('title')}
					</h1>
					<p className='text-icyWhite/55 text-sm leading-relaxed mb-12'>
						{t('intro', ctx)}
					</p>
					<div className='space-y-10 text-sm leading-relaxed text-icyWhite/65'>
						{SECTIONS.map(({ titleKey, bodyKey }) => (
							<section key={bodyKey}>
								<h2 className='font-serif text-lg text-icyWhite/90 mb-3'>
									{t(titleKey)}
								</h2>
								<p>{t(bodyKey, ctx)}</p>
							</section>
						))}
					</div>
				</div>
			</main>
		</>
	)
}
