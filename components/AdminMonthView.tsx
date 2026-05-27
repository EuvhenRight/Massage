'use client'

import type { AppointmentData } from '@/lib/book-appointment'
import { getDateKey } from '@/lib/booking'
import { formatTime } from '@/lib/format-date'
import { getPlaceAccentUi } from '@/lib/place-accent-ui'
import type { Place } from '@/lib/places'
import {
	resolvedOpaqueCalendarSlotFill,
} from '@/lib/section-calendar-colors'
import {
	ADMIN_APPOINTMENT_FALLBACK_COLOR,
	findServiceDataForAppointment,
	type ServiceData,
} from '@/lib/services'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

/** Sunday-based, matching the week grid's `startOfWeek`. */
function startOfWeekSunday(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
}

/** 6 weeks (42 days) covering the month of `anchor` — stable height across months. */
export function monthGridDays(anchor: Date): Date[] {
	const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
	const start = startOfWeekSunday(first)
	return Array.from({ length: 42 }, (_, i) => {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		d.setHours(0, 0, 0, 0)
		return d
	})
}

function isToday(d: Date): boolean {
	const t = new Date()
	return (
		d.getFullYear() === t.getFullYear() &&
		d.getMonth() === t.getMonth() &&
		d.getDate() === t.getDate()
	)
}

function startDateOf(apt: AppointmentData): Date {
	return apt.startTime && 'toDate' in apt.startTime
		? apt.startTime.toDate()
		: new Date(apt.startTime as Date)
}

/** Date keys an appointment occupies in the month grid (full-day spans → each day). */
function appointmentDateKeys(apt: AppointmentData): string[] {
	if (apt.adminBookingMode === 'day') {
		if (apt.adminFullDayDates && apt.adminFullDayDates.length > 0) {
			return apt.adminFullDayDates
		}
		const span = Math.max(1, Math.min(14, Number(apt.multiDayFullDayCount) || 1))
		const start = startDateOf(apt)
		return Array.from({ length: span }, (_, i) => {
			const d = new Date(start)
			d.setDate(start.getDate() + i)
			return getDateKey(d)
		})
	}
	return [getDateKey(startDateOf(apt))]
}

const MAX_CHIPS_PER_DAY = 3

