'use client'

import AdminAppointmentModal from '@/components/AdminAppointmentModal'
import AdminAvailabilityManager, {
	type AdminAvailabilityManagerHandle,
} from '@/components/AdminAvailabilityManager'
import AdminPriceCatalog, {
	type AdminPriceCatalogHandle,
} from '@/components/AdminPriceCatalog'
import BookingCalendarGrid from '@/components/BookingCalendarGrid'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { buildAdminCalendarServices } from '@/lib/admin-calendar-services'
import { getPrepBufferMinutes } from '@/lib/availability-firestore'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import {
	type AppointmentData,
	inferAdminBookingModeFromFirestore,
} from '@/lib/book-appointment'
import { db } from '@/lib/firebase'
import { formatDate, formatTime } from '@/lib/format-date'
import type { Place } from '@/lib/places'
import {
	subscribeSchedule,
	type ScheduleData,
} from '@/lib/schedule-firestore'
import {
	ADMIN_APPOINTMENT_FALLBACK_COLOR,
	findServiceDataForAppointment,
	resolveAppointmentRequiredFullDayCount,
	type ServiceData,
} from '@/lib/services'
import { resolvedOpaqueCalendarSlotFill } from '@/lib/section-calendar-colors'
import type { PriceCatalogStructure } from '@/types/price-catalog'
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
	BookOpen,
	Calendar,
	CalendarRange,
	ChevronLeft,
	ExternalLink,
	FileDown,
	Info,
	LogOut,
	Menu,
	Save,
	Search,
	Settings,
	X,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
	type ElementType,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

type AdminSection = 'calendar' | 'settings' | 'agenda' | 'analytics' | 'price'

type AdminNavItem = {
	id: AdminSection
	label: string
	icon: ElementType
	/** Calendar only: TBD = need date & time */
	calendarTbd?: number
	/** Calendar only: full-day rows still missing chosen days */
	calendarDays?: number
}

function agendaServiceSwatchClassName(
	apt: AppointmentData,
	services: ServiceData[],
): string {
	const svc = findServiceDataForAppointment(apt, services)
	return resolvedOpaqueCalendarSlotFill(
		svc?.color ?? '',
		ADMIN_APPOINTMENT_FALLBACK_COLOR,
	)
}

function AgendaServiceLine({
	apt,
	services,
	meta,
}: {
	apt: AppointmentData
	services: ServiceData[]
	meta?: ReactNode
}) {
	return (
		<span className='inline-flex items-start gap-2 min-w-0'>
			<span
				className={clsx(
					'mt-1 h-2.5 w-2.5 shrink-0 rounded-sm shadow-sm shadow-black/30',
					agendaServiceSwatchClassName(apt, services),
				)}
				aria-hidden
			/>
			<span className='min-w-0 flex-1'>
				<span className='text-icyWhite'>{apt.service}</span>
				{meta}
			</span>
		</span>
	)
}

function agendaMatchesSearch(apt: AppointmentData, raw: string): boolean {
	const q = raw.trim().toLowerCase()
	if (!q) return true
	const combined = [apt.fullName, apt.email, apt.phone, apt.service]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
	return combined.includes(q)
}

