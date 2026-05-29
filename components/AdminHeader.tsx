'use client'

/**
 * Shared admin header — used by AdminPlacePage and AdminClientsPage.
 *
 * Header layout: hamburger (left) · page title · language switcher + sign-out (right).
 *
 * Drawer: slides in from the LEFT (matches the hamburger position). Shows only
 * the *current* studio's sections — the other studio is intentionally hidden
 * to avoid context confusion ("am I editing massage or depilation prices?").
 * To switch studios, the user clicks the drawer's "Admin" title to return to
 * the /admin landing and pick again.
 */

import LanguageSwitcher from '@/components/LanguageSwitcher'
import { clsx } from 'clsx'
import {
	BarChart2,
	Banknote,
	BookOpen,
	Calendar,
	CalendarRange,
	ExternalLink,
	LogOut,
	Menu,
	Settings,
	Users,
	X,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { type ElementType, useCallback, useEffect, useState } from 'react'

export type AdminSection =
	| 'calendar'
	| 'agenda'
	| 'analytics'
	| 'price'
	| 'settings'

export type AdminGlobalRoute = 'clients'

export type AdminPlace = 'massage' | 'depilation'

interface AdminHeaderProps {
	locale: string
	/** Active place (highlights its row). `null` for global pages like /clients. */
	place: AdminPlace | null
	/** Active section inside the current place. */
	section?: AdminSection
	/** Active global route (e.g. clients). */
	activeGlobal?: AdminGlobalRoute
	/** Optional title shown in the header centre. Defaults to place / global label. */
	title?: string
	/** Pending badge for Calendar tab (TBD bookings still need a slot). */
	calendarTbdBadge?: number
	/** Pending badge for Calendar tab (full-day bookings need date picked). */
	calendarDayBadge?: number
}

export default function AdminHeader({
	locale,
	place,
	section,
	activeGlobal,
	title,
	calendarTbdBadge = 0,
	calendarDayBadge = 0,
}: AdminHeaderProps) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const { data: session } = useSession()
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('keydown', onKey)
		const prev = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', onKey)
			document.body.style.overflow = prev
		}
	}, [open])

	const close = useCallback(() => setOpen(false), [])

	const resolvedTitle =
		title ??
		(activeGlobal === 'clients'
			? t('clientsTitle')
			: place
				? tCommon(place)
				: t('admin'))

	return (
		<>
			<header className='sticky top-0 z-40 border-b border-white/10 bg-nearBlack/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md'>
				<div className='flex h-16 min-h-16 items-center justify-between gap-2 px-3 sm:px-6 lg:px-8'>
					<div className='flex min-w-0 shrink items-center gap-2 sm:gap-3'>
						<button
							type='button'
							onClick={() => setOpen(true)}
							aria-label={t('openMenuAria')}
							className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-icyWhite/85 hover:bg-white/8 hover:text-icyWhite transition-colors'
						>
							<Menu className='h-5 w-5' />
						</button>
						<span className='hidden text-icyWhite/30 sm:inline'>|</span>
						<span className='min-w-0 truncate font-serif text-base text-icyWhite sm:text-lg'>
							{resolvedTitle}
						</span>
					</div>

					<div className='flex shrink-0 items-center gap-1.5 sm:gap-2'>
						<LanguageSwitcher variant='admin' />
						{session?.user && (
							<button
								type='button'
								onClick={() => signOut({ callbackUrl: '/sk' })}
								aria-label={t('signOutAria')}
								className='inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-icyWhite/75 hover:bg-white/8 hover:text-icyWhite transition-colors sm:px-3'
							>
								<LogOut className='h-4 w-4 shrink-0' aria-hidden />
								<span className='hidden md:inline'>{t('signOut')}</span>
							</button>
						)}
					</div>
				</div>
			</header>

			<AdminDrawer
				open={open}
				onClose={close}
				locale={locale}
				place={place}
				section={section}
				activeGlobal={activeGlobal}
				userEmail={session?.user?.email ?? null}
				calendarTbdBadge={calendarTbdBadge}
				calendarDayBadge={calendarDayBadge}
			/>
		</>
	)
}

interface AdminDrawerProps {
	open: boolean
	onClose: () => void
	locale: string
	place: AdminPlace | null
	section?: AdminSection
	activeGlobal?: AdminGlobalRoute
	userEmail: string | null
	calendarTbdBadge: number
	calendarDayBadge: number
}

const PLACE_SECTIONS: { id: AdminSection; labelKey: string; icon: ElementType }[] = [
	{ id: 'calendar', labelKey: 'calendar', icon: Calendar },
	{ id: 'agenda', labelKey: 'agenda', icon: CalendarRange },
	{ id: 'analytics', labelKey: 'analytics', icon: BarChart2 },
	{ id: 'price', labelKey: 'priceCatalog', icon: Banknote },
	{ id: 'settings', labelKey: 'settings', icon: Settings },
]

