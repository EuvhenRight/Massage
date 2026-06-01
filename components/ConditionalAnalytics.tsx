'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import { Analytics as VercelAnalytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { useMemo } from 'react'

/**
 * Single consent-gated entry point for all analytics tools.
 *
 *   - Google Analytics 4 (requires cookies — strictly needs consent)
 *   - Vercel Analytics (cookieless, but gated here for consistency so the
 *     user's "analytics" opt-in covers every metrics tool the site uses)
 *
 * Both tools render only when `allowsAnalytics` is true; flipping the
 * consent toggle off immediately unmounts them.
 */
export default function ConditionalAnalytics() {
	const { allowsAnalytics, ready } = useCookieConsent()
	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

	const consentReady = useMemo(
		() => Boolean(ready && allowsAnalytics),
		[ready, allowsAnalytics],
	)

	if (!consentReady) return null

	return (
		<>
			{measurementId ? (
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
			) : null}
			<VercelAnalytics />
		</>
	)
}
