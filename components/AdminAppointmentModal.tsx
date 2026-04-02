'use client'

import AdminDatePicker from '@/components/AdminDatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	appointmentIntervalsFromDocs,
	queryAppointmentsOverlappingRange,
} from '@/lib/appointments-overlap-query'
import {
	getAvailableTimeSlots,
	getPrepBufferMinutes,
	parseOccupiedSlots,
	type OccupiedSlot,
} from '@/lib/availability-firestore'
import {
	bookAppointmentAdmin,
	updateAppointment,
	type AdminBookingInput,
	type AppointmentData,
} from '@/lib/book-appointment'
import { getDateKey } from '@/lib/booking'
import { db } from '@/lib/firebase'
import {
	formatDateForEmail,
	formatTimeForEmail,
	formatTimeFromHourMinute,
} from '@/lib/format-date'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { Place } from '@/lib/places'
import type { ScheduleData } from '@/lib/schedule-firestore'
import { subscribeSchedule } from '@/lib/schedule-firestore'
import {
	findServiceDataForAppointment,
	resolveAppointmentRequiredFullDayCount,
	type ServiceData,
} from '@/lib/services'
import { clsx } from 'clsx'
import {
	collection,
	doc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	where,
	type Timestamp,
} from 'firebase/firestore'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

function formatTimeSlotLabel(slot: string, locale: string): string {
	const [h, m] = slot.split(':').map(Number)
	return formatTimeFromHourMinute(h, m, locale)
}

function sortDateKeys(values: string[]): string[] {
	return [...values].sort(
		(a, b) =>
			new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime(),
	)
}

function getInitialDayDates(
	appointment?: AppointmentData | null,
	slotCountForExpansion?: number,
): string[] {
	if (!appointment) return []
	if (appointment.adminFullDayDates?.length) {
		return sortDateKeys(appointment.adminFullDayDates)
	}
	// TBD rows use placeholder startTime (2099); multiDayFullDayCount still infers "day" mode.
	if (appointment.scheduleTbd === true) return []
	if (appointment.adminBookingMode !== 'day') return []
	const start =
		appointment.startTime && 'toDate' in appointment.startTime
			? appointment.startTime.toDate()
			: new Date(appointment.startTime as Date)
	// Do not expand synthetic ranges from far-future placeholder anchors
	if (start.getFullYear() >= 2090) return []
	const count = Math.max(
		1,
		Math.min(
			14,
			(slotCountForExpansion ??
				Number(appointment.multiDayFullDayCount)) ||
				1,
		),
	)
	return Array.from({ length: count }, (_, i) => {
		const d = new Date(start)
		d.setDate(d.getDate() + i)
		return getDateKey(d)
	})
}

/** One string per required day slot; empty string = not chosen yet. */
function getInitialDaySlots(
	appointment: AppointmentData | null | undefined,
	slotCount: number,
): string[] {
	const n = Math.max(1, Math.min(14, slotCount))
	const base = getInitialDayDates(appointment ?? null, n)
	const sorted = sortDateKeys(base)
	return Array.from({ length: n }, (_, i) => sorted[i] ?? '')
}

/** How many day pickers to show when opening edit (TBD or multi-day day booking). */
function getEditInitialDaySlotCount(
	appointment: AppointmentData | null | undefined,
	services: ServiceData[],
): number {
	if (!appointment) return 1
	if (appointment.adminBookingMode === 'day' || appointment.scheduleTbd) {
		const catalog = findServiceDataForAppointment(appointment, services)
		return resolveAppointmentRequiredFullDayCount(appointment, catalog)
	}
	return 1
}

function disabledKeysForFullDaySlot(
	slotIndex: number,
	daySlotValues: string[],
	blockedDayKeysForPicker: string[],
): string[] {
	const own = new Set(daySlotValues.filter(Boolean))
	const pickedOnOtherSlots = daySlotValues
		.map((v, j) => (j !== slotIndex && v ? v : null))
		.filter((x): x is string => Boolean(x))
	const base = blockedDayKeysForPicker.filter(k => !own.has(k))
	return Array.from(new Set([...base, ...pickedOnOtherSlots]))
}

interface AdminAppointmentModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: () => void
	mode: 'add' | 'edit'
	defaultDate?: Date
	defaultHour?: number
	defaultMinute?: number
	appointment?: AppointmentData | null
	services?: ServiceData[]
	place?: Place
}