function toAppointmentData(doc: {
	id: string
	data: () => Record<string, unknown>
}): AppointmentData {
	const d = doc.data()
	const mode = inferAdminBookingModeFromFirestore(d as Record<string, unknown>)
	return {
		id: doc.id,
		startTime: (d.startTime as Timestamp) ?? new Date(),
		endTime: (d.endTime as Timestamp) ?? new Date(),
		adminBookingMode: mode,
		adminFullDayDates: Array.isArray(d.adminFullDayDates)
			? d.adminFullDayDates.filter(
					(value): value is string => typeof value === 'string',
				)
			: undefined,
		multiDayFullDayCount:
			mode === 'day'
				? Array.isArray(d.adminFullDayDates)
					? d.adminFullDayDates.filter(value => typeof value === 'string').length
					: Math.max(1, Math.min(14, Number(d.multiDayFullDayCount) || 1))
				: d.scheduleTbd === true &&
					  typeof d.multiDayFullDayCount === 'number' &&
					  d.multiDayFullDayCount >= 1
					? Math.min(14, Math.floor(d.multiDayFullDayCount))
					: undefined,
		service: (d.service as string) ?? '',
		serviceId: d.serviceId as string | undefined,
		fullName: (d.fullName as string) ?? '',
		email: (d.email as string) ?? '',
		phone: (d.phone as string) ?? '',
		place: (d.place as Place) ?? 'massage',
		createdAt: d.createdAt as Timestamp | undefined,
		scheduleTbd: d.scheduleTbd === true,
		scheduleTbdAdminHint: d.scheduleTbdAdminHint as string | undefined,
		adminNote: d.adminNote as string | undefined,
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
	/** Same shell as the calendar “add appointment” FAB; used for all primary admin actions. */
	const adminDockFabClass = clsx(
		'flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-nearBlack sm:px-5 max-w-[min(100vw-2rem,18rem)]',
		ui.fab,
	)
	const adminDockFabDisabled =
		'disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100'
	const section = sectionProp
	const navItems = useMemo<AdminNavItem[]>(
		() => [
			{ id: 'calendar', label: t('calendar'), icon: Calendar },
			{ id: 'agenda', label: t('agenda'), icon: CalendarRange },
			{ id: 'analytics', label: t('analytics'), icon: BarChart2 },
			{ id: 'price' as const, label: t('priceCatalog'), icon: Banknote },
			{ id: 'settings', label: t('settings'), icon: Settings },
		],
		[t],
	)
	const [services, setServices] = useState<ServiceData[]>([])
	const [calendarServices, setCalendarServices] = useState<ServiceData[]>([])
	const [addModalOpen, setAddModalOpen] = useState(false)
	const [editModalOpen, setEditModalOpen] = useState(false)
	const [editSlot, setEditSlot] = useState<{
		date: Date
		hour: number
		minute: number
	} | null>(null)
	const [editAppointment, setEditAppointment] =
		useState<AppointmentData | null>(null)
	const [agendaQuery, setAgendaQuery] = useState('')

	const bookingUrl =
		place === 'massage'
			? `/${locale}/massage/booking`
			: `/${locale}/depilation/booking`
	const [schedule, setSchedule] = useState<ScheduleData | null>(null)
	const [agendaAppointments, setAgendaAppointments] = useState<
		AppointmentData[]
	>([])
	const [agendaTbd, setAgendaTbd] = useState<AppointmentData[]>([])
	const [allAppointments, setAllAppointments] = useState<AppointmentData[]>([])
	const [analyticsSearch, setAnalyticsSearch] = useState('')
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const [availabilitySaving, setAvailabilitySaving] = useState(false)
	const [priceCatalogSaving, setPriceCatalogSaving] = useState(false)
	const availabilityManagerRef = useRef<AdminAvailabilityManagerHandle | null>(
		null,
	)
	const priceCatalogRef = useRef<AdminPriceCatalogHandle | null>(null)
	const prepBuffer = getPrepBufferMinutes(schedule)
	const addModalServices = calendarServices.length > 0 ? calendarServices : services

	/**
	 * Firestore-synced line items first (stable ids + colors from catalog sync), then
	 * synthetic catalog rows (`section:…`, `zone:…`) for the legend — no title-based
	 * dedupe so a section title never hides a bookable service with the same label.
	 */
	const calendarColorServices = useMemo(() => {
		const firestoreIds = new Set(services.map(s => s.id))
		return [
			...services,
			...calendarServices.filter(c => !firestoreIds.has(c.id)),
		]
	}, [calendarServices, services])

	const getServiceDayCount = useCallback(
		(apt: AppointmentData): number => {
			if (apt.adminBookingMode === 'day' || apt.scheduleTbd) {
				return resolveAppointmentRequiredFullDayCount(
					apt,
					findServiceDataForAppointment(apt, calendarColorServices),
				)
			}
			const match = findServiceDataForAppointment(apt, calendarColorServices)
			if (match?.bookingGranularity === 'day') {
				return match.bookingDayCount ?? 1
			}
			if (match?.bookingGranularity === 'tbd') {
				return match.bookingDayCount ?? 1
			}
			return 0
		},
		[calendarColorServices],
	)

	const formatAppointmentDateLabel = useCallback(
		(apt: AppointmentData, start: Date, end: Date) => {
			if (apt.adminBookingMode !== 'day') {
				return formatDate(start, { locale: currentLocale })
			}
			const dayCount = resolveAppointmentRequiredFullDayCount(
				apt,
				findServiceDataForAppointment(apt, calendarColorServices),
			)
			if (dayCount <= 1) {
				return formatDate(start, { locale: currentLocale })
			}
			return `${formatDate(start, { locale: currentLocale })} – ${formatDate(end, {
				locale: currentLocale,
			})}`
		},
		[currentLocale, calendarColorServices],
	)
	const formatAppointmentTimeLabel = useCallback(
		(apt: AppointmentData, start: Date) =>
			apt.adminBookingMode === 'day'
				? t('allDayNoClockTime')
				: formatTime(start, { locale: currentLocale }),
		[currentLocale, t],
	)
	const formatAppointmentMetaLabel = useCallback(
		(apt: AppointmentData, start: Date, end: Date) => {
			if (apt.adminBookingMode === 'day') {
				const count = resolveAppointmentRequiredFullDayCount(
					apt,
					findServiceDataForAppointment(apt, calendarColorServices),
				)
				return t('dayCountValue', { count })
			}
			return `${Math.round((end.getTime() - start.getTime()) / 60000)}m`
		},
		[t, calendarColorServices],
	)

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
	/** Waiting for a real date & time (TBD / unscheduled) */
	const calendarTbdNeedSlotCount = useMemo(
		() => allAppointments.filter(apt => apt.scheduleTbd === true).length,
		[allAppointments],
	)
	/** Full-day bookings with no chosen days yet (upcoming) */
	const calendarDayNeedDaysCount = useMemo(() => {
		const startOfToday = new Date()
		startOfToday.setHours(0, 0, 0, 0)
		return allAppointments.filter(apt => {
			if (apt.scheduleTbd) return false
			if (apt.adminBookingMode !== 'day') return false
			if ((apt.adminFullDayDates?.length ?? 0) > 0) return false
			const end =
				apt.endTime && 'toDate' in apt.endTime
					? apt.endTime.toDate()
					: new Date(apt.endTime as Date)
			return end >= startOfToday
		}).length
	}, [allAppointments])

	const navItemsWithBadges = useMemo(
		() =>
			navItems.map(item =>
				item.id === 'calendar'
					? {
							...item,
							calendarTbd: calendarTbdNeedSlotCount,
							calendarDays: calendarDayNeedDaysCount,
						}
					: item,
			),
		[navItems, calendarTbdNeedSlotCount, calendarDayNeedDaysCount],
	)

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
				const end =
					apt.endTime && 'toDate' in apt.endTime
						? apt.endTime.toDate()
						: new Date(apt.endTime as Date)
				return [
					formatAppointmentDateLabel(apt, start, end),
					formatAppointmentTimeLabel(apt, start),
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
	}, [
		filteredAnalytics,
		formatAppointmentDateLabel,
		formatAppointmentTimeLabel,
		place,
		placeLabel,
		t,
		tCommon,
	])

	useEffect(() => {
		return subscribeSchedule(place, setSchedule)
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
					color: (data.color as string) ?? 'bg-gray-500 border-gray-500',
					durationMinutes: (data.durationMinutes as number) ?? 60,
				}
			})
			setServices(list)
		})
		return () => unsub()
	}, [place, locale])

	useEffect(() => {
		let cancelled = false

		const loadCalendarServices = async () => {
			try {
				const res = await fetch(`/api/price-catalog?place=${place}`, {
					cache: 'no-store',
				})
				if (!res.ok) throw new Error('PRICE_CATALOG_FETCH_FAILED')
				const catalog = (await res.json()) as PriceCatalogStructure
				if (cancelled) return
				setCalendarServices(
					buildAdminCalendarServices(catalog, place, locale),
				)
			} catch {
				if (!cancelled) setCalendarServices([])
			}
		}

		void loadCalendarServices()
		return () => {
			cancelled = true
		}
	}, [place, locale, section])

	useEffect(() => {
		const startOfToday = new Date()
		startOfToday.setHours(0, 0, 0, 0)
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			orderBy('startTime', 'asc'),
		)
		const unsub = onSnapshot(q, snapshot => {
			setAgendaAppointments(
				snapshot.docs
					.filter(doc => doc.data().scheduleTbd !== true)
					.map(doc =>
						toAppointmentData({ id: doc.id, data: () => doc.data() }),
					)
					.filter(apt => {
						const end =
							apt.endTime && 'toDate' in apt.endTime
								? apt.endTime.toDate()
								: new Date(apt.endTime as Date)
						return end >= startOfToday
					}),
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

	const filteredAgendaAppointments = useMemo(
		() => agendaAppointments.filter(a => agendaMatchesSearch(a, agendaQuery)),
		[agendaAppointments, agendaQuery],
	)
	const filteredAgendaTbd = useMemo(
		() => agendaTbd.filter(a => agendaMatchesSearch(a, agendaQuery)),
		[agendaTbd, agendaQuery],
	)

	return (
		<main className='flex min-h-screen flex-col bg-nearBlack pb-[env(safe-area-inset-bottom,0px)] text-icyWhite'>
			<header
				className={clsx(
					'sticky top-0 z-40 bg-nearBlack/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md',
					ui.adminHeaderBar,
				)}
			>
				<div className='flex h-16 min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8'>
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
							{navItemsWithBadges.map(
								({
									id,
									label,
									icon: Icon,
									calendarTbd = 0,
									calendarDays = 0,
								}) => (
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
									<span className='relative inline-flex shrink-0'>
										<Icon className='h-4 w-4 shrink-0' />
										{id === 'calendar' &&
										(calendarTbd > 0 || calendarDays > 0) ? (
											<span className='absolute -right-1 -top-2 flex flex-row gap-0.5'>
												{calendarTbd > 0 ? (
													<span
														className='inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white'
														title={t('calendarBadgeTimeTitle')}
													>
														{calendarTbd > 99 ? '99+' : calendarTbd}
													</span>
												) : null}
												{calendarDays > 0 ? (
													<span
														className='inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-4 text-nearBlack'
														title={t('calendarBadgeDayTitle')}
													>
														{calendarDays > 99 ? '99+' : calendarDays}
													</span>
												) : null}
											</span>
										) : null}
									</span>
									<span className='hidden truncate sm:inline'>{label}</span>
								</Link>
								),
							)}
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
								href={`/${locale}/admin/help?place=${place}`}
								className={`flex min-w-[4.5rem] shrink-0 items-center gap-1.5 text-sm text-icyWhite/70 ${ui.publicBookingHover} transition-colors whitespace-nowrap sm:min-w-[5rem]`}
								aria-label={t('helpManualAria')}
							>
								<BookOpen className='h-4 w-4 shrink-0' />
								<span className='hidden truncate sm:inline'>
									{t('helpManual')}
								</span>
							</Link>
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
						className={`absolute inset-x-0 top-full z-50 max-h-[min(70dvh,calc(100vh-4rem))] overflow-y-auto overscroll-contain bg-nearBlack px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-icyWhite shadow-xl animate-in slide-in-from-top-2 fade-in-0 duration-200 sm:hidden ${ui.mobileMenuBorder}`}
					>
						<div className='mb-3 text-right'>
							<span className='block font-serif text-base text-icyWhite'>
								{placeLabel}
							</span>
						</div>
						<nav className='mb-3 flex flex-col gap-2 items-end text-right'>
							{navItemsWithBadges.map(
								({
									id,
									label,
									icon: Icon,
									calendarTbd = 0,
									calendarDays = 0,
								}) => (
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
									<span className='relative inline-flex shrink-0'>
										<Icon className='h-4 w-4 shrink-0' />
										{id === 'calendar' &&
										(calendarTbd > 0 || calendarDays > 0) ? (
											<span className='absolute -right-1 -top-2 flex flex-row gap-0.5'>
												{calendarTbd > 0 ? (
													<span
														className='inline-flex min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white'
														title={t('calendarBadgeTimeTitle')}
													>
														{calendarTbd > 99 ? '99+' : calendarTbd}
													</span>
												) : null}
												{calendarDays > 0 ? (
													<span
														className='inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-4 text-nearBlack'
														title={t('calendarBadgeDayTitle')}
													>
														{calendarDays > 99 ? '99+' : calendarDays}
													</span>
												) : null}
											</span>
										) : null}
									</span>
								</Link>
								),
							)}
						</nav>
						<div className='flex flex-col gap-3 items-end text-right'>
							{session?.user && (
								<span className='max-w-xs truncate text-xs text-icyWhite/70'>
									{session.user.email}
								</span>
							)}
							<Link
								href={`/${locale}/admin/help?place=${place}`}
								onClick={() => setIsMobileMenuOpen(false)}
								className='inline-flex w-full max-w-xs items-center justify-end gap-1.5 rounded-lg px-3 py-2 text-sm text-icyWhite/90 hover:text-icyWhite hover:bg-white/5 transition-colors'
								aria-label={t('helpManualAria')}
							>
								<span className='truncate'>{t('helpManual')}</span>
								<BookOpen className='h-4 w-4 shrink-0' />
							</Link>
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
					'relative min-h-0 min-w-0 flex-1',
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
					<div className='min-w-0 space-y-4 animate-in fade-in-0 duration-200'>
						<div className='min-w-0'>
							<div className='flex flex-wrap items-center gap-2 sm:gap-3'>
								<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
									{t('appointments')}
								</h1>
								{calendarTbdNeedSlotCount > 0 ? (
									<span
										className='inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 sm:px-3'
										title={t('calendarBadgeTimeTitle')}
									>
										<span className='h-2 w-2 shrink-0 rounded-full bg-red-500' />
										<span className='tabular-nums'>
											{calendarTbdNeedSlotCount}
										</span>
										<span className='min-w-0 break-words text-red-100/90'>
											{t('calendarAttentionTimeLabel')}
										</span>
									</span>
								) : null}
								{calendarDayNeedDaysCount > 0 ? (
									<span
										className='inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-100 sm:px-3'
										title={t('calendarBadgeDayTitle')}
									>
										<span className='h-2 w-2 shrink-0 rounded-full bg-amber-400' />
										<span className='tabular-nums'>
											{calendarDayNeedDaysCount}
										</span>
										<span className='min-w-0 break-words text-amber-50/95'>
											{t('calendarAttentionDayLabel')}
										</span>
									</span>
								) : null}
							</div>
							<p className='text-icyWhite/60 text-sm mt-0.5'>
								{t('appointmentsSubtitle')}
							</p>
							<p className='mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-icyWhite/40'>
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

						<div className={clsx(ui.adminPanel, 'min-w-0')}>
							<BookingCalendarGrid
								allowCancel
								allowDrag
								onEditAppointment={handleEditAppointment}
								services={calendarColorServices}
								place={place}
							/>
						</div>
					</div>
				)}

				{section === 'agenda' && (
					<div className='space-y-6 animate-in fade-in-0 duration-200'>
						<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
							<div className='min-w-0'>
								<h1 className='font-serif text-2xl sm:text-3xl text-icyWhite'>
									{t('agenda')}
								</h1>
								<p className='text-icyWhite/60 text-sm mt-0.5 max-w-2xl'>
									{t('agendaSubtitle')}
								</p>
								<p className='text-icyWhite/45 text-xs mt-2'>{t('agendaRowHint')}</p>
							</div>
							<Link
								href={`/${locale}/admin/${place}/calendar`}
								className={clsx(
									'inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
									place === 'massage'
										? 'border-gold-soft/40 bg-gold-soft/10 text-gold-soft hover:bg-gold-soft/18'
										: 'border-gold-soft/40 bg-gold-soft/10 text-gold-soft hover:bg-gold-soft/18',
								)}
							>
								<Calendar className='h-4 w-4' aria-hidden />
								{t('agendaOpenCalendar')}
							</Link>
						</div>

						<div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
							<div className='rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3'>
								<p className='text-[11px] font-medium uppercase tracking-wider text-icyWhite/45'>
									{t('agendaStatScheduled')}
								</p>
								<p className='mt-1 font-serif text-2xl text-icyWhite tabular-nums'>
									{filteredAgendaAppointments.length}
								</p>
							</div>
							<div className='rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-4 py-3'>
								<p className='text-[11px] font-medium uppercase tracking-wider text-sky-200/75'>
									{t('agendaStatAwaiting')}
								</p>
								<p className='mt-1 font-serif text-2xl text-sky-100 tabular-nums'>
									{filteredAgendaTbd.length}
								</p>
							</div>
							<div className='rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3'>
								<p className='text-[11px] font-medium uppercase tracking-wider text-icyWhite/45'>
									{t('agendaStatTotal')}
								</p>
								<p className='mt-1 font-serif text-2xl text-icyWhite tabular-nums'>
									{filteredAgendaAppointments.length + filteredAgendaTbd.length}
								</p>
							</div>
						</div>

						<div className='relative max-w-2xl'>
							<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icyWhite/45' />
							<Input
								type='search'
								variant='search'
								value={agendaQuery}
								onChange={e => setAgendaQuery(e.target.value)}
								placeholder={t('agendaSearchPlaceholder')}
								className='rounded-lg text-sm py-2.5'
								aria-label={t('agendaSearchPlaceholder')}
							/>
						</div>

						<div className={clsx(ui.adminPanel, 'overflow-hidden')}>
							{agendaAppointments.length === 0 && agendaTbd.length === 0 ? (
								<div className='p-12 text-center text-icyWhite/50'>
									{t('noUpcomingAppointments')}
								</div>
							) : filteredAgendaAppointments.length === 0 &&
							  filteredAgendaTbd.length === 0 ? (
								<div className='p-12 text-center text-icyWhite/50'>
									{t('agendaNoMatches')}
								</div>
							) : (
								<>
									{filteredAgendaTbd.length > 0 && (
										<>
											<p className='px-4 pt-4 text-xs font-medium text-sky-200/90 uppercase tracking-wider'>
												{t('agendaUnscheduledTitle')}
											</p>
											<div className='space-y-3 p-4 sm:hidden'>
												{filteredAgendaTbd.map(apt => {
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
													const svcDays = getServiceDayCount(apt)
													return (
														<div
															key={apt.id}
															role='button'
															tabIndex={0}
															onClick={() => handleEditAppointment(apt)}
															onKeyDown={e => {
																if (e.key === 'Enter' || e.key === ' ') {
																	e.preventDefault()
																	handleEditAppointment(apt)
																}
															}}
															className='rounded-xl border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-icyWhite space-y-1.5 cursor-pointer transition-colors hover:bg-sky-500/12 active:scale-[0.99]'
														>
															<div className='flex items-center justify-between gap-2'>
																<span className='font-medium text-sky-100/95'>
																	{t('agendaTbdNoDate')}
																</span>
																{svcDays > 0 ? (
																	<span className='shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-icyWhite/80'>
																		{t('dayCountValue', { count: svcDays })}
																	</span>
																) : (
																	<span className='text-xs text-icyWhite/60'>
																		{duration}m
																	</span>
																)}
															</div>
															<AgendaServiceLine
																apt={apt}
																services={calendarColorServices}
															/>
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
										</>
									)}
									<div className='space-y-3 p-4 sm:hidden'>
										{filteredAgendaAppointments.map(apt => {
											const start =
												apt.startTime && 'toDate' in apt.startTime
													? apt.startTime.toDate()
													: new Date(apt.startTime as Date)
											const end =
												apt.endTime && 'toDate' in apt.endTime
													? apt.endTime.toDate()
													: new Date(apt.endTime as Date)
											return (
												<div
													key={apt.id}
													role='button'
													tabIndex={0}
													onClick={() => handleEditAppointment(apt)}
													onKeyDown={e => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault()
															handleEditAppointment(apt)
														}
													}}
													className='rounded-xl border border-white/10 bg-white/[0.04] shadow-sm shadow-black/20 px-3 py-3 text-sm text-icyWhite space-y-1.5 cursor-pointer transition-colors hover:bg-white/[0.07] active:scale-[0.99]'
												>
													<div className='flex items-center justify-between gap-2'>
														<span className='font-medium'>
															{formatAppointmentDateLabel(apt, start, end)} ·{' '}
															{formatAppointmentTimeLabel(apt, start)}
														</span>
														<span className='text-xs text-icyWhite/60'>
															{formatAppointmentMetaLabel(apt, start, end)}
														</span>
													</div>
													<AgendaServiceLine
														apt={apt}
														services={calendarColorServices}
													/>
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
										<div className='overflow-x-auto rounded-xl'>
											<table className='w-full min-w-[640px] text-left'>
												<thead>
													<tr className='border-b border-white/10 bg-white/[0.04]'>
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
													{filteredAgendaTbd.map(apt => {
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
														const tbdDayCount = getServiceDayCount(apt)
														return (
															<tr
																key={apt.id}
																role='button'
																tabIndex={0}
																onClick={() => handleEditAppointment(apt)}
																onKeyDown={e => {
																	if (e.key === 'Enter' || e.key === ' ') {
																		e.preventDefault()
																		handleEditAppointment(apt)
																	}
																}}
																className='border-b border-sky-500/20 bg-sky-500/[0.04] hover:bg-sky-500/[0.12] transition-colors cursor-pointer'
															>
																<td className='px-4 py-3 text-sm text-sky-100/90'>
																	{t('agendaTbdNoDate')}
																</td>
																<td className='px-4 py-3 text-sm text-sky-100/80'>
																	—
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<AgendaServiceLine
																		apt={apt}
																		services={calendarColorServices}
																		meta={
																			<span className='text-icyWhite/50 text-xs ml-1'>
																				{tbdDayCount > 0
																					? `(${t('dayCountValue', { count: tbdDayCount })})`
																					: `(${duration}m)`}
																			</span>
																		}
																	/>
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
													{filteredAgendaAppointments.map(apt => {
														const start =
															apt.startTime && 'toDate' in apt.startTime
																? apt.startTime.toDate()
																: new Date(apt.startTime as Date)
														const end =
															apt.endTime && 'toDate' in apt.endTime
																? apt.endTime.toDate()
																: new Date(apt.endTime as Date)
														return (
															<tr
																key={apt.id}
																role='button'
																tabIndex={0}
																onClick={() => handleEditAppointment(apt)}
																onKeyDown={e => {
																	if (e.key === 'Enter' || e.key === ' ') {
																		e.preventDefault()
																		handleEditAppointment(apt)
																	}
																}}
																className='border-b border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer'
															>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatAppointmentDateLabel(apt, start, end)}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatAppointmentTimeLabel(apt, start)}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<AgendaServiceLine
																		apt={apt}
																		services={calendarColorServices}
																		meta={
																			<span className='text-icyWhite/50 text-xs ml-1'>
																				(
																				{formatAppointmentMetaLabel(
																					apt,
																					start,
																					end,
																				)}
																				)
																			</span>
																		}
																	/>
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
						<div className='relative max-w-2xl'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-icyWhite/50' />
							<Input
								type='search'
								variant='search'
								value={analyticsSearch}
								onChange={e => setAnalyticsSearch(e.target.value)}
								placeholder={t('searchByNameOrPhone')}
								className='rounded-lg text-sm py-2.5'
							/>
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
													className='rounded-xl border border-white/10 bg-white/[0.04] shadow-sm shadow-black/20 px-3 py-3 text-sm text-icyWhite space-y-1.5'
												>
													<div className='flex items-center justify-between gap-2'>
														<span className='font-medium'>
															{formatAppointmentDateLabel(apt, start, end)} ·{' '}
															{formatAppointmentTimeLabel(apt, start)}
														</span>
														<span className='text-xs text-icyWhite/60'>
															{formatAppointmentMetaLabel(apt, start, end)}
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
																	{formatAppointmentDateLabel(apt, start, end)}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	{formatAppointmentTimeLabel(apt, start)}
																</td>
																<td className='px-4 py-3 text-sm text-icyWhite'>
																	<span>{apt.service}</span>
																	<span className='text-icyWhite/50 text-xs ml-1'>
																		({formatAppointmentMetaLabel(apt, start, end)})
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
										ref={availabilityManagerRef}
										place={place}
										schedule={schedule}
										onScheduleChange={setSchedule}
										onSavingChange={setAvailabilitySaving}
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
						<AdminPriceCatalog
							ref={priceCatalogRef}
							place={place}
							onSavingChange={setPriceCatalogSaving}
						/>
					</div>
				)}
				</div>
			</div>

			{(section === 'calendar' ||
				section === 'settings' ||
				section === 'price' ||
				section === 'analytics') && (
				<div
					className={clsx(
						'fixed z-50 flex flex-col gap-2 items-end',
						'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))]',
						'sm:bottom-6 sm:right-6',
					)}
				>
					{section === 'analytics' && (
						<button
							type='button'
							onClick={exportAnalyticsPdf}
							className={adminDockFabClass}
							aria-label={t('exportPdf')}
						>
							<FileDown className='h-4 w-4 shrink-0' aria-hidden />
							<span className='truncate hidden sm:inline'>{t('exportPdf')}</span>
						</button>
					)}
					{section === 'price' && (
						<button
							type='button'
							disabled={priceCatalogSaving}
							onClick={() => void priceCatalogRef.current?.save()}
							className={clsx(adminDockFabClass, adminDockFabDisabled)}
							aria-label={
								priceCatalogSaving ? t('saving') : t('save')
							}
						>
							<Save className='h-4 w-4 shrink-0' aria-hidden />
							<span className='truncate hidden sm:inline'>
								{priceCatalogSaving ? t('saving') : t('save')}
							</span>
						</button>
					)}
					{section === 'settings' && (
						<button
							type='button'
							disabled={availabilitySaving}
							onClick={() => void availabilityManagerRef.current?.save()}
							className={clsx(adminDockFabClass, adminDockFabDisabled)}
							aria-label={
								availabilitySaving ? t('saving') : t('saveAvailability')
							}
						>
							<Save className='h-4 w-4 shrink-0' aria-hidden />
							<span className='truncate hidden sm:inline'>
								{availabilitySaving
									? t('saving')
									: t('saveAvailability')}
							</span>
						</button>
					)}
					{section === 'calendar' && (
						<button
							type='button'
							onClick={openAddAppointment}
							aria-label={t('addAppointment')}
							className={adminDockFabClass}
						>
							<span className='text-lg leading-none' aria-hidden>
								+
							</span>
							<span className='hidden max-w-[10rem] truncate sm:inline'>
								{t('addAppointment')}
							</span>
						</button>
					)}
				</div>
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
				services={addModalServices}
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
				services={calendarColorServices}
				place={place}
			/>
		</main>
	)
}
