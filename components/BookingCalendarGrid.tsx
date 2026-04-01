'use client'

import { isPriceCatalogSectionCalendarId } from '@/lib/admin-calendar-services'
import {
	ADMIN_CALENDAR_HOUR_ROW_PX,
	ADMIN_SLOT_INTERVAL_MIN,
	computeTimedOverlayHeightsPx,
	adminAppointmentDurationHeightPx,
	adminAppointmentTopPxFromStart,
} from '@/lib/admin-calendar-grid-layout'
import { getDateKey } from '@/lib/booking'
import {
	getAdminCalendarGridHourBounds,
	getPrepBufferMinutes,
} from '@/lib/availability-firestore'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import {
	deleteAppointment,
	getUiAppointmentDayDateKeys,
	inferAdminBookingModeFromFirestore,
	updateAppointment,
	updateAppointmentTime,
	type AppointmentData,
} from '@/lib/book-appointment'
import { db } from '@/lib/firebase'
import {
	formatDateForEmail,
	formatTimeForEmail,
	formatTimeFromHourMinute,
} from '@/lib/format-date'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import type { ServiceData } from '@/lib/services'
import {
	DEFAULT_SECTION_CALENDAR_COLOR,
	resolvedOpaqueCalendarSlotFill,
} from '@/lib/section-calendar-colors'
import {
	closestCenter,
	DndContext,
	DragOverlay,
	PointerSensor,
	pointerWithin,
	rectIntersection,
	TouchSensor,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import {
	collection,
	onSnapshot,
	orderBy,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, CircleDot } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import AdminCalendarEventDetail from './AdminCalendarEventDetail'
import DraggableAppointment from './DraggableAppointment'
import DroppableCell, { cellIdToTimestamp, makeCellId } from './DroppableCell'

/** Standard collision: pointer, then rect, then closest center */
const calendarCollisionDetection: CollisionDetection = args => {
	const pointerHits = pointerWithin(args)
	if (pointerHits.length > 0) return pointerHits
	const rectHits = rectIntersection(args)
	if (rectHits.length > 0) return rectHits
	return closestCenter(args)
}

function snapGridMinute(m: number): number {
	const snapped = Math.round(m / 15) * 15
	if (snapped >= 60) return 45
	if (snapped < 0) return 0
	return snapped
}
// 15-min grid resolution in admin (4 slots per hour, Google Calendar style)
const SLOT_INTERVAL = ADMIN_SLOT_INTERVAL_MIN // 15 — must match grid quarters

function startOfWeek(d: Date): Date {
	const day = d.getDay()
	const diff = d.getDate() - day
	return new Date(d.getFullYear(), d.getMonth(), diff)
}

function addDays(d: Date, n: number): Date {
	const out = new Date(d)
	out.setDate(out.getDate() + n)
	return out
}

function isToday(d: Date): boolean {
	const t = new Date()
	return (
		d.getFullYear() === t.getFullYear() &&
		d.getMonth() === t.getMonth() &&
		d.getDate() === t.getDate()
	)
}

function isAppointmentPast(apt: AppointmentData): boolean {
	const end =
		apt.endTime && 'toDate' in apt.endTime
			? apt.endTime.toDate()
			: new Date(apt.endTime as Date)
	return end.getTime() < Date.now()
}

function isCellPast(day: Date, hour: number, minute: number): boolean {
	const d = new Date(day)
	d.setHours(hour, minute, 0, 0)
	return d.getTime() < Date.now()
}

function isDayPast(day: Date): boolean {
	const endOfDay = new Date(day)
	endOfDay.setHours(23, 59, 59, 999)
	return endOfDay.getTime() < Date.now()
}

/** Full-day bookings with no `adminFullDayDates` yet — same rule as calendar badge; listed below grid, not placed on columns. */
function isFullDayAwaitingExplicitDays(apt: AppointmentData): boolean {
	if (apt.scheduleTbd) return false
	if (apt.adminBookingMode !== 'day') return false
	if ((apt.adminFullDayDates?.length ?? 0) > 0) return false
	const end =
		apt.endTime && 'toDate' in apt.endTime
			? apt.endTime.toDate()
			: new Date(apt.endTime as Date)
	const startOfToday = new Date()
	startOfToday.setHours(0, 0, 0, 0)
	return end.getTime() >= startOfToday.getTime()
}

/** dragId = "apt-xxx-YYYYMMDD-HHmm"; strip cell suffix to get the real appointment ID */
function extractAppointmentId(dragId: string): string {
	const m = dragId.match(/^(.+)-\d{8}-\d{4}$/)
	return m ? m[1] : dragId
}

function formatFullDayMoveSummary(keys: string[], locale: string): string {
	const sorted = [...keys].sort((a, b) => a.localeCompare(b))
	if (sorted.length === 1) {
		return new Date(`${sorted[0]}T12:00:00`).toLocaleDateString(locale, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	}
	const a = new Date(`${sorted[0]}T12:00:00`)
	const b = new Date(`${sorted[sorted.length - 1]}T12:00:00`)
	const opts: Intl.DateTimeFormatOptions = {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}
	return `${a.toLocaleDateString(locale, opts)} – ${b.toLocaleDateString(locale, opts)}`
}

/** Short TZ label for week grid corner (e.g. GMT+1), Google Calendar–style. */
function shortTimeZoneName(d = new Date()): string {
	try {
		const parts = new Intl.DateTimeFormat(undefined, {
			timeZoneName: 'short',
		}).formatToParts(d)
		return parts.find(p => p.type === 'timeZoneName')?.value ?? ''
	} catch {
		return ''
	}
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

function getAppointmentDuration(apt: AppointmentData): number {
	const start =
		apt.startTime && 'toDate' in apt.startTime
			? apt.startTime.toDate()
			: new Date(apt.startTime as Date)
	const end =
		apt.endTime && 'toDate' in apt.endTime
			? apt.endTime.toDate()
			: new Date(apt.endTime as Date)
	return Math.round((end.getTime() - start.getTime()) / 60000)
}

function getAppointmentSlot(apt: AppointmentData): {
	date: Date
	hour: number
	minute: number
} {
	const start =
		apt.startTime && 'toDate' in apt.startTime
			? apt.startTime.toDate()
			: new Date(apt.startTime as Date)
	return {
		date: start,
		hour: start.getHours(),
		minute: start.getMinutes(),
	}
}

interface BookingCalendarGridProps {
	weekStart?: Date
	onCellClick?: (date: Date, hour: number, minute: number) => void
	onEditAppointment?: (appointment: AppointmentData) => void
	allowCancel?: boolean
	allowDrag?: boolean
	services?: ServiceData[]
	place?: Place
}

export default function BookingCalendarGrid({
	weekStart: weekStartProp,
	onCellClick,
	onEditAppointment,
	allowCancel = false,
	allowDrag = false,
	services = [],
	place = 'massage',
}: BookingCalendarGridProps) {
	const ui = useMemo(() => getPlaceAccentUi(place), [place])
	const locale = useLocale()
	const t = useTranslations('admin')
	const [view, setView] = useState<'day' | 'week'>('week')
	const [weekStart, setWeekStart] = useState(() =>
		weekStartProp ? startOfWeek(weekStartProp) : startOfWeek(new Date()),
	)
	const [selectedDay, setSelectedDay] = useState(() => {
		const d = new Date()
		d.setHours(0, 0, 0, 0)
		return d
	})
	const [appointments, setAppointments] = useState<AppointmentData[]>([])
	const [fullDayAwaitingList, setFullDayAwaitingList] = useState<
		AppointmentData[]
	>([])
	const [tbdAppointments, setTbdAppointments] = useState<AppointmentData[]>([])
	const [schedule, setSchedule] = useState<Awaited<
		ReturnType<typeof getSchedule>
	> | null>(null)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [pendingMove, setPendingMove] = useState<{
		appointment: AppointmentData
		newCellId: string
		/** When moving an all-day booking: new explicit day keys (confirm uses `updateAppointment`). */
		newFullDayDateKeys?: string[]
	} | null>(null)

	const weekDays = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart],
	)

	const displayDays = useMemo(
		() => (view === 'day' ? [selectedDay] : weekDays),
		[view, selectedDay, weekDays],
	)

	const { gridStartHour, gridEndHour } = useMemo(
		() => getAdminCalendarGridHourBounds(schedule, displayDays),
		[schedule, displayDays],
	)

	const hourSlots = useMemo(
		() =>
			Array.from(
				{ length: gridEndHour - gridStartHour },
				(_, i) => gridStartHour + i,
			),
		[gridStartHour, gridEndHour],
	)

	const [nowTick, setNowTick] = useState(() => Date.now())
	useEffect(() => {
		const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
		return () => window.clearInterval(id)
	}, [])

	const nowIndicator = useMemo(() => {
		const now = new Date(nowTick)
		const dayIndex = displayDays.findIndex(d => isToday(d))
		if (dayIndex < 0) return null
		const minutesFromMidnight = now.getHours() * 60 + now.getMinutes()
		const gridStartMin = gridStartHour * 60
		const spanMin = (gridEndHour - gridStartHour) * 60
		const relMin = minutesFromMidnight - gridStartMin
		if (relMin < 0 || relMin > spanMin) return null
		const gridHeightPx = hourSlots.length * ADMIN_CALENDAR_HOUR_ROW_PX
		const topPx = Math.min(
			gridHeightPx,
			(relMin / 60) * ADMIN_CALENDAR_HOUR_ROW_PX,
		)
		return { dayIndex, topPx }
	}, [nowTick, displayDays, gridStartHour, gridEndHour, hourSlots.length])

	const timeZoneShort = useMemo(() => shortTimeZoneName(new Date(nowTick)), [nowTick])

	useEffect(() => {
		getSchedule(place)
			.then(setSchedule)
			.catch(() => setSchedule(null))
	}, [place])

	useEffect(() => {
		const dayStart = new Date(view === 'day' ? selectedDay : weekStart)
		dayStart.setHours(0, 0, 0, 0)
		const dayEnd = addDays(
			view === 'day' ? selectedDay : weekStart,
			view === 'day' ? 1 : 7,
		)
		dayEnd.setHours(23, 59, 59, 999)
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			orderBy('startTime', 'asc'),
		)

		const unsubscribe = onSnapshot(q, snapshot => {
			const list = snapshot.docs
				.map(doc => toAppointmentData({ id: doc.id, data: () => doc.data() }))
				.filter(a => {
					const start =
						a.startTime && 'toDate' in a.startTime
							? a.startTime.toDate()
							: new Date(a.startTime as Date)
					const end =
						a.endTime && 'toDate' in a.endTime
							? a.endTime.toDate()
							: new Date(a.endTime as Date)
					return start < dayEnd && end >= dayStart
				})
				.filter(a => a.scheduleTbd !== true)
			setAppointments(list)
		})

		return () => unsubscribe()
	}, [weekStart, selectedDay, view, place])

	useEffect(() => {
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			where('scheduleTbd', '==', true),
		)
		const unsubscribe = onSnapshot(q, snapshot => {
			const list = snapshot.docs.map(doc =>
				toAppointmentData({ id: doc.id, data: () => doc.data() }),
			)
			setTbdAppointments(list)
		})
		return () => unsubscribe()
	}, [place])

	useEffect(() => {
		const q = query(
			collection(db, 'appointments'),
			where('place', '==', place),
			where('adminBookingMode', '==', 'day'),
		)
		const unsubscribe = onSnapshot(q, snapshot => {
			const list = snapshot.docs.map(doc =>
				toAppointmentData({ id: doc.id, data: () => doc.data() }),
			)
			setFullDayAwaitingList(list.filter(isFullDayAwaitingExplicitDays))
		})
		return () => unsubscribe()
	}, [place])

	const prepBuffer = getPrepBufferMinutes(schedule)

	const { appointmentsByCell, cellsOccupiedBy } = useMemo(() => {
		const byCell = new Map<string, AppointmentData>()
		const occupied = new Set<string>()
		for (const apt of appointments) {
			if (apt.scheduleTbd) continue
			const start =
				apt.startTime && 'toDate' in apt.startTime
					? apt.startTime.toDate()
					: new Date(apt.startTime as Date)
			const end =
				apt.endTime && 'toDate' in apt.endTime
					? apt.endTime.toDate()
					: new Date(apt.endTime as Date)
			if (apt.adminBookingMode === 'day') {
				if (isFullDayAwaitingExplicitDays(apt)) continue
				const selectedDays =
					apt.adminFullDayDates && apt.adminFullDayDates.length > 0
						? apt.adminFullDayDates
						: Array.from(
								{ length: Math.max(1, Math.min(14, Number(apt.multiDayFullDayCount) || 1)) },
								(_, dayOffset) => {
									const nextDate = addDays(start, dayOffset)
									return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
								},
						  )
				for (const dayKey of selectedDays) {
					const dayDate = new Date(`${dayKey}T12:00:00`)
					const startCellId = makeCellId(dayDate, gridStartHour, 0)
					byCell.set(startCellId, apt)
					for (const hour of hourSlots) {
						for (const minute of [0, 15, 30, 45] as const) {
							occupied.add(makeCellId(dayDate, hour, minute))
						}
					}
				}
				continue
			}
			const durationMinutes = Math.round(
				(end.getTime() - start.getTime()) / 60000,
			)
			const blockedMinutes = durationMinutes + prepBuffer
			const h = start.getHours()
			const m = start.getMinutes()
			const snappedMin = snapGridMinute(m)
			const startCellId = makeCellId(start, h, snappedMin)
			byCell.set(startCellId, apt)
			let slotStart = new Date(start)
			slotStart.setMinutes(snappedMin, 0, 0)
			const blockEnd = new Date(start.getTime() + blockedMinutes * 60 * 1000)
			while (slotStart.getTime() < blockEnd.getTime()) {
				const cid = makeCellId(
					slotStart,
					slotStart.getHours(),
					slotStart.getMinutes(),
				)
				occupied.add(cid)
				slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL * 60 * 1000)
			}
		}
		return { appointmentsByCell: byCell, cellsOccupiedBy: occupied }
	}, [appointments, prepBuffer, gridStartHour, hourSlots])

	/** Timed + day bookings shown in the stacked overlay (one block per day column). */
	const appointmentsByDayKeyForOverlay = useMemo(() => {
		const map = new Map<string, AppointmentData[]>()
		for (const day of displayDays) {
			map.set(getDateKey(day), [])
		}
		for (const apt of appointments) {
			if (apt.scheduleTbd) continue
			if (apt.adminBookingMode === 'day') {
				if (isFullDayAwaitingExplicitDays(apt)) continue
				const start =
					apt.startTime && 'toDate' in apt.startTime
						? apt.startTime.toDate()
						: new Date(apt.startTime as Date)
				const selectedDays =
					apt.adminFullDayDates && apt.adminFullDayDates.length > 0
						? apt.adminFullDayDates
						: Array.from(
								{
									length: Math.max(
										1,
										Math.min(14, Number(apt.multiDayFullDayCount) || 1),
									),
								},
								(_, dayOffset) => {
									const nextDate = addDays(start, dayOffset)
									return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
								},
							)
				for (const dayKey of selectedDays) {
					const bucket = map.get(dayKey)
					if (bucket) bucket.push(apt)
				}
				continue
			}
			const start =
				apt.startTime && 'toDate' in apt.startTime
					? apt.startTime.toDate()
					: new Date(apt.startTime as Date)
			const dk = getDateKey(start)
			const bucket = map.get(dk)
			if (bucket) bucket.push(apt)
		}
		for (const dk of Array.from(map.keys())) {
			const list = map.get(dk)!
			const seen = new Set<string>()
			const deduped = list.filter(a => {
				if (seen.has(a.id)) return false
				seen.add(a.id)
				return true
			})
			deduped.sort((a, b) => {
				const as =
					a.startTime && 'toDate' in a.startTime
						? a.startTime.toDate()
						: new Date(a.startTime as Date)
				const bs =
					b.startTime && 'toDate' in b.startTime
						? b.startTime.toDate()
						: new Date(b.startTime as Date)
				return as.getTime() - bs.getTime()
			})
			map.set(dk, deduped)
		}
		return map
	}, [appointments, displayDays])

	const { overlayTimedHeightsByDayKey, overlayTimedZIndexByDayKey } = useMemo(() => {
		const heightsByDay = new Map<string, Map<string, number>>()
		const zByDay = new Map<string, Map<string, number>>()
		for (const [dk, list] of Array.from(
			appointmentsByDayKeyForOverlay.entries(),
		)) {
			const timed = list
				.filter(a => a.adminBookingMode !== 'day' && !a.scheduleTbd)
				.map(a => {
					const s =
						a.startTime && 'toDate' in a.startTime
							? a.startTime.toDate()
							: new Date(a.startTime as Date)
					return {
						id: a.id,
						startMs: s.getTime(),
						durationMinutes: getAppointmentDuration(a),
					}
				})
				.sort((x, y) => x.startMs - y.startMs)
			const heights = computeTimedOverlayHeightsPx(
				timed,
				gridStartHour,
				gridEndHour,
			)
			const z = new Map<string, number>()
			timed.forEach((t, i) => z.set(t.id, 10 + i))
			heightsByDay.set(dk, heights)
			zByDay.set(dk, z)
		}
		return {
			overlayTimedHeightsByDayKey: heightsByDay,
			overlayTimedZIndexByDayKey: zByDay,
		}
	}, [appointmentsByDayKeyForOverlay, gridStartHour, gridEndHour])

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 5 },
		}),
	)

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string)
	}, [])

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveId(null)
			if (!allowDrag) return
			const { active, over } = event
			if (!over || active.id === over.id) return

			const rawDragId = active.id as string
			const appointmentId = extractAppointmentId(rawDragId)
			const cellId = String(over.id)
			if (!/^\d{8}-\d{4}$/.test(cellId)) return

			const appointment =
				appointments.find(a => a.id === appointmentId) ??
				tbdAppointments.find(a => a.id === appointmentId) ??
				fullDayAwaitingList.find(a => a.id === appointmentId)
			if (!appointment) return

			const newStart = cellIdToTimestamp(cellId)
			const dropDateKey = getDateKey(newStart)

			// All-day appointments are not draggable; use edit to change days.

			const oldStart =
				appointment.startTime && 'toDate' in appointment.startTime
					? appointment.startTime.toDate()
					: new Date(appointment.startTime as Date)
			const oldCellId = makeCellId(
				oldStart,
				oldStart.getHours(),
				snapGridMinute(oldStart.getMinutes()),
			)
			if (cellId === oldCellId) return // Same slot, no change

			// Block drop on occupied slots (other appointment or buffer) - don't open modal
			if (cellsOccupiedBy.has(cellId)) {
				const aptEnd = new Date(
					oldStart.getTime() + getAppointmentDuration(appointment) * 60 * 1000,
				)
				const cellTime = newStart.getTime()
				const isOwnBody =
					cellTime >= oldStart.getTime() && cellTime < aptEnd.getTime()
				if (!isOwnBody) return
			}

			if (newStart.getTime() < Date.now()) {
				toast.error(t('cannotMovePast'))
				return
			}

			setPendingMove({ appointment, newCellId: cellId })
		},
		[
			appointments,
			tbdAppointments,
			fullDayAwaitingList,
			allowDrag,
			cellsOccupiedBy,
			t,
		],
	)

	const handleConfirmMove = useCallback(async () => {
		if (!pendingMove) return
		const { appointment, newCellId, newFullDayDateKeys } = pendingMove
		setPendingMove(null)

		if (newFullDayDateKeys?.length) {
			const sorted = [...newFullDayDateKeys].sort((a, b) => a.localeCompare(b))
			const firstNew = new Date(`${sorted[0]}T12:00:00`)
			const startOfToday = new Date()
			startOfToday.setHours(0, 0, 0, 0)
			if (firstNew < startOfToday) {
				toast.error(t('cannotMovePast'))
				return
			}

			const oldKeys = getUiAppointmentDayDateKeys(appointment)
			const oldSorted = [...oldKeys].sort((a, b) => a.localeCompare(b))
			const oldFirstKey = oldSorted[0]!
			const newFirstKey = sorted[0]!
			const oldStartEmail = new Date(`${oldFirstKey}T12:00:00`)
			const newStartEmail = new Date(`${newFirstKey}T12:00:00`)
			const allDayLabel = t('allDayNoClockTime')

			try {
				await updateAppointment(
					appointment.id,
					{ adminFullDayDates: sorted },
					appointment.place ?? place,
				)

				const wasTbd = appointment.scheduleTbd === true
				try {
					if (wasTbd) {
						await fetch('/api/send-confirmation', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								to: appointment.email,
								customerName: appointment.fullName,
								date: formatDateForEmail(newStartEmail),
								time: allDayLabel,
								service: appointment.service,
							}),
						})
					} else {
						await fetch('/api/send-confirmation', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								type: 'rescheduled',
								to: appointment.email,
								customerName: appointment.fullName,
								service: appointment.service,
								oldDate: formatDateForEmail(oldStartEmail),
								oldTime: allDayLabel,
								newDate: formatDateForEmail(newStartEmail),
								newTime: allDayLabel,
							}),
						})
					}
				} catch {
					/* email failure */
				}
				toast.success(
					wasTbd ? t('tbdAssignedNotified') : t('movedNotified'),
				)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				const message =
					msg === 'OVERLAP'
						? t('slotBooked')
						: msg === 'DAY_CLOSED'
							? t('fullDayClosed')
							: msg === 'APPOINTMENT_NOT_FOUND'
								? t('notFound')
								: t('moveFailed', { msg: String(msg) })
				toast.error(message)
			}
			return
		}

		const newStart = cellIdToTimestamp(newCellId)
		if (newStart.getTime() < Date.now()) {
			toast.error(t('cannotMovePast'))
			return
		}

		const oldStart =
			appointment.startTime && 'toDate' in appointment.startTime
				? appointment.startTime.toDate()
				: new Date(appointment.startTime as Date)

		try {
			const durationMinutes = getAppointmentDuration(appointment)
			await updateAppointmentTime(appointment.id, newStart, durationMinutes)

			const wasTbd = appointment.scheduleTbd === true
			try {
				if (wasTbd) {
					await fetch('/api/send-confirmation', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							to: appointment.email,
							customerName: appointment.fullName,
							date: formatDateForEmail(newStart),
							time: formatTimeForEmail(newStart),
							service: appointment.service,
						}),
					})
				} else {
					await fetch('/api/send-confirmation', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: 'rescheduled',
							to: appointment.email,
							customerName: appointment.fullName,
							service: appointment.service,
							oldDate: formatDateForEmail(oldStart),
							oldTime: formatTimeForEmail(oldStart),
							newDate: formatDateForEmail(newStart),
							newTime: formatTimeForEmail(newStart),
						}),
					})
				}
			} catch {
				/* email failure */
			}
			toast.success(
				wasTbd ? t('tbdAssignedNotified') : t('movedNotified'),
			)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			const message =
				msg === 'OVERLAP'
					? t('slotBooked')
					: msg === 'APPOINTMENT_NOT_FOUND'
						? t('notFound')
						: t('moveFailed', { msg: String(msg) })
			toast.error(message)
		}
	}, [pendingMove, place, t])

	const handleCancelMove = useCallback(() => {
		setPendingMove(null)
	}, [])

	const [pendingCancel, setPendingCancel] = useState<AppointmentData | null>(
		null,
	)
	const [detailAppointment, setDetailAppointment] =
		useState<AppointmentData | null>(null)

	/** One lock for detail + cancel/move modals so closing detail → cancel does not restore scroll between overlays. */
	const adminCalendarScrollLock =
		detailAppointment != null ||
		pendingCancel != null ||
		pendingMove != null

	useEffect(() => {
		if (!adminCalendarScrollLock) return
		const prev = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = prev
		}
	}, [adminCalendarScrollLock])

	const handleCancelAppointment = useCallback(
		(appointment: AppointmentData) => {
			setPendingCancel(appointment)
		},
		[],
	)

	const handleConfirmCancel = useCallback(async () => {
		if (!pendingCancel) return
		const appointment = pendingCancel
		setPendingCancel(null)

		const start =
			appointment.startTime && 'toDate' in appointment.startTime
				? appointment.startTime.toDate()
				: new Date(appointment.startTime as Date)

		try {
			await deleteAppointment(appointment.id)
			try {
				await fetch('/api/send-confirmation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'cancelled',
						to: appointment.email,
						customerName: appointment.fullName,
						date: formatDateForEmail(start),
						time:
							appointment.adminBookingMode === 'day'
								? t('allDayNoClockTime')
								: formatTimeForEmail(start),
						service: appointment.service,
					}),
				})
			} catch {
				/* email failure */
			}
			toast.success(t('cancelledNotified'))
		} catch (err) {
			toast.error(t('cancelFailed'))
		}
	}, [pendingCancel, t])

	const handleDismissCancel = useCallback(() => setPendingCancel(null), [])

	const activeAppointment = activeId
		? (() => {
				const realId = extractAppointmentId(activeId)
				return (
					appointments.find(a => a.id === realId) ??
					tbdAppointments.find(a => a.id === realId) ??
					fullDayAwaitingList.find(a => a.id === realId)
				)
			})()
		: null

	/** Match on-grid block height (stack-aware) so DragOverlay preview is not stretched. */
	const activeDragOverlayHeightPx = useMemo(() => {
		if (!activeId || !activeAppointment) return undefined
		if (activeAppointment.scheduleTbd) return undefined
		if (activeAppointment.adminBookingMode === 'day') {
			return hourSlots.length * ADMIN_CALENDAR_HOUR_ROW_PX - 2
		}
		const cellKey = activeId.match(/(\d{8}-\d{4})$/)?.[1]
		const dur = getAppointmentDuration(activeAppointment)
		const fallback = adminAppointmentDurationHeightPx(dur, 12)
		if (!cellKey) return fallback
		try {
			const ts = cellIdToTimestamp(cellKey)
			const dk = getDateKey(ts)
			return (
				overlayTimedHeightsByDayKey.get(dk)?.get(activeAppointment.id) ??
				fallback
			)
		} catch {
			return fallback
		}
	}, [
		activeId,
		activeAppointment,
		overlayTimedHeightsByDayKey,
		hourSlots.length,
	])

	const toolbarRangeLabel = useMemo(() => {
		if (view === 'day') {
			return selectedDay.toLocaleDateString(locale, {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
				year: 'numeric',
			})
		}
		const y = weekStart.getFullYear()
		const a = weekDays[0]
		const b = weekDays[6]
		return `${a.toLocaleDateString(locale, { month: 'short' })} ${a.getDate()} – ${b.toLocaleDateString(locale, { month: 'short' })} ${b.getDate()}, ${y}`
	}, [view, selectedDay, locale, weekStart, weekDays])

	/**
	 * All price-catalog section colors (synthetic ids `section:…`), so every section’s
	 * swatch is visible without needing an appointment. Zones / direct lines / Firestore
	 * services are excluded.
	 */
	const colorAgendaItems = useMemo(() => {
		const sectionRows = services.filter(s => isPriceCatalogSectionCalendarId(s.id))
		if (sectionRows.length === 0) return []

		const byOpaque = new Map<string, Set<string>>()
		for (const svc of sectionRows) {
			const opaque = resolvedOpaqueCalendarSlotFill(
				svc.color,
				DEFAULT_SECTION_CALENDAR_COLOR,
			)
			const label = svc.title.trim() || '—'
			let set = byOpaque.get(opaque)
			if (!set) {
				set = new Set<string>()
				byOpaque.set(opaque, set)
			}
			set.add(label)
		}

		return Array.from(byOpaque.entries())
			.map(([opaqueClasses, labels]) => ({
				key: opaqueClasses,
				opaqueClasses,
				label: Array.from(labels)
					.sort((a, b) => a.localeCompare(b, locale))
					.join(', '),
			}))
			.sort((a, b) => a.label.localeCompare(b.label, locale))
	}, [services, locale])

	return (
		<div className='min-w-0 rounded-xl border border-white/10 bg-nearBlack/90 shadow-lg shadow-black/40 overflow-hidden'>
			{/* Toolbar — stack on narrow screens; controls scroll horizontally if needed */}
			<div className='flex flex-col gap-3 border-b border-white/10 bg-black/20 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5'>
				<div className='flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible sm:pb-0'>
					<div className='flex gap-1 mr-2'>
						<button
							type='button'
							onClick={() => {
								setView('day')
								if (view === 'week') {
									setSelectedDay(weekDays[0])
								}
							}}
							className={cn(
								'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-sm transition-colors min-w-[2.5rem] sm:min-w-0',
								view === 'day'
									? ui.toolbarActive
									: 'bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10',
							)}
							aria-label={t('viewDay')}
						>
							<CalendarDays className='w-4 h-4 shrink-0' />
							<span className='hidden sm:inline'>{t('viewDay')}</span>
						</button>
						<button
							type='button'
							onClick={() => {
								setView('week')
								setWeekStart(startOfWeek(selectedDay))
							}}
							className={cn(
								'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-sm transition-colors min-w-[2.5rem] sm:min-w-0',
								view === 'week'
									? ui.toolbarActive
									: 'bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10',
							)}
							aria-label={t('viewWeek')}
						>
							<CalendarRange className='w-4 h-4 shrink-0' />
							<span className='hidden sm:inline'>{t('viewWeek')}</span>
						</button>
					</div>
					{view === 'day' ? (
						<>
							<button
								type='button'
								onClick={() => setSelectedDay(d => addDays(d, -1))}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('previousDay')}
							>
								<ChevronLeft className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('previousDay')}</span>
							</button>
							<button
								type='button'
								onClick={() => {
									const today = new Date()
									today.setHours(0, 0, 0, 0)
									setSelectedDay(today)
								}}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('today')}
							>
								<CircleDot className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('today')}</span>
							</button>
							<button
								type='button'
								onClick={() => setSelectedDay(d => addDays(d, 1))}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('nextDay')}
							>
								<ChevronRight className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('nextDay')}</span>
							</button>
						</>
					) : (
						<>
							<button
								type='button'
								onClick={() => setWeekStart(d => addDays(d, -7))}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('previousWeek')}
							>
								<ChevronLeft className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('previousWeek')}</span>
							</button>
							<button
								type='button'
								onClick={() => setWeekStart(startOfWeek(new Date()))}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('today')}
							>
								<CircleDot className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('today')}</span>
							</button>
							<button
								type='button'
								onClick={() => setWeekStart(d => addDays(d, 7))}
								className='inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-icyWhite hover:bg-white/10 text-sm min-w-[2.5rem] sm:min-w-0'
								aria-label={t('nextWeek')}
							>
								<ChevronRight className='w-4 h-4 shrink-0' />
								<span className='hidden sm:inline'>{t('nextWeek')}</span>
							</button>
						</>
					)}
				</div>
				<h2 className='w-full min-w-0 text-balance text-center font-serif text-sm leading-snug tracking-tight text-icyWhite/95 sm:w-auto sm:max-w-[min(100%,28rem)] sm:text-left sm:text-base md:text-lg sm:leading-normal md:leading-snug md:max-w-none'>
					{toolbarRangeLabel}
				</h2>
			</div>

			{colorAgendaItems.length > 0 && (
				<div
					role='region'
					aria-label={t('colorAgendaTitle')}
					className='border-b border-white/10 bg-black/25 px-3 py-2 sm:px-4 sm:py-2.5'
				>
					<p className='mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-icyWhite/45'>
						{t('colorAgendaTitle')}
					</p>
					<ul className='flex flex-wrap gap-x-4 gap-y-2'>
						{colorAgendaItems.map(item => (
							<li
								key={item.key}
								className='flex min-w-0 max-w-full items-center gap-2'
							>
								<span
									className={cn(
										'h-3.5 w-3.5 shrink-0 rounded-sm shadow-sm shadow-black/30',
										item.opaqueClasses,
									)}
									aria-hidden
								/>
								<span className='min-w-0 text-[11px] leading-snug text-icyWhite/85 sm:text-xs'>
									{item.label}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Grid — week layout inspired by Google Calendar (sticky day row + time gutter, hour lines) */}
			<DndContext
				sensors={sensors}
				collisionDetection={calendarCollisionDetection}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className='min-h-[260px] w-full min-w-0 overflow-x-auto overscroll-x-contain sm:min-h-[320px] md:min-h-[380px]'>
					<div
						className={cn(
							'block w-full min-w-0',
							view === 'week' ? 'min-w-[720px]' : 'min-w-[280px]',
						)}
					>
						<div className='sticky top-0 z-[45] flex w-full min-w-0 border-b border-white/10 bg-nearBlack/[0.97] backdrop-blur-md supports-[backdrop-filter]:bg-nearBlack/90'>
							<div
								className='sticky left-0 z-[50] flex w-12 shrink-0 items-center justify-center border-r border-white/10 bg-nearBlack/[0.97] px-0.5 py-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-icyWhite/40 shadow-[4px_0_12px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:bg-nearBlack/90 sm:w-14 sm:px-1 sm:text-[10px]'
								title={timeZoneShort || undefined}
							>
								{timeZoneShort ? (
									<span className='break-all'>{timeZoneShort}</span>
								) : (
									<span className='text-icyWhite/20' aria-hidden>
										·
									</span>
								)}
							</div>
							{displayDays.map(day => {
								const past = isDayPast(day)
								const weekend = day.getDay() === 0 || day.getDay() === 6
								return (
									<div
										key={day.toISOString()}
										className={cn(
											'flex min-w-[80px] flex-1 flex-col items-center justify-center gap-1 border-r border-white/[0.08] px-1 py-2 text-center last:border-r-0 sm:min-w-[102px] sm:gap-1.5 sm:px-2 sm:py-3 md:min-w-[118px]',
											weekend && !past && 'bg-white/[0.04]',
											past && 'bg-white/[0.02] opacity-55',
										)}
									>
											<span
												className={cn(
													'text-[10px] font-semibold uppercase tracking-[0.08em] sm:text-[11px] sm:tracking-[0.1em]',
												past
													? 'text-icyWhite/35'
													: isToday(day)
														? ui.todayHeaderSub
														: 'text-icyWhite/50',
											)}
										>
											{day.toLocaleDateString(locale, { weekday: 'short' })}
										</span>
										{isToday(day) && !past ? (
											<span className={ui.weekCalendarTodayCircle}>
												{day.getDate()}
											</span>
										) : (
											<span
												className={cn(
													'pt-0.5 text-[22px] font-light tabular-nums leading-none tracking-tight text-icyWhite sm:text-[24px] md:text-[26px]',
													past && 'text-icyWhite/40',
												)}
											>
												{day.getDate()}
											</span>
										)}
									</div>
								)
							})}
						</div>

						<div className='flex w-full min-w-0'>
							<div className='sticky left-0 z-40 flex w-12 shrink-0 flex-col border-r border-white/10 bg-nearBlack/[0.96] shadow-[4px_0_14px_rgba(0,0,0,0.22)] supports-[backdrop-filter]:bg-nearBlack/88 sm:w-14'>
								{hourSlots.map(hour => (
									<div
										key={hour}
										style={{ height: ADMIN_CALENDAR_HOUR_ROW_PX }}
										className='relative box-border border-b border-white/10'
									>
										<span className='absolute right-0.5 top-1 block max-w-[3rem] text-right text-[10px] font-medium leading-none tabular-nums text-icyWhite/45 sm:max-w-none sm:text-[11px]'>
											{formatTimeFromHourMinute(hour, 0, locale)}
										</span>
									</div>
								))}
							</div>
							{displayDays.map((day, dayIndex) => {
								const dk = getDateKey(day)
								const overlayList =
									appointmentsByDayKeyForOverlay.get(dk) ?? []
								const weekendCol =
									day.getDay() === 0 || day.getDay() === 6
								return (
									<div
										key={`col-${dk}`}
										className={cn(
											'relative min-w-[80px] flex-1 border-r border-white/[0.08] last:border-r-0 sm:min-w-[102px] md:min-w-[118px]',
											weekendCol ? 'bg-white/[0.025]' : 'bg-white/[0.012]',
										)}
									>
										<div className='flex flex-col'>
											{hourSlots.map(hour => (
												<div
													key={`${dk}-${hour}`}
													className='flex flex-col'
													style={{ height: ADMIN_CALENDAR_HOUR_ROW_PX }}
												>
													{([0, 15, 30, 45] as const).map(minute => {
														const cellId = makeCellId(day, hour, minute)
														const isOccupied = cellsOccupiedBy.has(cellId)
														const aptAtCell =
															appointmentsByCell.get(cellId)
														const quarterBorder =
															minute === 45
																? 'border-b border-white/12'
																: minute === 30
																	? 'border-b border-dotted border-white/[0.14]'
																	: 'border-b border-white/[0.05]'
														return (
															<DroppableCell
																key={cellId}
																id={cellId}
																canDrop={
																	(!isOccupied || !!aptAtCell) &&
																	!isCellPast(day, hour, minute)
																}
																isPast={isCellPast(day, hour, minute)}
																dropOverClassName={ui.calendarDropTarget}
																compact
																className={cn('border-r-0', quarterBorder)}
															>
																<div
																	className='relative h-full w-full min-h-[8px]'
																	onClick={() =>
																		!isOccupied &&
																		!aptAtCell &&
																		onCellClick?.(day, hour, minute)
																	}
																/>
															</DroppableCell>
														)
													})}
												</div>
											))}
										</div>
										{nowIndicator?.dayIndex === dayIndex && (
											<div
												className='pointer-events-none absolute inset-x-0 z-[35]'
												style={{ top: nowIndicator.topPx }}
												aria-hidden
											>
												<div className='absolute -left-px top-0 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/90 bg-red-500 shadow-[0_0_6px_rgba(248,113,113,0.9)]' />
												<div className='h-0.5 w-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.75)]' />
											</div>
										)}
										<div className='pointer-events-none absolute inset-0 z-[5] overflow-visible'>
											{overlayList.map(apt => {
												if (apt.adminBookingMode === 'day') {
													const dayAnchor = new Date(`${dk}T12:00:00`)
													const startCellId = makeCellId(
														dayAnchor,
														gridStartHour,
														0,
													)
													return (
														<DraggableAppointment
															key={`${apt.id}-${dk}-day`}
															appointment={apt}
															dragId={`${apt.id}-${startCellId}`}
															positionedCalendar={{
																topPx: 0,
																heightPx:
																	hourSlots.length *
																		ADMIN_CALENDAR_HOUR_ROW_PX -
																	2,
																zIndex: 2,
															}}
															disabled={
																!allowDrag ||
																!!activeId ||
																isAppointmentPast(apt)
															}
															isPast={isAppointmentPast(apt)}
															onOpenDetail={() =>
																setDetailAppointment(apt)
															}
															onEdit={
																allowCancel &&
																!isAppointmentPast(apt)
																	? () => onEditAppointment?.(apt)
																	: undefined
															}
															onCancel={
																allowCancel &&
																!isAppointmentPast(apt)
																	? () =>
																			handleCancelAppointment(apt)
																	: undefined
															}
															services={services}
														/>
													)
												}
												const start =
													apt.startTime && 'toDate' in apt.startTime
														? apt.startTime.toDate()
														: new Date(apt.startTime as Date)
												const sm = snapGridMinute(start.getMinutes())
												const cellId = makeCellId(
													start,
													start.getHours(),
													sm,
												)
												const dur = getAppointmentDuration(apt)
												const topPx = adminAppointmentTopPxFromStart(
													start,
													gridStartHour,
												)
												const heightPx =
													overlayTimedHeightsByDayKey.get(dk)?.get(apt.id) ??
													adminAppointmentDurationHeightPx(dur, 12)
												const zTimed =
													overlayTimedZIndexByDayKey.get(dk)?.get(apt.id) ?? 10
												return (
													<DraggableAppointment
														key={`${apt.id}-${dk}-t`}
														appointment={apt}
														dragId={`${apt.id}-${cellId}`}
														positionedCalendar={{
															topPx,
															heightPx,
															zIndex: zTimed,
														}}
														disabled={
															!allowDrag ||
															!!activeId ||
															isAppointmentPast(apt)
														}
														isPast={isAppointmentPast(apt)}
														onOpenDetail={() =>
															setDetailAppointment(apt)
														}
														onEdit={
															allowCancel &&
															!isAppointmentPast(apt)
																? () => onEditAppointment?.(apt)
																: undefined
														}
														onCancel={
															allowCancel &&
															!isAppointmentPast(apt)
																? () =>
																		handleCancelAppointment(apt)
																: undefined
														}
														services={services}
													/>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>

				{tbdAppointments.length > 0 && (
					<div className='border-t border-white/10 bg-black/25 p-3 sm:p-4'>
						<h3 className='text-sm font-semibold text-icyWhite/95 tracking-tight mb-1'>
							{t('unscheduledTbdTitle')}
						</h3>
						<p className='text-xs text-icyWhite/50 mb-3 leading-relaxed'>
							{t('unscheduledTbdHint')}
						</p>
						<ul className='space-y-2.5 max-h-52 overflow-y-auto pr-0.5'>
							{tbdAppointments.map(apt => (
								<li
									key={apt.id}
									className='rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden'
								>
									<DraggableAppointment
										appointment={apt}
										awaitingCalendarAssignment
										disabled={!allowDrag || !!activeId}
										layout='list'
										onOpenDetail={() => setDetailAppointment(apt)}
										onEdit={
											allowCancel
												? () => onEditAppointment?.(apt)
												: undefined
										}
										onCancel={
											allowCancel
												? () => handleCancelAppointment(apt)
												: undefined
										}
										services={services}
									/>
								</li>
							))}
						</ul>
					</div>
				)}

				{fullDayAwaitingList.length > 0 && (
					<div className='border-t border-amber-500/25 bg-amber-950/20 p-3 sm:p-4'>
						<h3 className='text-sm font-semibold text-amber-100/95 tracking-tight mb-1'>
							{t('calendarBadgeDayTitle')}
						</h3>
						<p className='text-xs text-amber-100/55 mb-3 leading-relaxed'>
							{t('fullDayNeedDaysCalendarHint')}
						</p>
						<ul className='space-y-2.5 max-h-52 overflow-y-auto pr-0.5'>
							{fullDayAwaitingList.map(apt => (
								<li
									key={apt.id}
									className='rounded-lg border border-amber-500/35 bg-amber-950/35 overflow-hidden'
								>
									<DraggableAppointment
										appointment={apt}
										awaitingCalendarAssignment
										disabled={!allowDrag || !!activeId}
										layout='list'
										onOpenDetail={() => setDetailAppointment(apt)}
										onEdit={
											allowCancel && !isAppointmentPast(apt)
												? () => onEditAppointment?.(apt)
												: undefined
										}
										onCancel={
											allowCancel && !isAppointmentPast(apt)
												? () => handleCancelAppointment(apt)
												: undefined
										}
										services={services}
									/>
								</li>
							))}
						</ul>
					</div>
				)}

				<DragOverlay>
					{activeAppointment ? (
						<div className='pointer-events-none opacity-95'>
							<DraggableAppointment
								appointment={activeAppointment}
								awaitingCalendarAssignment={
									activeAppointment.scheduleTbd === true ||
									isFullDayAwaitingExplicitDays(activeAppointment)
								}
								disabled
								isDragOverlay
								blockHeight={activeDragOverlayHeightPx}
								onEdit={undefined}
								onCancel={undefined}
								services={services}
								layout={
									activeAppointment.scheduleTbd ? 'list' : 'calendar'
								}
							/>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Move / cancel confirmations: portal to body so fixed is viewport-based (glass-card backdrop-filter would trap fixed inside the panel). */}
			{typeof document !== 'undefined' &&
				pendingMove &&
				allowDrag &&
				createPortal(
					<div
						className='fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6'
						role='presentation'
					>
						<button
							type='button'
							className='absolute inset-0 bg-nearBlack/80 backdrop-blur-sm'
							aria-label={t('close')}
							onClick={handleCancelMove}
						/>
						<div
							role='dialog'
							aria-modal='true'
							aria-labelledby='admin-cal-move-title'
							className='relative z-[1] w-full max-w-md max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-nearBlack p-5 shadow-2xl shadow-black/50 sm:p-6'
							onClick={e => e.stopPropagation()}
						>
							<h3
								id='admin-cal-move-title'
								className='font-serif text-lg text-icyWhite sm:text-xl mb-2'
							>
								{t('calRescheduleTitle')}
							</h3>
							<p className='text-sm leading-relaxed text-icyWhite/70 mb-5 break-words'>
								{t('calRescheduleBody', {
									customerName: pendingMove.appointment.fullName,
									serviceName: pendingMove.appointment.service,
									dateStr:
										pendingMove.newFullDayDateKeys?.length &&
										pendingMove.newFullDayDateKeys.length > 0
											? formatFullDayMoveSummary(
													pendingMove.newFullDayDateKeys,
													locale,
												)
											: formatDateForEmail(
													cellIdToTimestamp(pendingMove.newCellId),
												),
									timeStr:
										pendingMove.newFullDayDateKeys?.length &&
										pendingMove.newFullDayDateKeys.length > 0
											? t('allDayNoClockTime')
											: formatTimeForEmail(
													cellIdToTimestamp(pendingMove.newCellId),
												),
								})}
							</p>
							<div className='flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3'>
								<button
									type='button'
									onClick={handleCancelMove}
									className='min-h-11 flex-1 rounded-xl border border-white/12 px-4 py-2.5 text-sm text-icyWhite hover:bg-white/10 sm:min-h-0 sm:flex-none sm:min-w-[7rem] sm:py-2.5'
								>
									{t('cancel')}
								</button>
								<button
									type='button'
									onClick={handleConfirmMove}
									className={`min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-medium sm:min-h-0 sm:flex-none sm:min-w-[9rem] sm:py-2.5 ${ui.btnPrimarySm}`}
								>
									{t('calRescheduleConfirm')}
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{typeof document !== 'undefined' &&
				pendingCancel &&
				allowCancel &&
				createPortal(
					<div
						className='fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6'
						role='presentation'
					>
						<button
							type='button'
							className='absolute inset-0 bg-nearBlack/80 backdrop-blur-sm'
							aria-label={t('close')}
							onClick={handleDismissCancel}
						/>
						<div
							role='alertdialog'
							aria-modal='true'
							aria-labelledby='admin-cal-cancel-title'
							aria-describedby='admin-cal-cancel-desc'
							className='relative z-[1] w-full max-w-md max-h-[min(85dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-red-500/20 bg-nearBlack p-5 shadow-2xl shadow-black/50 sm:p-6'
							onClick={e => e.stopPropagation()}
						>
							<h3
								id='admin-cal-cancel-title'
								className='font-serif text-lg text-icyWhite sm:text-xl mb-2'
							>
								{t('calCancelTitle')}
							</h3>
							<p
								id='admin-cal-cancel-desc'
								className='text-sm leading-relaxed text-icyWhite/70 mb-5 break-words'
							>
								{t('calCancelBody', {
									customerName: pendingCancel.fullName,
									serviceName: pendingCancel.service,
								})}
							</p>
							<div className='flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3'>
								<button
									type='button'
									onClick={handleDismissCancel}
									className='min-h-11 flex-1 rounded-xl border border-white/12 px-4 py-2.5 text-sm text-icyWhite hover:bg-white/10 sm:min-h-0 sm:flex-none sm:min-w-[7rem] sm:py-2.5'
								>
									{t('calCancelKeep')}
								</button>
								<button
									type='button'
									onClick={handleConfirmCancel}
									className='min-h-11 flex-1 rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/30 sm:min-h-0 sm:flex-none sm:min-w-[9rem] sm:py-2.5'
								>
									{t('calCancelConfirm')}
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}

			{detailAppointment ? (
				<AdminCalendarEventDetail
					appointment={detailAppointment}
					services={services}
					place={place}
					readOnly={isAppointmentPast(detailAppointment)}
					onClose={() => setDetailAppointment(null)}
					onEdit={a => {
						setDetailAppointment(null)
						onEditAppointment?.(a)
					}}
					onRequestCancel={a => {
						setDetailAppointment(null)
						handleCancelAppointment(a)
					}}
				/>
			) : null}
		</div>
	)
}
