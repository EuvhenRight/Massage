'use client'

import { useCookieConsent } from '@/components/CookieConsentContext'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'

export default function CookieConsentBanner() {
	const t = useTranslations('cookieConsent')
	const params = useParams()
	const pathname = usePathname()
	const locale = (params?.locale as string) ?? 'sk'
	const headingId = useId()
	const {
		consent,
		ready,
		bannerVisible,
		customizeMode,
		setCustomizeMode,
		saveConsent,
		closeBanner,
	} = useCookieConsent()

	const [analytics, setAnalytics] = useState(false)
	const [marketing, setMarketing] = useState(false)

	useEffect(() => {
		if (consent) {
			setAnalytics(consent.analytics)
			setMarketing(consent.marketing)
		}
	}, [consent])

	if (!ready || !bannerVisible || pathname?.includes('/admin')) return null

	const policyHref = `/${locale}/cookies`

	const openCustomize = () => {
		if (consent) {
			setAnalytics(consent.analytics)
			setMarketing(consent.marketing)
		}
		setCustomizeMode(true)
	}

	return (
		<div
			className='fixed inset-x-0 bottom-0 z-[100] px-4 pt-4 md:px-6 md:pt-6 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:pb-6 pointer-events-none'
			role='region'
			aria-labelledby={headingId}
			aria-label={t('ariaRegion')}
		>
			<div
				className='pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-nearBlack/95 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.45)] md:max-w-2xl'
				role='dialog'
				aria-modal='true'
				aria-labelledby={headingId}
			>
				<div className='p-5 md:p-6'>
					<h2
						id={headingId}
						className='font-serif text-lg md:text-xl text-icyWhite mb-2'
					>
						{t('title')}
					</h2>
					<p className='text-sm text-icyWhite/60 leading-relaxed mb-4'>
						{t('description')}{' '}
						<Link
							href={policyHref}
							className='text-gold-soft/90 hover:text-gold-soft underline underline-offset-2'
						>
							{t('learnMore')}
						</Link>
					</p>

					{customizeMode ? (
						<div className='space-y-4 mb-5 border-t border-white/[0.06] pt-4'>
							<div className='flex gap-3 items-start'>
								<input
									type='checkbox'
									checked
									disabled
									readOnly
									className='mt-1 rounded border-white/20 bg-white/5 opacity-60'
									aria-describedby={`${headingId}-nec`}
								/>
								<span>
									<span className='block text-sm font-medium text-icyWhite/90'>
										{t('necessaryTitle')}
									</span>
									<span
										id={`${headingId}-nec`}
										className='block text-xs text-icyWhite/45 mt-0.5'
									>
										{t('necessaryDesc')}
									</span>
								</span>
							</div>
							<label className='flex gap-3 items-start cursor-pointer'>
								<input
									type='checkbox'
									checked={analytics}
									onChange={e => setAnalytics(e.target.checked)}
									className='mt-1 rounded border-white/20 bg-white/5 accent-gold-soft'
									aria-describedby={`${headingId}-ana`}
								/>
								<span>
									<span className='block text-sm font-medium text-icyWhite/90'>
										{t('analyticsTitle')}
									</span>
									<span
										id={`${headingId}-ana`}
										className='block text-xs text-icyWhite/45 mt-0.5'
									>
										{t('analyticsDesc')}
									</span>
								</span>
							</label>
							<label className='flex gap-3 items-start cursor-pointer'>
								<input
									type='checkbox'
									checked={marketing}
									onChange={e => setMarketing(e.target.checked)}
									className='mt-1 rounded border-white/20 bg-white/5 accent-gold-soft'
									aria-describedby={`${headingId}-mkt`}
								/>
								<span>
									<span className='block text-sm font-medium text-icyWhite/90'>
										{t('marketingTitle')}
									</span>
									<span
										id={`${headingId}-mkt`}
										className='block text-xs text-icyWhite/45 mt-0.5'
									>
										{t('marketingDesc')}
									</span>
								</span>
							</label>
						</div>
					) : null}

					<div className='flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3'>
						{customizeMode ? (
							<>
								<button
									type='button'
									onClick={() => setCustomizeMode(false)}
									className='order-2 sm:order-1 px-4 py-2.5 rounded-xl text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/[0.06] transition-colors'
								>
									{t('back')}
								</button>
								<button
									type='button'
									onClick={() => saveConsent({ analytics, marketing })}
									className='order-1 sm:order-2 flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-sm font-medium bg-gold-soft text-nearBlack hover:bg-gold-soft/90 transition-colors'
								>
									{t('saveChoices')}
								</button>
							</>
						) : (
							<>
								<button
									type='button'
									onClick={() => saveConsent({ analytics: false, marketing: false })}
									className='px-4 py-2.5 rounded-xl text-sm text-icyWhite/70 border border-white/10 hover:bg-white/[0.05] transition-colors'
								>
									{t('rejectNonEssential')}
								</button>
								<button
									type='button'
									onClick={openCustomize}
									className='px-4 py-2.5 rounded-xl text-sm text-icyWhite/80 border border-white/15 hover:bg-white/[0.06] transition-colors'
								>
									{t('customize')}
								</button>
								<button
									type='button'
									onClick={() =>
										saveConsent({ analytics: true, marketing: true })
									}
									className='flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-sm font-medium bg-gold-soft text-nearBlack hover:bg-gold-soft/90 transition-colors'
								>
									{t('acceptAll')}
								</button>
							</>
						)}
					</div>

					{consent !== null ? (
						<button
							type='button'
							onClick={closeBanner}
							className='mt-4 text-xs text-icyWhite/35 hover:text-icyWhite/55 transition-colors w-full text-center sm:text-left'
						>
							{t('close')}
						</button>
					) : null}
				</div>
			</div>
		</div>
	)
}
