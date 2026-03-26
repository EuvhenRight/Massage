'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import Script from 'next/script'
import { useMemo } from 'react'

/**
 * Loads Google Analytics 4 only when the user has opted in to the Analytics category.
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in the environment (e.g. G-XXXXXXXXXX).
 */
export default function ConditionalAnalytics() {
	const { allowsAnalytics, ready } = useCookieConsent()
	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

	const shouldLoad = useMemo(
		() => Boolean(ready && allowsAnalytics && measurementId),
		[ready, allowsAnalytics, measurementId],
	)

	if (!shouldLoad || !measurementId) return null

	return (
		<>
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
				strategy='afterInteractive'
			/>
			<Script id='ga4-init' strategy='afterInteractive'>
				{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');
				`.trim()}
			</Script>
		</>
	)
}
