'use client'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Hand, LogOut, Sparkles } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function AdminPage() {
	const params = useParams()
	const locale = (params?.locale as string) ?? 'ru'
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const { data: session } = useSession()

	return (
		<main className='min-h-screen bg-nearBlack text-icyWhite'>
			<header className='sticky top-0 z-40 border-b border-white/10 bg-nearBlack/95 backdrop-blur-md'>
				<div className='flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16'>
					<div className='flex items-center gap-4'>
						<h1 className='font-serif text-lg text-icyWhite'>{t('admin')}</h1>
					</div>
					<div className='flex items-center gap-3'>
						<LanguageSwitcher variant='admin' />
						{session?.user && (
							<button
								type='button'
								onClick={() => signOut({ callbackUrl: '/sk' })}
								className='flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/5 transition-colors'
							>
								<LogOut className='w-4 h-4' />
								{t('signOut')}
							</button>
						)}
					</div>
				</div>
			</header>
			<div className='flex items-center justify-center p-6'>
			<div className='w-full max-w-md space-y-8'>
				<div className='text-center'>
					<h1 className='font-serif text-3xl text-icyWhite'>{t('admin')}</h1>
					<p className='text-icyWhite/60 mt-1'>{t('chooseBookingSystem')}</p>
				</div>

				<div className='grid gap-4'>
					<Link
						href={`/${locale}/admin/massage`}
						className='flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-gold-soft/30 transition-all group'
					>
						<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft/20 border border-gold-soft/40 group-hover:bg-gold-soft/30'>
							<Hand className='h-6 w-6 text-gold-glow' />
						</div>
						<div className='flex-1 text-left'>
							<h2 className='font-medium text-icyWhite'>
								{tCommon('massage')}
							</h2>
							<p className='text-sm text-icyWhite/50'>
								{t('servicesCalendarAppointments')}
							</p>
						</div>
					</Link>

					<Link
						href={`/${locale}/admin/depilation`}
						className='flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-gold-soft/30 transition-all group'
					>
						<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft/20 border border-gold-soft/40 group-hover:bg-gold-soft/30'>
							<Sparkles className='h-6 w-6 text-gold-glow' />
						</div>
						<div className='flex-1 text-left'>
							<h2 className='font-medium text-icyWhite'>
								{tCommon('depilation')}
							</h2>
							<p className='text-sm text-icyWhite/50'>
								{t('servicesCalendarAppointments')}
							</p>
						</div>
					</Link>
				</div>

				{session?.user && (
					<div className='pt-4 border-t border-white/10'>
						<span className='text-sm text-icyWhite/50'>{session.user.email}</span>
					</div>
				)}

				<Link
					href='/sk'
					className='block text-center text-sm text-icyWhite/50 hover:text-icyWhite transition-colors'
				>
					{t('backToAurora')}
				</Link>
			</div>
			</div>
		</main>
	)
}
