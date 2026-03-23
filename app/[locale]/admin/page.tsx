'use client'

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Hand, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function AdminPage() {
	const params = useParams()
	const locale = (params?.locale as string) ?? 'ru'
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const { data: session } = useSession()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	return (
		<main className='min-h-screen bg-nearBlack text-icyWhite'>
			<header className='sticky top-0 z-40 border-b border-white/10 bg-nearBlack/95 backdrop-blur-md'>
				<div className='flex items-center justify-between gap-3 px-4 h-16 min-h-16 sm:px-6 lg:px-8'>
					<div className='flex shrink-0 items-center gap-3'>
						<h1 className='font-serif text-lg text-icyWhite'>{t('admin')}</h1>
					</div>
					<div className='flex shrink-0 items-center gap-2'>
						<LanguageSwitcher variant='admin' />
						<button
							type='button'
							onClick={() => setIsMobileMenuOpen((prev) => !prev)}
							className='inline-flex items-center justify-center rounded-lg p-1.5 text-icyWhite/80 hover:text-icyWhite hover:bg-white/5 transition-colors sm:hidden'
							aria-label={isMobileMenuOpen ? t('closeMenuAria') : t('openMenuAria')}
						>
							{isMobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
						</button>
						{session?.user && (
							<button
								type='button'
								onClick={() => signOut({ callbackUrl: '/sk' })}
								className='hidden min-w-[4.5rem] shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/5 transition-colors whitespace-nowrap sm:flex sm:min-w-[6rem]'
							>
								<LogOut className='h-4 w-4 shrink-0' />
								<span className='truncate'>{t('signOut')}</span>
							</button>
						)}
					</div>
				</div>
				{isMobileMenuOpen && (
					<div className='absolute inset-x-0 top-full z-50 bg-nearBlack text-icyWhite border-y border-purple-soft/40 px-4 pb-4 pt-3 shadow-xl animate-in slide-in-from-top-2 fade-in-0 duration-200 sm:hidden'>
						{session?.user && (
							<div className='mb-3 text-right'>
								<span className='block max-w-xs ml-auto truncate text-xs text-icyWhite/80'>
									{session.user.email}
								</span>
							</div>
						)}
						{session?.user && (
							<button
								type='button'
								onClick={() => signOut({ callbackUrl: '/sk' })}
								className='flex w-full max-w-xs ml-auto items-center justify-end gap-2 rounded-lg px-3 py-2 text-sm text-icyWhite/90 hover:text-icyWhite hover:bg-white/5 transition-colors'
							>
								<span className='truncate'>{t('signOut')}</span>
								<LogOut className='h-4 w-4 shrink-0' />
							</button>
						)}
					</div>
				)}
			</header>
			<div className='flex items-center justify-center p-6'>
				<div className='w-full max-w-md space-y-8'>
					<div className='text-center'>
						<h1 className='font-serif text-3xl text-icyWhite'>{t('admin')}</h1>
						<p className='text-icyWhite/60 mt-1'>{t('chooseBookingSystem')}</p>
					</div>

					<div className='grid gap-4'>
						<Link
							href={`/${locale}/admin/massage/calendar`}
							className='flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-purple-soft/30 transition-all group'
						>
							<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-purple-soft/20 border border-purple-soft/40 group-hover:bg-purple-soft/30'>
								<Hand className='h-6 w-6 text-purple-glow' />
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
							href={`/${locale}/admin/depilation/calendar`}
							className='flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-purple-soft/30 transition-all group'
						>
							<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-purple-soft/20 border border-purple-soft/40 group-hover:bg-purple-soft/30'>
								<Sparkles className='h-6 w-6 text-purple-glow' />
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