export default function AdminAppointmentModal({
	isOpen,
	onClose,
	onSuccess,
	mode,
	defaultDate,
	defaultHour = 9,
	defaultMinute = 0,
	appointment,
	services = [],
	place = 'massage',
}: AdminAppointmentModalProps) {
	const locale = useLocale()
	const ui = useMemo(() => getPlaceAccentUi(place), [place])
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const isEdit = mode === 'edit' && appointment
	const endDateForPast =
		appointment &&
		(appointment.endTime && 'toDate' in appointment.endTime
			? appointment.endTime.toDate()
			: new Date(appointment.endTime as Date))
	const isPastAppointment = Boolean(
		isEdit && endDateForPast && endDateForPast.getTime() < Date.now(),
	)
	const resolvedDefaultDate = useMemo(
		() => defaultDate ?? new Date(),
		[defaultDate],
	)

	const startDate = appointment
		? appointment.startTime && 'toDate' in appointment.startTime
			? appointment.startTime.toDate()
			: new Date(appointment.startTime as Date)
		: new Date(resolvedDefaultDate)
	const endDate = appointment
		? appointment.endTime && 'toDate' in appointment.endTime
			? appointment.endTime.toDate()
			: new Date(appointment.endTime as Date)
		: new Date(startDate)
	const durationMinutes = appointment
		? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
		: 60
	const appointmentCatalogService = useMemo(() => {
		if (!appointment) return undefined
		return findServiceDataForAppointment(appointment, services)
	}, [appointment, services])

	/** Customer “schedule later” booking — always assign real calendar day(s) here (catalog match optional). */
	const isTbdDayService = Boolean(appointment?.scheduleTbd)

	const initialBookingMode =
		appointment?.adminBookingMode === 'day' || isTbdDayService ? 'day' : 'time'

	const [dateStr, setDateStr] = useState(
		isEdit ? getDateKey(startDate) : getDateKey(resolvedDefaultDate),
	)
	const [hour, setHour] = useState(isEdit ? startDate.getHours() : defaultHour)
	const [minute, setMinute] = useState(
		isEdit
			? Math.round(startDate.getMinutes() / 5) * 5
			: Math.round(defaultMinute / 5) * 5,
	)
	const [bookingMode, setBookingMode] = useState<'time' | 'day'>(
		initialBookingMode,
	)
	/** New all-day bookings: how many calendar days to assign (1–14). Edits locked to service/appointment use `fullDaySlotsTarget` instead. */
	const [allDayDayCount, setAllDayDayCount] = useState(1)
	const [daySlotValues, setDaySlotValues] = useState<string[]>(() =>
		getInitialDaySlots(
			appointment ?? null,
			getEditInitialDaySlotCount(appointment ?? null, services),
		),
	)
	const [occupiedDayKeys, setOccupiedDayKeys] = useState<string[]>([])
	const [duration, setDuration] = useState(durationMinutes)
	const [service, setService] = useState(appointment?.service ?? '')
	const [fullName, setFullName] = useState(appointment?.fullName ?? '')
	const [email, setEmail] = useState(appointment?.email ?? '')
	const [phone, setPhone] = useState(appointment?.phone ?? '')
	const [adminNote, setAdminNote] = useState(appointment?.adminNote ?? '')

	const catalogServiceForSlots = useMemo(() => {
		return (
			appointmentCatalogService ??
			services.find(s => s.title === service) ??
			undefined
		)
	}, [appointmentCatalogService, services, service])

	const serviceDayCount = useMemo(() => {
		if (
			appointment?.scheduleTbd === true ||
			appointment?.adminBookingMode === 'day'
		) {
			return resolveAppointmentRequiredFullDayCount(
				appointment,
				appointmentCatalogService,
			)
		}
		if (catalogServiceForSlots?.bookingGranularity === 'day') {
			return catalogServiceForSlots.bookingDayCount ?? 1
		}
		if (catalogServiceForSlots?.bookingGranularity === 'tbd') {
			return catalogServiceForSlots.bookingDayCount ?? 1
		}
		return 0
	}, [appointment, appointmentCatalogService, catalogServiceForSlots])

	const [loading, setLoading] = useState(false)
	const [placeSchedule, setPlaceSchedule] = useState<ScheduleData | null>(null)
	const [timeOccupiedSlots, setTimeOccupiedSlots] = useState<OccupiedSlot[]>([])
	/** Same source as `bookAppointment` overlap check — appointments query can miss stale/extra rows. */
	const [dayDocOccupiedSlots, setDayDocOccupiedSlots] = useState<OccupiedSlot[]>(
		[],
	)
	const [timeSlotsLoading, setTimeSlotsLoading] = useState(false)
	const [availabilityMonth, setAvailabilityMonth] = useState(() => {
		const d = new Date()
		return new Date(d.getFullYear(), d.getMonth(), 1)
	})

	const isDayMode = bookingMode === 'day'
	const isLockedDayEdit = Boolean(
		isEdit && (appointment?.adminBookingMode === 'day' || isTbdDayService),
	)
	/** How many full days this booking should cover (multi-day services + TBD awaiting assignment). */
	const fullDaySlotsTarget = useMemo(() => {
		if (!isDayMode) return 0
		if (isLockedDayEdit) {
			const n =
				serviceDayCount > 0
					? serviceDayCount
					: catalogServiceForSlots?.bookingGranularity === 'day' ||
						  catalogServiceForSlots?.bookingGranularity === 'tbd'
						? (catalogServiceForSlots.bookingDayCount ?? 1)
						: 1
			return Math.max(1, Math.min(14, n))
		}
		return Math.max(1, Math.min(14, allDayDayCount))
	}, [
		isDayMode,
		isLockedDayEdit,
		serviceDayCount,
		catalogServiceForSlots,
		allDayDayCount,
	])

	const filledDaySlotCount = useMemo(
		() => daySlotValues.filter(v => v.trim()).length,
		[daySlotValues],
	)
	const minSelectableDate = useMemo(() => {
		const d = new Date()
		d.setHours(0, 0, 0, 0)
		return d
	}, [])

	const groupedServices = useMemo(() => {
		const groups: { color: string; items: ServiceData[] }[] = []
		const colorMap = new Map<string, ServiceData[]>()
		for (const s of services) {
			const key = s.color || '__none__'
			if (!colorMap.has(key)) colorMap.set(key, [])
			colorMap.get(key)!.push(s)
		}
		for (const [color, items] of Array.from(colorMap.entries())) {
			groups.push({ color, items })
		}
		return groups
	}, [services])

	const blockedDayKeysForPicker = useMemo(() => {
		if (!isDayMode) return []
		const ownDays = new Set(daySlotValues.filter(Boolean))
		return occupiedDayKeys.filter(k => !ownDays.has(k))
	}, [daySlotValues, isDayMode, occupiedDayKeys])

	const effectiveDurationMinutes = useMemo(
		() => Math.max(5, Math.min(240, Number.isFinite(duration) ? duration : 60)),
		[duration],
	)

	const handleAvailabilityMonthChange = useCallback((m: Date) => {
		setAvailabilityMonth(prev => {
			const next = new Date(m.getFullYear(), m.getMonth(), 1)
			if (prev.getTime() === next.getTime()) return prev
			return next
		})
	}, [])

	const mergedTimeOccupiedSlots = useMemo(
		() => [...timeOccupiedSlots, ...dayDocOccupiedSlots],
		[timeOccupiedSlots, dayDocOccupiedSlots],
	)

	const adminTimeAvailability = useMemo(() => {
		if (isDayMode) return undefined
		return {
			occupiedSlots: mergedTimeOccupiedSlots,
			durationMinutes: effectiveDurationMinutes,
			onViewMonthChange: handleAvailabilityMonthChange,
			slotsLoading: timeSlotsLoading,
		}
	}, [
		isDayMode,
		mergedTimeOccupiedSlots,
		effectiveDurationMinutes,
		handleAvailabilityMonthChange,
		timeSlotsLoading,
	])

	const availableTimeSlots = useMemo(() => {
		if (isDayMode || !dateStr) return []
		const d = new Date(`${dateStr}T12:00:00`)
		if (isNaN(d.getTime())) return []
		return getAvailableTimeSlots(
			d,
			effectiveDurationMinutes,
			mergedTimeOccupiedSlots,
			placeSchedule,
		)
	}, [
		isDayMode,
		dateStr,
		effectiveDurationMinutes,
		mergedTimeOccupiedSlots,
		placeSchedule,
	])

	useEffect(() => {
		if (!isOpen) {
			setPlaceSchedule(null)
			return
		}
		return subscribeSchedule(place, setPlaceSchedule)
	}, [isOpen, place])

	useEffect(() => {
		if (!isOpen || isDayMode) return
		const d = new Date(`${dateStr}T12:00:00`)
		if (isNaN(d.getTime())) return
		setAvailabilityMonth(prev => {
			const next = new Date(d.getFullYear(), d.getMonth(), 1)
			if (prev.getTime() === next.getTime()) return prev
			return next
		})
	}, [isOpen, isDayMode, dateStr])

	useEffect(() => {
		if (!isOpen || isDayMode || !dateStr) {
			setDayDocOccupiedSlots([])
			return
		}
		const dayKey = `${place}_${dateStr}`
		const dayRef = doc(db, 'days', dayKey)
		const prep = getPrepBufferMinutes(placeSchedule)
		const unsub = onSnapshot(
			dayRef,
			snap => {
				if (!snap.exists()) {
					setDayDocOccupiedSlots([])
					return
				}
				const slots =
					(snap.data()?.slots as Array<{
						start: Timestamp
						end: Timestamp
					}>) ?? []
				const intervals = slots.map(s => ({
					startTime: s.start,
					endTime: s.end,
				}))
				setDayDocOccupiedSlots(parseOccupiedSlots(intervals, prep))
			},
			() => setDayDocOccupiedSlots([]),
		)
		return () => unsub()
	}, [isOpen, isDayMode, dateStr, place, placeSchedule])

	useEffect(() => {
		if (!isOpen || isDayMode) {
			setTimeOccupiedSlots([])
			setTimeSlotsLoading(false)
			return
		}
		let cancelled = false
		setTimeSlotsLoading(true)
		;(async () => {
			const y = availabilityMonth.getFullYear()
			const m = availabilityMonth.getMonth()
			const rangeStart = new Date(y, m, 1)
			const rangeEnd = new Date(y, m + 1, 0, 23, 59, 59, 999)
			try {
				const q = queryAppointmentsOverlappingRange(
					db,
					place,
					rangeStart,
					rangeEnd,
				)
				const snapshot = await getDocs(q)
				if (cancelled) return
				const intervals = appointmentIntervalsFromDocs(snapshot.docs, {
					excludeDocIds:
						isEdit && appointment?.id ? [appointment.id] : undefined,
				})
				setTimeOccupiedSlots(
					parseOccupiedSlots(intervals, getPrepBufferMinutes(placeSchedule)),
				)
			} catch {
				if (!cancelled) setTimeOccupiedSlots([])
			} finally {
				if (!cancelled) setTimeSlotsLoading(false)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [
		isOpen,
		isDayMode,
		place,
		availabilityMonth,
		placeSchedule,
		isEdit,
		appointment?.id,
	])

	useEffect(() => {
		if (isDayMode || !dateStr) return
		const key = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		if (availableTimeSlots.length === 0) return
		if (!availableTimeSlots.includes(key)) {
			const [h, m] = availableTimeSlots[0].split(':').map(Number)
			setHour(h)
			setMinute(m)
		}
	}, [isDayMode, dateStr, availableTimeSlots, hour, minute])

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen])

	useEffect(() => {
		if (!isOpen) return
		if (isEdit && appointment) {
			const s =
				appointment.startTime && 'toDate' in appointment.startTime
					? appointment.startTime.toDate()
					: new Date(appointment.startTime as Date)
			const e =
				appointment.endTime && 'toDate' in appointment.endTime
					? appointment.endTime.toDate()
					: new Date(appointment.endTime as Date)
			const useTodayForTbdDay = isTbdDayService && appointment.scheduleTbd
			setDateStr(useTodayForTbdDay ? getDateKey(new Date()) : getDateKey(s))
			setHour(useTodayForTbdDay ? 9 : s.getHours())
			setMinute(useTodayForTbdDay ? 0 : Math.round(s.getMinutes() / 5) * 5)
			setBookingMode(
				appointment.adminBookingMode === 'day' || isTbdDayService
					? 'day'
					: 'time',
			)
			const slotN = Math.max(
				1,
				Math.min(
					14,
					appointment.adminBookingMode === 'day' || isTbdDayService
						? resolveAppointmentRequiredFullDayCount(
								appointment,
								findServiceDataForAppointment(appointment, services),
							)
						: 1,
				),
			)
			setDaySlotValues(
				appointment.adminBookingMode === 'day' || isTbdDayService
					? getInitialDaySlots(appointment, slotN)
					: [],
			)
			setDuration(Math.round((e.getTime() - s.getTime()) / 60000))
			setService(
				findServiceDataForAppointment(appointment, services)?.title ??
					appointment.service ??
					'',
			)
			setFullName(appointment.fullName ?? '')
			setEmail(appointment.email ?? '')
			setPhone(appointment.phone ?? '')
			setAdminNote(appointment.adminNote ?? '')
		} else {
			setDateStr(getDateKey(resolvedDefaultDate))
			setHour(defaultHour)
			setMinute(Math.round(defaultMinute / 5) * 5)
			setBookingMode('time')
			setAllDayDayCount(1)
			setDaySlotValues([])
			setDuration(services[0]?.durationMinutes ?? 60)
			setService(services[0]?.title ?? '')
			setFullName('')
			setEmail('')
			setPhone('')
			setAdminNote('')
		}
	}, [
		isOpen,
		isEdit,
		appointment,
		resolvedDefaultDate,
		defaultHour,
		defaultMinute,
		services,
		isTbdDayService,
	])

	useEffect(() => {
		if (!isOpen || !isDayMode) return
		const n = fullDaySlotsTarget
		if (n <= 0) return
		setDaySlotValues(prev => {
			if (prev.length === n) return prev
			return Array.from({ length: n }, (_, i) => prev[i] ?? '')
		})
	}, [isOpen, isDayMode, fullDaySlotsTarget])

	/** Prefill day count from catalog when the chosen service is day/TBD multi-day. */
	useEffect(() => {
		if (!isOpen || isEdit || !isDayMode) return
		const s = services.find(x => x.title === service)
		if (
			!s ||
			(s.bookingGranularity !== 'day' && s.bookingGranularity !== 'tbd')
		) {
			return
		}
		setAllDayDayCount(Math.max(1, Math.min(14, s.bookingDayCount ?? 1)))
	}, [isOpen, isEdit, isDayMode, service, services])

	useEffect(() => {
		if (!isOpen || !isDayMode) {
			setOccupiedDayKeys([])
			return
		}
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			orderBy('startTime', 'asc'),
		)
		const unsubscribe = onSnapshot(q, snapshot => {
			const blocked = new Set<string>()
			for (const doc of snapshot.docs) {
				if (appointment && doc.id === appointment.id) continue
				const data = doc.data() as Record<string, unknown>
				if (data.scheduleTbd === true) continue
				const explicitDays = Array.isArray(data.adminFullDayDates)
					? data.adminFullDayDates.filter(
							(v): v is string => typeof v === 'string',
						)
					: []
				if (explicitDays.length > 0) {
					for (const dk of explicitDays) blocked.add(dk)
					continue
				}
				const start =
					data.startTime &&
					'toDate' in (data.startTime as { toDate?: () => Date })
						? (data.startTime as { toDate: () => Date }).toDate()
						: new Date(data.startTime as Date)
				const end =
					data.endTime && 'toDate' in (data.endTime as { toDate?: () => Date })
						? (data.endTime as { toDate: () => Date }).toDate()
						: new Date(data.endTime as Date)
				const cur = new Date(start)
				cur.setHours(0, 0, 0, 0)
				const endDay = new Date(end)
				endDay.setHours(0, 0, 0, 0)
				while (cur.getTime() <= endDay.getTime()) {
					blocked.add(getDateKey(cur))
					cur.setDate(cur.getDate() + 1)
				}
			}
			setOccupiedDayKeys(Array.from(blocked).sort())
		})
		return () => unsubscribe()
	}, [appointment, isDayMode, isOpen, place])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (isPastAppointment) return

		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		let normalizedDayDates: string[] = []

		if (isDayMode) {
			const filled = daySlotValues.filter(v => v.trim())
			if (filled.length !== fullDaySlotsTarget) {
				toast.error(t('fullDayPickExactlyDays', { count: fullDaySlotsTarget }))
				return
			}
			normalizedDayDates = sortDateKeys(filled)
			if (new Set(normalizedDayDates).size !== normalizedDayDates.length) {
				toast.error(t('fullDayDaysMustBeDistinct'))
				return
			}
			if (!isEdit) {
				if (
					normalizedDayDates.some(
						v => new Date(`${v}T00:00:00`).getTime() < todayStart.getTime(),
					)
				) {
					toast.error(t('cannotCreatePast'))
					return
				}
			}
		} else {
			if (availableTimeSlots.length === 0) {
				toast.error(t('adminTimeNoSlots'))
				return
			}
			const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
			if (!availableTimeSlots.includes(startTime)) {
				toast.error(t('adminTimeNoSlots'))
				return
			}
			const slotStart = new Date(`${dateStr}T${startTime}:00`)
			if (slotStart.getTime() < todayStart.getTime()) {
				toast.error(t('cannotCreatePast'))
				return
			}
		}

		setLoading(true)
		try {
			const primaryDate = isDayMode
				? (normalizedDayDates[0] ?? dateStr)
				: dateStr
			const startTime = isDayMode
				? '09:00'
				: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
			const dur = isDayMode
				? undefined
				: Math.max(5, Math.min(240, Number.isFinite(duration) ? duration : 60))
			const noteValue = adminNote.trim() || undefined

			if (isEdit && appointment) {
				await updateAppointment(
					appointment.id,
					{
						service: service || undefined,
						fullName: fullName || undefined,
						email: email || undefined,
						phone: phone || undefined,
						startTime: new Date(`${primaryDate}T${startTime}:00`),
						durationMinutes: dur,
						adminBookingMode: bookingMode,
						adminFullDayDates: isDayMode ? normalizedDayDates : undefined,
						adminNote: noteValue ?? '',
					},
					place,
				)
				toast.success(t('appointmentUpdated'))
			} else {
				const input: AdminBookingInput = {
					date: primaryDate,
					startTime,
					durationMinutes: dur,
					adminBookingMode: bookingMode,
					adminFullDayDates: isDayMode ? normalizedDayDates : undefined,
					service: service || undefined,
					fullName: fullName || undefined,
					email: email || undefined,
					phone: phone || undefined,
					adminNote: noteValue,
				}
				await bookAppointmentAdmin(input, place)
				if (email?.trim() && email.includes('@')) {
					const slotDate = new Date(`${primaryDate}T${startTime}:00`)
					try {
						const res = await fetch('/api/send-confirmation', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								type: 'new',
								source: 'admin',
								to: email.trim(),
								customerName: fullName?.trim() || t('customer'),
								date: formatDateForEmail(slotDate),
								time: isDayMode
									? t('allDayNoClockTime')
									: formatTimeForEmail(slotDate),
								service: service || undefined,
							}),
						})
						if (!res.ok) {
							const data = await res.json().catch(() => ({}))
							toast.error(
								t('appointmentAddedEmailFailed', {
									error: data?.error ?? t('couldNotSend'),
								}),
							)
						} else {
							toast.success(t('appointmentAddedNotified'))
						}
					} catch {
						toast.success(t('appointmentAddedNoEmail'))
					}
				} else {
					toast.success(t('appointmentAdded'))
				}
			}
			onSuccess?.()
			onClose()
		} catch (err) {
			const code = err instanceof Error ? err.message : ''
			const msg =
				code === 'OVERLAP'
					? t('slotBooked')
					: code === 'DAY_CLOSED'
						? t('fullDayClosed')
						: code === 'DAY_REQUIRED'
							? t('selectAtLeastOneDay')
							: t('saveFailed')
			toast.error(msg)
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<>
			<div
				className='fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm'
				onClick={onClose}
				aria-hidden
			/>
			<div
				className={clsx(
					'fixed left-1/2 top-1/2 z-[51] w-[calc(100%-1.5rem)] max-w-md max-h-[min(90dvh,calc(100vh-1rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain p-4 sm:p-6',
					ui.adminModalShell,
				)}
				onClick={e => e.stopPropagation()}
			>
				<h2 className='font-serif text-xl text-icyWhite mb-6'>
					{isEdit ? t('editAppointment') : t('addAppointment')}
				</h2>

				{isEdit && appointment && (
					<div className='mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 space-y-1'>
						<div className='flex items-center justify-between gap-2'>
							<span className='text-sm font-medium text-icyWhite truncate'>
								{appointment.service || '—'}
							</span>
							{serviceDayCount > 0 && (
								<span className='shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-icyWhite/80'>
									{t('dayCountValue', { count: serviceDayCount })}
								</span>
							)}
						</div>
						{appointment.fullName && appointment.fullName !== '—' && (
							<p className='text-xs text-icyWhite/60'>{appointment.fullName}</p>
						)}
						{appointment.phone && appointment.phone !== '—' && (
							<p className='text-xs text-icyWhite/50'>{appointment.phone}</p>
						)}
					</div>
				)}

				{isPastAppointment && (
					<div className='mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200'>
						{t('pastAppointmentNote')}
					</div>
				)}
				{isEdit && appointment?.scheduleTbd && (
					<div className='mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/95'>
						<p>{t('appointmentTbdNotice')}</p>
					</div>
				)}

				<form onSubmit={handleSubmit} className='space-y-4'>
					<fieldset
						disabled={!!isPastAppointment}
						className='space-y-4 [&:disabled]:opacity-75'
					>
						{/* ── Appointment type toggle ── */}
						<div className='space-y-1.5'>
							<Label className='text-icyWhite/80'>
								{t('appointmentTypeLabel')}
							</Label>
							<div className='grid grid-cols-2 gap-2'>
								<button
									type='button'
									onClick={() => !isLockedDayEdit && setBookingMode('time')}
									disabled={isLockedDayEdit}
									className={clsx(
										'rounded-lg border px-3 py-2 text-sm transition-colors',
										bookingMode === 'time'
											? 'border-white/40 bg-white/15 text-icyWhite'
											: 'border-white/10 bg-white/5 text-icyWhite/70 hover:bg-white/10',
										isLockedDayEdit &&
											'cursor-not-allowed opacity-45 hover:bg-white/5',
									)}
								>
									{t('appointmentTypeTime')}
								</button>
								<button
									type='button'
									onClick={() => setBookingMode('day')}
									className={clsx(
										'rounded-lg border px-3 py-2 text-sm transition-colors',
										bookingMode === 'day'
											? 'border-white/40 bg-white/15 text-icyWhite'
											: 'border-white/10 bg-white/5 text-icyWhite/70 hover:bg-white/10',
									)}
								>
									{t('appointmentTypeDay')}
								</button>
							</div>
							{isDayMode && (
								<p className='text-xs text-icyWhite/55'>
									{isLockedDayEdit
										? t('appointmentTypeDayLockedHint')
										: t('appointmentTypeDayHint')}
								</p>
							)}
						</div>

						{/* ── Day mode: one calendar per required day ── */}
						{isDayMode ? (
							<div className='space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4'>
								{!isLockedDayEdit && (
									<div className='space-y-1.5'>
										<Label className='text-icyWhite/80'>
											{t('adminAllDayDayCountLabel')}
										</Label>
										<Select
											value={String(allDayDayCount)}
											onValueChange={v =>
												setAllDayDayCount(
													Math.max(1, Math.min(14, parseInt(v, 10) || 1)),
												)
											}
										>
											<SelectTrigger className='select-menu w-full sm:max-w-[12rem]'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent position='popper' sideOffset={4}>
												{Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
													<SelectItem key={n} value={String(n)}>
														{t('adminAllDayDayCountOption', { count: n })}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className='text-xs text-icyWhite/55'>
											{t('adminAllDayDayCountHint')}
										</p>
									</div>
								)}
								<div className='space-y-1'>
									<Label className='text-icyWhite/80'>
										{t('selectedDaysLabel')}
										<span className='ml-2 text-xs font-normal text-icyWhite/50'>
											{filledDaySlotCount}/{fullDaySlotsTarget}
										</span>
									</Label>
									<p className='text-xs text-icyWhite/55'>
										{t('selectedDaysPerSlotHint', {
											count: fullDaySlotsTarget,
										})}
									</p>
								</div>
								<div className='space-y-4'>
									{daySlotValues.map((slotValue, index) => (
										<div key={`day-slot-${index}`} className='space-y-1.5'>
											<Label className='text-sm text-icyWhite/75'>
												{t('fullDaySlotPickerLabel', { n: index + 1 })}
											</Label>
											<AdminDatePicker
												place={place}
												schedule={placeSchedule}
												value={slotValue}
												onChange={value => {
													setDaySlotValues(cur => {
														const next = [...cur]
														next[index] = value
														return next
													})
												}}
												selectedDateKeys={daySlotValues.filter(Boolean)}
												disabledDateKeys={disabledKeysForFullDaySlot(
													index,
													daySlotValues,
													blockedDayKeysForPicker,
												)}
												minDate={minSelectableDate}
											/>
										</div>
									))}
								</div>
							</div>
						) : (
							/* ── Time mode: date + time ── */
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-1.5'>
									<Label className='text-icyWhite/80'>{tCommon('date')}</Label>
									<AdminDatePicker
										place={place}
										schedule={placeSchedule}
										value={dateStr}
										onChange={setDateStr}
										minDate={minSelectableDate}
										timeAvailability={adminTimeAvailability}
									/>
								</div>
								<div className='space-y-1.5'>
									<Label className='text-icyWhite/80'>{tCommon('time')}</Label>
									{timeSlotsLoading ? (
										<p className='rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-icyWhite/65'>
											{t('adminTimeSlotsLoading')}
										</p>
									) : availableTimeSlots.length === 0 ? (
										<p className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90'>
											{t('adminTimeNoSlots')}
										</p>
									) : (
										<Select
											value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
											onValueChange={v => {
												const [h, m] = v.split(':').map(Number)
												setHour(h)
												setMinute(m)
											}}
										>
											<SelectTrigger className='select-menu'>
												<SelectValue placeholder={t('chooseTime')} />
											</SelectTrigger>
											<SelectContent
												position='popper'
												sideOffset={4}
												className='z-[100] max-h-[200px]'
											>
												{availableTimeSlots.map(slot => (
													<SelectItem key={slot} value={slot}>
														{formatTimeSlotLabel(slot, locale)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</div>
							</div>
						)}

						{/* ── Service ── */}
						<div className='space-y-1.5'>
							{isLockedDayEdit ? (
								<>
									<Label className='text-icyWhite/80'>
										{t('currentServiceLabel')}
									</Label>
									<p className='rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-icyWhite'>
										{appointment?.service || service || '—'}
									</p>
									<p className='text-xs text-icyWhite/50'>
										{t('allDayServiceLockedHint')}
									</p>
								</>
							) : (
								<>
									<Label className='text-icyWhite/80'>
										{tCommon('services')}
									</Label>
									<Select
										value={service || 'none'}
										onValueChange={v => {
											const val = v === 'none' ? '' : v
											setService(val)
											const svc = services.find(s => s.title === val)
											if (svc) setDuration(svc.durationMinutes)
										}}
									>
										<SelectTrigger className='select-menu'>
											<SelectValue placeholder={t('chooseService')} />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='none'>—</SelectItem>
											{groupedServices.map((group, gi) => (
												<SelectGroup key={group.color}>
													{gi > 0 && <SelectSeparator />}
													{group.items.map(s => (
														<SelectItem key={s.id} value={s.title}>
															<span className='flex items-center gap-2'>
																<span
																	className={`inline-block w-2.5 h-2.5 rounded-full border ${s.color}`}
																/>
																{s.title}
															</span>
														</SelectItem>
													))}
												</SelectGroup>
											))}
										</SelectContent>
									</Select>
								</>
							)}
						</div>

						{/* ── Duration (time mode only) ── */}
						{!isDayMode && (
							<div className='space-y-1.5'>
								<Label className='text-icyWhite/80'>{t('durationLabel')}</Label>
								<Input
									type='number'
									min={5}
									max={240}
									step={5}
									value={Number.isFinite(duration) ? duration : ''}
									onChange={e => {
										const v = Number(e.target.value)
										setDuration(Number.isFinite(v) ? v : 60)
									}}
									className='bg-white/5 border-white/10 text-icyWhite'
								/>
							</div>
						)}

						{/* ── Contact fields ── */}
						<div className='space-y-1.5'>
							<Label className='text-icyWhite/80'>{t('nameOptional')}</Label>
							<Input
								value={fullName}
								onChange={e => setFullName(e.target.value)}
								placeholder='—'
								className='bg-white/5 border-white/10 text-icyWhite'
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='text-icyWhite/80'>{t('emailOptional')}</Label>
							<Input
								type='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder='—'
								className='bg-white/5 border-white/10 text-icyWhite'
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='text-icyWhite/80'>{t('phoneOptional')}</Label>
							<Input
								type='tel'
								value={phone}
								onChange={e => setPhone(e.target.value)}
								placeholder='—'
								className='bg-white/5 border-white/10 text-icyWhite'
							/>
						</div>

						{/* ── Admin note ── */}
						<div className='space-y-1.5'>
							<Label className='text-icyWhite/80'>{t('adminNoteLabel')}</Label>
							<textarea
								value={adminNote}
								onChange={e => setAdminNote(e.target.value)}
								placeholder={t('adminNotePlaceholder')}
								rows={2}
								className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-icyWhite placeholder:text-icyWhite/40 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none'
							/>
						</div>

						{/* ── Actions ── */}
						<div className='flex gap-3 pt-4'>
							<Button
								type='button'
								variant='outline'
								className='flex-1 border-white/10 text-icyWhite hover:bg-white/10'
								onClick={onClose}
							>
								{isPastAppointment ? t('close') : t('cancel')}
							</Button>
							{!isPastAppointment && (
								<Button
									type='submit'
									className={`flex-1 ${ui.btnPrimarySm}`}
									disabled={(() => {
										if (loading) return true
										if (!isDayMode)
											return timeSlotsLoading || availableTimeSlots.length === 0
										const filled = daySlotValues.filter(v => v.trim())
										return (
											filled.length !== fullDaySlotsTarget ||
											new Set(filled).size !== filled.length
										)
									})()}
								>
									{loading ? t('saving') : isEdit ? t('save') : t('add')}
								</Button>
							)}
						</div>
					</fieldset>
				</form>
			</div>
		</>
	)
}
