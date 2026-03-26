'use client'

import AdminAppointmentModal from '@/components/AdminAppointmentModal'
import AdminAvailabilityManager from '@/components/AdminAvailabilityManager'
import AdminPriceCatalog from '@/components/AdminPriceCatalog'
import BookingCalendarGrid from '@/components/BookingCalendarGrid'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { getPrepBufferMinutes } from '@/lib/availability-firestore'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { AppointmentData } from '@/lib/book-appointment'
import { db } from '@/lib/firebase'
import { formatDate, formatTime } from '@/lib/format-date'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import type { ServiceData } from '@/lib/services'
import { clsx } from 'clsx'
import {
	collection,
	onSnapshot,
	orderBy,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import {
	Banknote,
	BarChart2,
	Calendar,
	CalendarRange,
	ChevronLeft,
	ExternalLink,
	FileDown,
	Info,
	LogOut,
	Menu,
	Search,
	Settings,
	X,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type AdminSection = 'calendar' | 'settings' | 'agenda' | 'analytics' | 'price'

function toAppointmentData(doc: {
	id: string
	data: () => Record<string, unknown>
}): AppointmentData {
	const d = doc.data()
	return {
		id: doc.id,
		startTime: (d.startTime as Timestamp) ?? new Date(),
		endTime: (d.endTime as Timestamp) ?? new Date(),
		service: (d.service as string) ?? '',
		serviceId: d.serviceId as string | undefined,
		fullName: (d.fullName as string) ?? '',
		email: (d.email as string) ?? '',
		phone: (d.phone as string) ?? '',
		place: (d.place as Place) ?? 'massage',
		createdAt: d.createdAt as Timestamp | undefined,
		scheduleTbd: d.scheduleTbd === true,
		scheduleTbdAdminHint: d.scheduleTbdAdminHint as string | undefined,
	}
}

interface AdminPlacePageProps {
	place: Place
	section?: AdminSection
}

export default function AdminPlacePage({
	place,
	section: sectionProp = 'calendar',
}: AdminPlacePageProps) {
	const params = useParams()
	const rawLocale = (params?.locale as string) ?? 'ru'
	const baseLocale = rawLocale.slice(0, 2) as 'sk' | 'en' | 'ru' | 'uk'
	const locale: 'sk' | 'en' | 'ru' | 'uk' =
		baseLocale === 'sk' ||
		baseLocale === 'en' ||
		baseLocale === 'ru' ||
		baseLocale === 'uk'
			? baseLocale
			: 'ru'
	const currentLocale = useLocale() as string
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const { data: session } = useSession()

	const placeLabel = tCommon(place === 'massage' ? 'massage' : 'depilation')
	const ui = useMemo(() => getPlaceAccentUi(place), [place])
	const section = sectionProp
	const navItems: {
		id: AdminSection
		label: string
		icon: React.ElementType
	}[] = [
		{ id: 'calendar', label: t('calendar'), icon: Calendar },
		{ id: 'agenda', label: t('agenda'), icon: CalendarRange },
		{ id: 'analytics', label: t('analytics'), icon: BarChart2 },
		{ id: 'price' as const, label: t('priceCatalog'), icon: Banknote },
		{ id: 'settings', label: t('settings'), icon: Settings },
	]
	const [services, setServices] = useState<ServiceData[]>([])
	const [addModalOpen, setAddModalOpen] = useState(false)
	const [editModalOpen, setEditModalOpen] = useState(false)
	const [editSlot, setEditSlot] = useState<{
		date: Date
		hour: number
		minute: number
	} | null>(null)
	const [editAppointment, setEditAppointment] =
		useState<AppointmentData | null>(null)

	const bookingUrl =
		place === 'massage'
			? `/${locale}/massage/booking`
			: `/${locale}/depilation/booking`
	const [schedule, setSchedule] = useState<Awaited<
		ReturnType<typeof getSchedule>
	> | null>(null)
	const [agendaAppointments, setAgendaAppointments] = useState<
		AppointmentData[]
	>([])
	const [agendaTbd, setAgendaTbd] = useState<AppointmentData[]>([])
	const [allAppointments, setAllAppointments] = useState<AppointmentData[]>([])
	const [analyticsSearch, setAnalyticsSearch] = useState('')
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const prepBuffer = getPrepBufferMinutes(schedule)

	const filteredAnalytics = allAppointments.filter(apt => {
		if (apt.scheduleTbd) return false
		if (!analyticsSearch.trim()) return true
		const q = analyticsSearch.toLowerCase().trim()
		const name = (apt.fullName ?? '').toLowerCase()
		const phone = (apt.phone ?? '').replace(/\s/g, '')
		const phoneNorm = phone.replace(/[\s\-\(\)]/g, '')
		const qNorm = q.replace(/[\s\-\(\)]/g, '')
		return name.includes(q) || phone.includes(q) || phoneNorm.includes(qNorm)
	})

	const exportAnalyticsPdf = useCallback(() => {
		const doc = new jsPDF({ orientation: 'landscape' })
		doc.setFontSize(14)
		doc.text(t('analytics') + ' - ' + placeLabel, 14, 15)
		doc.setFontSize(10)
		autoTable(doc, {
			head: [
				[
					tCommon('date'),
					tCommon('time'),
					tCommon('services'),
					t('customer'),
					t('emailHeader'),
					t('phoneHeader'),
				],
			],
			body: filteredAnalytics.map(apt => {
				const start =
					apt.startTime && 'toDate' in apt.startTime
						? apt.startTime.toDate()
						: new Date(apt.startTime as Date)
				return [
					formatDate(start, { locale: currentLocale }),
					formatTime(start, { locale: currentLocale }),
					apt.service,
					apt.fullName || '—',
					apt.email || '—',
					apt.phone || '—',
				]
			}),
			startY: 22,
			theme: 'grid',
			headStyles: { fillColor: [232, 184, 0] },
		})
		doc.save(`analytics-${place}-${new Date().toISOString().slice(0, 10)}.pdf`)
	}, [filteredAnalytics, place, placeLabel, t, tCommon, currentLocale])

	useEffect(() => {
		getSchedule(place)
			.then(setSchedule)
			.catch(() => setSchedule(null))
	}, [place])

	useEffect(() => {
		const q = query(
			collection(db, 'services'),
			where('place', '==', place),
			orderBy('title', 'asc'),
		)
		const unsub = onSnapshot(q, snapshot => {
			const list: ServiceData[] = snapshot.docs.map(d => {
				const data = d.data()
				const key = `title${locale.charAt(0).toUpperCase()}${locale.slice(
					1,
				)}` as 'titleSk' | 'titleEn' | 'titleRu' | 'titleUk'
				const localizedTitle =
					(data[key] as string | undefined) ?? (data.title as string) ?? ''
				return {
					id: d.id,
					title: localizedTitle,
					titleSk: data.titleSk as string | undefined,
					titleEn: data.titleEn as string | undefined,
					titleRu: data.titleRu as string | undefined,
					titleUk: data.titleUk as string | undefined,
					color: (data.color as string) ?? 'bg-gray-500/30 border-gray-500/60',
					durationMinutes: (data.durationMinutes as number) ?? 60,
				}
			})
			setServices(list)
		})
		return () => unsub()
	}, [place, locale])

	useEffect(() => {
		const startOfToday = new Date()
		startOfToday.setHours(0, 0, 0, 0)
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			where('startTime', '>=', startOfToday),
			orderBy('startTime', 'asc'),
		)
		const unsub = onSnapshot(q, snapshot => {
			setAgendaAppointments(
				snapshot.docs
					.filter(doc => doc.data().scheduleTbd !== true)
					.map(doc =>
						toAppointmentData({ id: doc.id, data: () => doc.data() }),
					),
			)
		})
		return () => unsub()
	}, [place])

	useEffect(() => {
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			where('scheduleTbd', '==', true),
		)
		const unsub = onSnapshot(q, snapshot => {
			setAgendaTbd(
				snapshot.docs.map(doc =>
					toAppointmentData({ id: doc.id, data: () => doc.data() }),
				),
			)
		})
		return () => unsub()
	}, [place])

	useEffect(() => {
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			orderBy('startTime', 'asc'),
		)
		const unsub = onSnapshot(q, snapshot => {
			const list = snapshot.docs.map(doc =>
				toAppointmentData({ id: doc.id, data: () => doc.data() }),
			)
			setAllAppointments([...list].reverse())
		})
		return () => unsub()
	}, [place])

	const handleEditAppointment = useCallback((appointment: AppointmentData) => {
		setEditAppointment(appointment)
		setEditSlot(null)
		setEditModalOpen(true)
	}, [])

	const openAddAppointment = useCallback(() => {
		const today = new Date()
		setEditSlot({ date: today, hour: 9, minute: 0 })
		setEditAppointment(null)
		setAddModalOpen(true)
	}, [])

	return (
		<main className='min-h-screen bg-nearBlack text-icyWhite flex flex-col'>
			<header
				className={clsx(
					'sticky top-0 z-40 bg-nearBlack/95 backdrop-blur-md',
					ui.adminHeaderBar,
				)}
			>
				<div className='flex items-center justify-between gap-3 px-4 h-16 min-h-16 sm:px-6 lg:px-8'>
					<div className='flex min-w-0 shrink items-center gap-4'>
						<Link
							href={`/${locale}/admin`}
							aria-label={t('backToCabinet')}
							className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-icyWhite/80 ${ui.backHover} hover:bg-white/5 transition-colors`}
						>
							<ChevronLeft className='h-4 w-4 shrink-0' />
						</Link>
						<span className='hidden shrink-0 text-icyWhite/40 sm:inline'>
							|
						</span>
						<span className='hidden shrink-0 font-serif text-lg text-icyWhite sm:inline'>
							{placeLabel}
						</span>
						<nav className='hidden shrink-0 gap-1 sm:flex'>
							{navItems.map(({ id, label, icon: Icon }) => (
								<Link
									key={id}
									href={
										id === 'calendar'
											? `/${locale}/admin/${place}`
											: `/${locale}/admin/${place}/${id}`
									}
									className={clsx(
										'flex min-w-[4rem] items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap sm:min-w-[5.5rem]',
										section === id
											? ui.navLinkActive
											: 'text-icyWhite/70 hover:text-icyWhite hover:bg-white/5',
									)}
								>
									<Icon className='h-4 w-4 shrink-0' />
									<span className='hidden truncate sm:inline'>{label}</span>
								</Link>
							))}
						</nav>
					</div>
					<div className='flex shrink-0 items-center gap-2'>
						<LanguageSwitcher variant='admin' />
						<button
							type='button'
							onClick={() => setIsMobileMenuOpen(prev => !prev)}
							className='inline-flex items-center justify-center rounded-lg p-1.5 text-icyWhite/80 hover:text-icyWhite hover:bg-white/5 transition-colors sm:hidden'
							aria-label={
								isMobileMenuOpen ? t('closeMenuAria') : t('openMenuAria')
							}
						>
							{isMobileMenuOpen ? (
								<X className='h-5 w-5' />
							) : (
								<Menu className='h-5 w-5' />
							)}
						</button>
						<div className='hidden items-center gap-3 sm:flex'>
							<Link
								href={bookingUrl}
								target='_blank'
								rel='noopener noreferrer'
								className={`flex min-w-[5rem] shrink-0 items-center gap-1.5 text-sm text-icyWhite/70 ${ui.publicBookingHover} transition-colors whitespace-nowrap sm:min-w-[7.5rem]`}
							>
								<ExternalLink className='h-4 w-4 shrink-0' />
								<span className='hidden truncate sm:inline'>
									{t('publicBooking')}
								</span>
							</Link>
							<div className='flex shrink-0 items-center gap-3 border-l border-white/10 pl-3'>
								{session?.user && (
									<span className='hidden max-w-[140px] truncate text-sm text-icyWhite/60 md:inline'>
										{session.user.email}
									</span>
								)}
								<button
									type='button'
									onClick={() => signOut({ callbackUrl: '/sk' })}
									className='flex min-w-[4.5rem] shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-sm text-icyWhite/70 hover:text-icyWhite hover:bg-white/5 transition-colors whitespace-nowrap sm:min-w-[6rem]'
									aria-label={t('signOutAria')}
								>
									<LogOut className='h-4 w-4 shrink-0' />
									<span className='hidden truncate sm:inline'>
										{t('signOut')}
									</span>
								</button>
							</div>
						</div>
					</div>
				</div>
				{isMobileMenuOpen && (
					<div
						className={`absolute inset-x-0 top-full z-50 bg-nearBlack text-icyWhite px-4 pb-4 pt-3 shadow-xl animate-in slide-in-from-top-2 fade-in-0 duration-200 sm:hidden ${ui.mobileMenuBorder}`}
					>
						<div className='mb-3 text-right'>
							<span className='block font-serif text-base text-icyWhite'>
								{placeLabel}
							</span>
						</div>
						<nav className='mb-3 flex flex-col gap-2 items-end text-right'>
							{navItems.map(({ id, label, icon: Icon }) => (
								<Link
									key={id}
									href={
										id === 'calendar'
											? `/${locale}/admin/${place}`
											: `/${locale}/admin/${place}/${id}`
									}
									className={clsx(
										'flex w-full max-w-xs items-center justify-end gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
										section === id
											? ui.navLinkActiveMobile
											: 'text-icyWhite/80 hover:text-icyWhite hover:bg-white/5',
									)}
									onClick={() => setIsMobileMenuOpen(false)}
								>
									<span className='truncate'>{label}</span>
									<Icon className='h-4 w-4 shrink-0' />
								</Link>
							))}
						</nav>
						<div className='flex flex-col gap-3 items-end text-right'>
							{session?.user && (
								<span className='max-w-xs truncate text-xs text-icyWhite/70'>
									{session.user.email}
								</span>
							)}
							<Link
								href={bookingUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex w-full max-w-xs items-center justify-end gap-1.5 rounded-lg px-3 py-2 text-sm text-icyWhite/90 hover:text-icyWhite hover:bg-white/5 transition-colors'
							>
								<span className='truncate'>{t('publicBooking')}</span>
								<ExternalLink className='h-4 w-4 shrink-0' />
							</Link>
							<button
								type='button'
								onClick={() => signOut({ callbackUrl: '/sk' })}
								className='inline-flex w-full max-w-xs items-center justify-end gap-1.5 rounded-lg px-3 py-2 text-sm text-icyWhite/90 hover:text-icyWhite hover:bg-white/5 transition-colors'
								aria-label={t('signOutAria')}
							>
								<span className='truncate'>{t('signOut')}</span>
								<LogOut className='h-4 w-4 shrink-0' />
							</button>
						</div>
					</div>
				)}
			</header>

			<div
				className={clsx(
					'relative flex-1',
					place === 'depilation' && 'noise-overlay',
				)}
			>
				{place === 'depilation' && (
					<div
						className='pointer-events-none absolute inset-0 overflow-hidden'
						aria-hidden
					>
						<div className='absolute -top-1/4 -right-1/4 h-[min(600px,80vw)] w-[min(600px,80vw)] rounded-full bg-gold-soft/[0.04] blur-[120px]' />
						<div className='absolute -bottom-1/4 -left-1/4 h-[min(480px,70vw)] w-[min(480px,70vw)] rounded-full bg-gold-soft/[0.03] blur-[100px]' />
					</div>
				)}
				<div className={ui.adminMainContent}>
				{section === 'calendar' && (
					<div className='space-y-4 animate-in fade-in-0 duration-200'>
						<div>
							<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
								{t('appointments')}
							</h1>
							<p className='text-icyWhite/60 text-sm mt-0.5'>
								{t('appointmentsSubtitle')}
							</p>
							<p className='text-icyWhite/40 text-xs mt-0.5 flex items-center gap-1.5'>
								<span
									title={t('prepBufferInfoTitle', { minutes: prepBuffer })}
									className={`inline-flex cursor-help rounded-full p-0.5 text-icyWhite/50 transition-colors ${ui.infoHover}`}
									aria-label={t('prepBufferInfoTitle', { minutes: prepBuffer })}
								>
									<Info className='h-3.5 w-3.5' />
								</span>
								{t('prepBufferNote', { minutes: prepBuffer })}
							</p>
						</div>

						<div className={ui.adminPanel}>
							<BookingCalendarGrid
								allowCancel
								allowDrag
								onEditAppointment={handleEditAppointment}
								services={services}
								place={place}
							/>
						</div>
					</div>
				)}

				{section === 'agenda' && (
					<div className='space-y-6 animate-in fade-in-0 duration-200'>
						<div>
							<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
								{t('agenda')}
							</h1>
							<p className='text-icyWhite/60 text-sm mt-0.5'>
								{t('agendaSubtitle')}
							</p>
						</div>
						<div className={ui.adminPanel}>
							{agendaAppointments.length === 0 && agendaTbd.length === 0 ? (
								<div className='p-12 text-center text-icyWhite/50'>
									{t('noUpcomingAppointments')}
								</div>
							) : (
								<>
									{agendaTbd.length > 0 && (
										<>
											<p className='px-4 pt-4 text-xs font-medium text-sky-200/90 uppercase tracking-wider'>
												{t('agendaUnscheduledTitle')}
											</p>
											<div className='space-y-3 p-4 sm:hidden'>
												{agendaTbd.map(apt => {
													const end =
														apt.endTime && 'toDate' in apt.endTime
															? apt.endTime.toDate()
															: new Date(apt.endTime as Date)
													const start =
														apt.startTime && 'toDate' in apt.startTime
															? apt.startTime.toDate()
															: new Date(apt.startTime as Date)
													const duration = Math.round(
														(end.getTime() - start.getTime()) / 60000,
													)
													return (
														<div
															key={apt.id}
															className='rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-icyWhite space-y-1.5'
														>
															<div className='flex items-center justify-between gap-2'>
																<span className='font-medium text-sky-100/95'>
																	{t('agendaTbdNoDate')}
																</span>
																<span className='text-xs text-icyWhite/60'>
																	{duration}m
																</span>
															</div>
															<div className='text-icyWhite'>{apt.service}</div>
															<div className='text-xs text-icyWhite/70'>
																{apt.fullName || '—'}
															</div>
															{apt.scheduleTbdAdminHint?.trim() && (
																<div className='text-[11px] text-icyWhite/55 whitespace-pre-wrap'>
																	{apt.scheduleTbdAdminHint.trim()}
																</div>
															)}
															<div className='text-[11px] text-icyWhite/60 flex flex-col gap-0.5'>
																<span>{apt.email || '—'}</span>
																<span>{apt.phone || '—'}</span>
															</div>
														</div>
													)
												})}
											</div>
										</>
									)}
									<div className='space-y-3 p-4 sm:hidden'>
										{agendaAppointments.map(apt => {
											const start =
												apt.startTime && 'toDate' in apt.startTime
													? apt.startTime.toDate()
													: new Date(apt.startTime as Date)
											const end =
												apt.endTime && 'toDate' in apt.endTime
													? apt.endTime.toDate()
													: new Date(apt.endTime as Date)
											const duration = Math.round(
												(end.getTime() - start.getTime()) / 60000,
											)
											return (
												<div
													key={apt.id}
													className='rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-icyWhite space-y-1.5'
												>
													<div className='flex items-center justify-between gap-2'>
														<span className='font-medium'>
															{formatDate(start, { locale: currentLocale })} ·{' '}
															{formatTime(start, { locale: currentLocale })}
														</span>
														<span className='text-xs text-icyWhite/60'>
															{duration}m
														</span>
													</div>
													<div className='text-icyWhite'>{apt.service}</div>
													<div className='text-xs text-icyWhite/70'>
														{apt.fullName || '—'}
													</div>
													<div className='text-[11px] text-icyWhite/60 flex flex-col gap-0.5'>
														<span>{apt.email || '—'}</span>
														<span>{apt.phone || '—'}</span>
													</div>
												</div>
											)
										})}
									</div>
									<div className='hidden sm:block'>
										<div className='overflow-x-auto'>
											<table className='w-full text-left'>
												<thead>
													<tr className='border-b border-white/10 bg-white/[0.02]'>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('date')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('time')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('services')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{t('customer')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden md:table-cell'>
															{t('emailHeader')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden lg:table-cell'>
															{t('phoneHeader')}
														</th>
													</tr>
												</thead>
												<tbody>
													{agendaTbd.map(apt => {
														const start =
															apt.startTime && 'toDate' in apt.startTime
																? apt.startTime.toDate()
																: new Date(apt.startTime as Date)
														const end =
															apt.endTime && 'toDate' in apt.endTime
																? apt.endTime.toDate()
																: new Date(apt.endTime as Date)
														const duration = Math.round(
															(end.getTime() - start.getTime()) / 60000,
														)
														return (
															<tr
																key={apt.id}
																className='border-b border-sky-500/20 bg-sky-500/[0.04] hover:bg-sky-500/[0.07] transition-colors'
															>
																<td className='px-4 py-3 text-sm text-sky-100/90'>
																	{t('agendaTbdNoDate')}
																</td>
																<td className='px-4 py-3 text-sm text-sky-100/80'>
																	—
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<span>{apt.service}</span>
																	<span className='text-icyWhite/50 text-xs ml-1'>
																		({duration}m)
																	</span>
																	{apt.scheduleTbdAdminHint?.trim() && (
																		<div className='text-[11px] text-icyWhite/50 mt-1 max-w-md whitespace-pre-wrap'>
																			{apt.scheduleTbdAdminHint.trim()}
																		</div>
																	)}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{apt.fullName || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell'>
																	{apt.email || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden lg:table-cell'>
																	{apt.phone || '—'}
																</td>
															</tr>
														)
													})}
													{agendaAppointments.map(apt => {
														const start =
															apt.startTime && 'toDate' in apt.startTime
																? apt.startTime.toDate()
																: new Date(apt.startTime as Date)
														const end =
															apt.endTime && 'toDate' in apt.endTime
																? apt.endTime.toDate()
																: new Date(apt.endTime as Date)
														const duration = Math.round(
															(end.getTime() - start.getTime()) / 60000,
														)
														return (
															<tr
																key={apt.id}
																className='border-b border-white/5 hover:bg-white/[0.02] transition-colors'
															>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatDate(start, { locale: currentLocale })}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatTime(start, { locale: currentLocale })}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<span>{apt.service}</span>
																	<span className='text-icyWhite/50 text-xs ml-1'>
																		({duration}m)
																	</span>
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{apt.fullName || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell'>
																	{apt.email || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden lg:table-cell'>
																	{apt.phone || '—'}
																</td>
															</tr>
														)
													})}
												</tbody>
											</table>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{section === 'analytics' && (
					<div className='space-y-6 animate-in fade-in-0 duration-200'>
						<div>
							<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
								{t('analytics')}
							</h1>
							<p className='text-icyWhite/60 text-sm mt-0.5'>
								{t('analyticsSubtitle')}
							</p>
						</div>
						<div className='flex flex-col sm:flex-row gap-4'>
							<div className='relative flex-1'>
								<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icyWhite/50' />
								<input
									type='search'
									value={analyticsSearch}
									onChange={e => setAnalyticsSearch(e.target.value)}
									placeholder={t('searchByNameOrPhone')}
									className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite placeholder:text-icyWhite/40 focus:outline-none focus:ring-2 ${ui.analyticsSearchFocus}`}
								/>
							</div>
							<button
								type='button'
								onClick={exportAnalyticsPdf}
								className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${ui.analyticsExportBtn}`}
							>
								<FileDown className='h-4 w-4' />
								{t('exportPdf')}
							</button>
						</div>
						<div className={ui.adminPanel}>
							{filteredAnalytics.length === 0 ? (
								<div className='p-12 text-center text-icyWhite/50'>
									{analyticsSearch.trim()
										? t('noSearchResults')
										: t('noCustomersYet')}
								</div>
							) : (
								<>
									<div className='space-y-3 p-4 sm:hidden'>
										{filteredAnalytics.map(apt => {
											const start =
												apt.startTime && 'toDate' in apt.startTime
													? apt.startTime.toDate()
													: new Date(apt.startTime as Date)
											const end =
												apt.endTime && 'toDate' in apt.endTime
													? apt.endTime.toDate()
													: new Date(apt.endTime as Date)
											const duration = Math.round(
												(end.getTime() - start.getTime()) / 60000,
											)
											return (
												<div
													key={apt.id}
													className='rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-icyWhite space-y-1.5'
												>
													<div className='flex items-center justify-between gap-2'>
														<span className='font-medium'>
															{formatDate(start, { locale: currentLocale })} ·{' '}
															{formatTime(start, { locale: currentLocale })}
														</span>
														<span className='text-xs text-icyWhite/60'>
															{duration}m
														</span>
													</div>
													<div className='text-icyWhite'>{apt.service}</div>
													<div className='text-xs text-icyWhite/70'>
														{apt.fullName || '—'}
													</div>
													<div className='text-[11px] text-icyWhite/60 flex flex-col gap-0.5'>
														<span>{apt.email || '—'}</span>
														<span>{apt.phone || '—'}</span>
													</div>
												</div>
											)
										})}
									</div>
									<div className='hidden sm:block'>
										<div className='overflow-x-auto'>
											<table className='w-full text-left'>
												<thead>
													<tr className='border-b border-white/10 bg-white/[0.02]'>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('date')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('time')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{tCommon('services')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider'>
															{t('customer')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden md:table-cell'>
															{t('emailHeader')}
														</th>
														<th className='px-4 py-3 text-xs font-medium text-icyWhite/60 uppercase tracking-wider hidden lg:table-cell'>
															{t('phoneHeader')}
														</th>
													</tr>
												</thead>
												<tbody>
													{filteredAnalytics.map(apt => {
														const start =
															apt.startTime && 'toDate' in apt.startTime
																? apt.startTime.toDate()
																: new Date(apt.startTime as Date)
														const end =
															apt.endTime && 'toDate' in apt.endTime
																? apt.endTime.toDate()
																: new Date(apt.endTime as Date)
														const duration = Math.round(
															(end.getTime() - start.getTime()) / 60000,
														)
														return (
															<tr
																key={apt.id}
																className='border-b border-white/5 hover:bg-white/[0.02] transition-colors'
															>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatDate(start, { locale: currentLocale })}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatTime(start, { locale: currentLocale })}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<span>{apt.service}</span>
																	<span className='text-icyWhite/50 text-xs ml-1'>
																		({duration}m)
																	</span>
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{apt.fullName || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden md:table-cell'>
																	{apt.email || '—'}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite/80 hidden lg:table-cell'>
																	{apt.phone || '—'}
																</td>
															</tr>
														)
													})}
												</tbody>
											</table>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{section === 'settings' && (
					<div className='space-y-8 animate-in fade-in-0 duration-200'>
						<div>
							<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
								{t('settings')}
							</h1>
							<p className='text-icyWhite/60 text-sm mt-0.5'>
								{t('settingsSubtitle', { place: placeLabel })}
							</p>
						</div>
						<div
							className={clsx(
								'space-y-6',
								place === 'massage' && 'max-w-5xl mx-auto',
								place === 'depilation' && 'max-w-6xl mx-auto w-full',
							)}
						>
							<section>
								<h2 className='font-medium text-icyWhite mb-2'>
									{tCommon('services')}
								</h2>
								<p className='text-sm text-icyWhite/60 mb-4 max-w-2xl leading-relaxed'>
									{t('servicesManagedInPriceCatalog')}
								</p>
								<Link
									href={`/${locale}/admin/${place}/price`}
									className={clsx(
										'inline-flex items-center gap-2 text-sm font-medium transition-colors',
										ui.priceCatalogLinkSm,
									)}
								>
									{t('openPriceCatalogForServices')}
								</Link>
							</section>
							<section>
								<h2 className='font-medium text-icyWhite mb-2'>
									{t('workingHours')}
								</h2>
								<p className='text-sm text-icyWhite/60 mb-3'>
									{t('manageWorkingHoursNote')}
								</p>
								<div className={ui.adminPanel}>
									<AdminAvailabilityManager
										place={place}
										schedule={schedule}
										onScheduleChange={setSchedule}
										appointments={allAppointments.filter(
											a => a.place === place,
										)}
									/>
								</div>
							</section>
						</div>
					</div>
				)}

				{section === 'price' && (
					<div className='animate-in fade-in-0 duration-200 w-full'>
						<AdminPriceCatalog place={place} />
					</div>
				)}
				</div>
			</div>

			{section === 'calendar' && (
				<button
					type='button'
					onClick={openAddAppointment}
					aria-label={t('addAppointment')}
					className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full font-medium hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nearBlack ${ui.fab}`}
				>
					<span className='text-lg leading-none'>+</span>
					{t('addAppointment')}
				</button>
			)}

			<AdminAppointmentModal
				isOpen={addModalOpen}
				onClose={() => {
					setAddModalOpen(false)
					setEditSlot(null)
				}}
				mode='add'
				defaultDate={editSlot?.date}
				defaultHour={editSlot?.hour}
				defaultMinute={editSlot?.minute}
				services={services}
				place={place}
			/>

			<AdminAppointmentModal
				isOpen={editModalOpen}
				onClose={() => {
					setEditModalOpen(false)
					setEditAppointment(null)
				}}
				mode='edit'
				appointment={editAppointment}
				services={services}
				place={place}
			/>
		</main>
	)
}
