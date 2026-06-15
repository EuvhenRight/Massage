'use client'

import AdminStudioVideoManager from '@/components/AdminStudioVideoManager'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function AdminStudioVideoPage() {
	const params = useParams()
	const locale = (params?.locale as string) ?? 'sk'
	const t = useTranslations('admin')

	return (
		<main className='min-h-screen bg-nearBlack text-icyWhite'>
			<header className='sticky top-0 z-30 border-b border-white/10 bg-nearBlack/95 backdrop-blur-md'>
				<div className='mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8 h-16'>
					<Link
						href={`/${locale}/admin`}
						className='inline-flex items-center gap-1.5 text-sm text-icyWhite/70 hover:text-icyWhite transition-colors'
					>
						<ChevronLeft className='h-4 w-4' aria-hidden />
						<span>{t('admin')}</span>
					</Link>
					<h1 className='font-serif text-lg text-icyWhite ml-2'>
						{t('studioVideoTitle')}
					</h1>
				</div>
			</header>

			<section className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8'>
				<div className='mb-6'>
					<h2 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
						{t('studioVideoHeading')}
					</h2>
					<p className='mt-1 text-sm text-icyWhite/60'>
						{t('studioVideoSubtitle')}
					</p>
				</div>
				<AdminStudioVideoManager />
			</section>
		</main>
	)
}