function AdminDrawer({
	open,
	onClose,
	locale,
	place,
	section,
	activeGlobal,
	userEmail,
	calendarTbdBadge,
	calendarDayBadge,
}: AdminDrawerProps) {
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')

	if (!open) return null

	const sectionHref = (p: AdminPlace, id: AdminSection) =>
		id === 'calendar'
			? `/${locale}/admin/${p}`
			: `/${locale}/admin/${p}/${id}`

	const bookingUrl = `/${locale}/${place ?? 'depilation'}/booking`

	const isSectionActive = (p: AdminPlace, id: AdminSection) =>
		!activeGlobal && place === p && section === id

	return (
		<div
			className='fixed inset-0 z-[60]'
			role='dialog'
			aria-modal='true'
			aria-label={t('openMenuAria')}
		>
			<button
				type='button'
				onClick={onClose}
				aria-label={t('closeMenuAria')}
				className='absolute inset-0 bg-nearBlack/70 backdrop-blur-[2px] animate-in fade-in-0 duration-150'
			/>
			<aside className='absolute left-0 top-0 flex h-full w-full max-w-[20rem] flex-col bg-nearBlack text-icyWhite shadow-2xl shadow-black/60 animate-in slide-in-from-left-4 fade-in-0 duration-200'>
				<div className='flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]'>
					<Link
						href={`/${locale}/admin`}
						onClick={onClose}
						title={t('drawerSwitchStudio')}
						className='flex flex-col gap-0.5 rounded-md -ml-1 px-1 py-0.5 hover:bg-white/5 transition-colors'
					>
						<span className='font-serif text-base text-icyWhite'>
							{t('admin')}
						</span>
						{place && (
							<span className='text-[11px] text-icyWhite/55'>
								{tCommon(place)} · {t('drawerSwitchStudio')}
							</span>
						)}
					</Link>
					<button
						type='button'
						onClick={onClose}
						aria-label={t('closeMenuAria')}
						className='inline-flex h-10 w-10 items-center justify-center rounded-full text-icyWhite/70 hover:bg-white/8 hover:text-icyWhite transition-colors'
					>
						<X className='h-5 w-5' />
					</button>
				</div>

				<nav className='flex-1 overflow-y-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
					{userEmail && (
						<div className='mb-3 px-2 text-xs text-icyWhite/55 truncate'>
							{userEmail}
						</div>
					)}

					{place && (
						<>
							<SectionHeader>{tCommon(place)}</SectionHeader>
							<ul className='mb-4 space-y-1'>
								{PLACE_SECTIONS.map(item => {
									const isActive = isSectionActive(place, item.id)
									const Icon = item.icon
									const showBadge =
										item.id === 'calendar' &&
										(calendarTbdBadge > 0 || calendarDayBadge > 0)
									return (
										<li key={item.id}>
											<Link
												href={sectionHref(place, item.id)}
												onClick={onClose}
												className={drawerLinkClass(isActive)}
											>
												<Icon className='h-4 w-4 shrink-0' aria-hidden />
												<span className='flex-1 truncate'>
													{t(item.labelKey)}
												</span>
												{showBadge && (
													<DrawerBadges
														tbd={calendarTbdBadge}
														day={calendarDayBadge}
													/>
												)}
											</Link>
										</li>
									)
								})}
							</ul>
						</>
					)}

					<SectionHeader>{t('drawerGlobal')}</SectionHeader>
					<ul className='mb-4 space-y-1'>
						<li>
							<Link
								href={`/${locale}/admin/clients`}
								onClick={onClose}
								className={drawerLinkClass(activeGlobal === 'clients')}
							>
								<Users className='h-4 w-4 shrink-0' aria-hidden />
								<span className='flex-1 truncate'>{t('clientsTitle')}</span>
							</Link>
						</li>
					</ul>

					<SectionHeader>{t('drawerUtilities')}</SectionHeader>
					<ul className='space-y-1'>
						<li>
							<a
								href={bookingUrl}
								target='_blank'
								rel='noopener noreferrer'
								onClick={onClose}
								className={drawerLinkClass(false)}
							>
								<ExternalLink className='h-4 w-4 shrink-0' aria-hidden />
								<span className='flex-1 truncate'>{t('publicBooking')}</span>
							</a>
						</li>
						<li>
							<Link
								href={
									place
										? `/${locale}/admin/help?place=${place}`
										: `/${locale}/admin/help`
								}
								onClick={onClose}
								className={drawerLinkClass(false)}
							>
								<BookOpen className='h-4 w-4 shrink-0' aria-hidden />
								<span className='flex-1 truncate'>{t('helpManual')}</span>
							</Link>
						</li>
						<li>
							<button
								type='button'
								onClick={() => {
									onClose()
									signOut({ callbackUrl: '/sk' })
								}}
								className={clsx(drawerLinkClass(false), 'w-full text-left')}
							>
								<LogOut className='h-4 w-4 shrink-0' aria-hidden />
								<span className='flex-1 truncate'>{t('signOut')}</span>
							</button>
						</li>
					</ul>
				</nav>
			</aside>
		</div>
	)
}

function drawerLinkClass(active: boolean): string {
	return clsx(
		'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors border',
		active
			? 'bg-gold-soft/15 text-gold-glow border-gold-soft/35'
			: 'text-icyWhite/80 hover:bg-white/[0.05] hover:text-icyWhite border-transparent',
	)
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className='mb-2 mt-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-icyWhite/40'>
			{children}
		</div>
	)
}

function DrawerBadges({ tbd, day }: { tbd: number; day: number }) {
	return (
		<span className='flex shrink-0 gap-1'>
			{tbd > 0 && <Badge tone='red' value={tbd} />}
			{day > 0 && <Badge tone='amber' value={day} />}
		</span>
	)
}

function Badge({ tone, value }: { tone: 'red' | 'amber'; value: number }) {
	return (
		<span
			className={clsx(
				'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4',
				tone === 'red' && 'bg-red-500 text-white',
				tone === 'amber' && 'bg-amber-500 text-nearBlack',
			)}
		>
			{value > 99 ? '99+' : value}
		</span>
	)
}
