'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import { useTranslations } from 'next-intl'

type Props = {
	className?: string
}

export default function OpenCookieSettingsButton({ className }: Props) {
	const t = useTranslations('cookiePolicy')
	const { openPreferences } = useCookieConsent()

	return (
		<button
			type='button'
			onClick={openPreferences}
			className={
				className ??
				'text-gold-soft/90 hover:text-gold-soft underline underline-offset-2 text-sm'
			}
		>
			{t('openSettings')}
		</button>
	)
}