export default function AdminMonthView({
	monthAnchor,
	appointments,
	services,
	place,
	onSelectDay,
	onOpenDetail,
}: {
	monthAnchor: Date
	appointments: AppointmentData[]
	services: ServiceData[]
	place: Place
	onSelectDay: (day: Date) => void
	onOpenDetail: (apt: AppointmentData) => void
}) {
	const locale = useLocale()
	const t = useTranslations('admin')
	const ui = useMemo(() => getPlaceAccentUi(place), [place])
	const days = useMemo(() => monthGridDays(monthAnchor), [monthAnchor])
	const currentMonth = monthAnchor.getMonth()
	const todayStart = useMemo(() => {
		const d = new Date()
		d.setHours(0, 0, 0, 0)
		return d
	}, [])

	const byDay = useMemo(() => {
		const map = new Map<string, AppointmentData[]>()
		for (const apt of appointments) {
			if (apt.scheduleTbd === true) continue
			for (const dk of appointmentDateKeys(apt)) {
				const bucket = map.get(dk) ?? []
				bucket.push(apt)
				map.set(dk, bucket)
			}
		}
		for (const [dk, list] of Array.from(map.entries())) {
			list.sort((a: AppointmentData, b: AppointmentData) => {
				const ad = a.adminBookingMode === 'day' ? 0 : 1
				const bd = b.adminBookingMode === 'day' ? 0 : 1
				if (ad !== bd) return ad - bd
				return startDateOf(a).getTime() - startDateOf(b).getTime()
			})
			map.set(dk, list)
		}
		return map
	}, [appointments])

	const dotClass = (apt: AppointmentData) =>
		resolvedOpaqueCalendarSlotFill(
			findServiceDataForAppointment(apt, services)?.color,
			ADMIN_APPOINTMENT_FALLBACK_COLOR,
		)

	const isEmpty = byDay.size === 0
	const weekdayLabels = days.slice(0, 7)

	return (
		<div className='min-w-0'>
			{/* Weekday header */}
			<div className='sticky top-0 z-[20] grid grid-cols-7 border-b border-white/10 bg-nearBlack/[0.97] backdrop-blur-md supports-[backdrop-filter]:bg-nearBlack/90'>
				{weekdayLabels.map(d => {
					const weekend = d.getDay() === 0 || d.getDay() === 6
					return (
						<div
							key={`wd-${d.getDay()}`}
							className={cn(
								'border-r border-white/[0.08] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.1em] last:border-r-0',
								weekend ? 'text-icyWhite/35' : 'text-icyWhite/50',
							)}
						>
							{d.toLocaleDateString(locale, { weekday: 'short' })}
						</div>
					)
				})}
			</div>

			{/* 6-week grid */}
			<div className='grid grid-cols-7'>
				{days.map(day => {
					const dk = getDateKey(day)
					const list = byDay.get(dk) ?? []
					const inMonth = day.getMonth() === currentMonth
					const past = day.getTime() < todayStart.getTime()
					const today = isToday(day)
					const weekend = day.getDay() === 0 || day.getDay() === 6
					const shown = list.slice(0, MAX_CHIPS_PER_DAY)
					const extra = list.length - shown.length
					return (
						<button
							type='button'
							key={dk}
							onClick={() => onSelectDay(day)}
							className={cn(
								'group/daycell flex min-h-[92px] flex-col gap-1 border-b border-r border-white/[0.08] p-1.5 text-left transition-colors last:border-r-0 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 sm:min-h-[112px]',
								weekend && inMonth && 'bg-white/[0.02]',
								!inMonth && 'bg-black/20',
								past && 'opacity-60',
							)}
							aria-label={day.toLocaleDateString(locale, {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})}
						>
							<span className='flex items-center justify-between'>
								{today ? (
									<span className={ui.weekCalendarTodayCircle}>
										{day.getDate()}
									</span>
								) : (
									<span
										className={cn(
											'text-xs font-medium tabular-nums',
											inMonth ? 'text-icyWhite/85' : 'text-icyWhite/35',
										)}
									>
										{day.getDate()}
									</span>
								)}
								{list.length > 0 ? (
									<span className='rounded-full bg-white/10 px-1.5 text-[9px] font-semibold leading-4 text-icyWhite/60'>
										{list.length}
									</span>
								) : null}
							</span>

							<span className='flex min-h-0 flex-col gap-0.5'>
								{shown.map(apt => {
									const isDay = apt.adminBookingMode === 'day'
									const label = isDay
										? t('allDayNoClockTime')
										: formatTime(startDateOf(apt), { locale })
									return (
										<span
											key={`${apt.id}-${dk}`}
											onClick={e => {
												e.stopPropagation()
												onOpenDetail(apt)
											}}
											className='flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors hover:bg-white/10'
											title={`${label} · ${apt.service ?? ''}`}
										>
											<span
												className={cn(
													'h-1.5 w-1.5 shrink-0 rounded-full',
													dotClass(apt),
												)}
												aria-hidden
											/>
											{!isDay ? (
												<span className='shrink-0 tabular-nums text-icyWhite/55'>
													{label}
												</span>
											) : null}
											<span className='truncate text-icyWhite/85'>
												{apt.service?.trim() || '—'}
											</span>
										</span>
									)
								})}
								{extra > 0 ? (
									<span className='px-1 text-[10px] font-medium text-icyWhite/45'>
										{t('monthMoreCount', { count: extra })}
									</span>
								) : null}
							</span>
						</button>
					)
				})}
			</div>

			{isEmpty ? (
				<p className='px-4 py-6 text-center text-sm text-icyWhite/40'>
					{t('calendarEmpty')}
				</p>
			) : null}
		</div>
	)
}
