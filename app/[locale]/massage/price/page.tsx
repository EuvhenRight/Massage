import PublicPriceCatalogPage from '@/components/PublicPriceCatalogPage'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
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
	const t = await getTranslations({ locale, namespace: 'price' })
	return {
		title: t('pageMetaTitle'),
		description: t('pageMetaDescription'),
	}
}

export default function MassagePricePage() {
	return <PublicPriceCatalogPage place='massage' />
}
