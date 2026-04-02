'use client'

import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { Place } from '@/lib/places'
import { BookOpen, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const HELP_SECTIONS = [
	{ titleKey: 'helpSectionIntroTitle', bodyKey: 'helpSectionIntroBody' },
	{ titleKey: 'helpSectionNavTitle', bodyKey: 'helpSectionNavBody' },
	{ titleKey: 'helpSectionCalendarTitle', bodyKey: 'helpSectionCalendarBody' },
	{ titleKey: 'helpSectionEditTitle', bodyKey: 'helpSectionEditBody' },
	{ titleKey: 'helpSectionPriceTitle', bodyKey: 'helpSectionPriceBody' },
	{ titleKey: 'helpSectionSettingsTitle', bodyKey: 'helpSectionSettingsBody' },
	{ titleKey: 'helpSectionPublicTitle', bodyKey: 'helpSectionPublicBody' },
	{ titleKey: 'helpSectionTipsTitle', bodyKey: 'helpSectionTipsBody' },
] as const

function AdminHelpContent() {
	const params = useParams()
	const searchParams = useSearchParams()
	const rawLocale = (params?.locale as string) ?? 'en'
	const locale = rawLocale.slice(0, 2)
	const placeParam = searchParams.get('place') as Place | null
	const validPlace =
		placeParam === 'massage' || placeParam === 'depilation' ? placeParam : null

	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const ui = getPlaceAccentUi(validPlace ?? 'massage')

	return (
		<main className='min-h-screen bg-nearBlack text-icyWhite pb-[env(safe-area-inset-bottom,0px)]'>
			<header
				className={`sticky top-0 z-40 border-b border-white/10 bg-nearBlack/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md ${ui.adminHeaderBar}`}
			>
				<div className='flex h-16 min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8'>
					<div className='flex min-w-0 items-center gap-3'>
						<Link
							href={
								validPlace
									? `/${locale}/admin/${validPlace}/calendar`
									: `/${locale}/admin`
							}
							className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-icyWhite/80 ${ui.backHover} hover:bg-white/5 transition-colors`}
							aria-label={t('helpBackAria')}
						>
							<ChevronLeft className='h-4 w-4 shrink-0' />
						</Link>
						<div className='flex min-w-0 items-center gap-2'>
							<BookOpen
								className='h-5 w-5 shrink-0 text-icyWhite/70'
								aria-hidden
							/>
							<h1 className='font-serif text-lg text-icyWhite truncate'>
								{t('helpPageTitle')}
							</h1>
						</div>
					</div>
				</div>
			</header>

			<div className='mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8'>
				<p className='text-sm text-icyWhite/65 mb-8 leading-relaxed'>
					{t('helpPageLead')}
				</p>
				{validPlace ? (
					<p className='text-xs text-icyWhite/45 mb-10'>
						{t('helpBackPlaceHint', {
							place: tCommon(validPlace === 'massage' ? 'massage' : 'depilation'),
						})}
					</p>
				) : null}

				<div className='space-y-10'>
					{HELP_SECTIONS.map(({ titleKey, bodyKey }) => (
						<section
							key={titleKey}
							className='rounded-xl border border-white/10 bg-white/[0.02] px-4 py-5 sm:px-6'
						>
							<h2 className='font-serif text-xl text-icyWhite mb-3'>
								{t(titleKey)}
							</h2>
							<p className='text-sm text-icyWhite/75 leading-relaxed whitespace-pre-line'>
								{t(bodyKey)}
							</p>
						</section>
					))}
				</div>

				<p className='mt-12 text-xs text-icyWhite/40'>
					{t('helpDocNote')}
				</p>
			</div>
		</main>
	)
}

export default function AdminHelpPage() {
	return (
		<Suspense
			fallback={
				<div className='min-h-screen bg-nearBlack text-icyWhite flex items-center justify-center px-4'>
					<p className='text-sm text-icyWhite/50'>…</p>
				</div>
			}
		>
			<AdminHelpContent />
		</Suspense>
	)
}
