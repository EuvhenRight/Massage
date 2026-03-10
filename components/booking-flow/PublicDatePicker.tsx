'use client'

import type { OccupiedSlot } from '@/lib/availability-firestore'
import { isDateAvailable } from '@/lib/availability-firestore'
import type { ScheduleData } from '@/lib/schedule-firestore'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

interface PublicDatePickerProps {
	selectedDate: Date | null
	onSelectDate: (date: Date) => void
	occupiedSlots: OccupiedSlot[]
	durationMinutes: number
	month: Date
	onMonthChange: (date: Date) => void
	schedule?: ScheduleData | null
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function getDaysInMonth(year: number, month: number): (Date | null)[] {
	const first = new Date(year, month, 1)
	const last = new Date(year, month + 1, 0)
	const startPad = first.getDay()
	const days: (Date | null)[] = Array(startPad).fill(null)
	for (let d = 1; d <= last.getDate(); d++) {
		days.push(new Date(year, month, d))
	}
	const total = Math.ceil(days.length / 7) * 7
	while (days.length < total) days.push(null)
	return days
}

function isPast(date: Date): boolean {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d.getTime() < today.getTime()
}

function sameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

export default function PublicDatePicker({
	selectedDate,
	onSelectDate,
	occupiedSlots,
	durationMinutes,
	month,
	onMonthChange,
	schedule = null,
}: PublicDatePickerProps) {
	const locale = useLocale()
	const t = useTranslations('admin')
	const tCommon = useTranslations('common')
	const weekHeaders = WEEKDAY_KEYS.map(k => t(k))
	const today = useMemo(() => {
		const d = new Date()
		d.setHours(0, 0, 0, 0)
		return d
	}, [])

	const days = useMemo(
		() => getDaysInMonth(month.getFullYear(), month.getMonth()),
		[month],
	)

	const isAvailable = useCallback(
		(date: Date) => {
			if (isPast(date)) return false
			return isDateAvailable(date, durationMinutes, occupiedSlots, schedule)
		},
		[durationMinutes, occupiedSlots, schedule],
	)

	return (
		<div
			className='rounded-xl border-x border-b border-t border-white/10 bg-nearBlack/60 shadow-lg overflow-hidden flex flex-col flex-1 min-h-0'
			role='application'
			aria-label={tCommon('calendar')}
		>
			{/* Month navigation */}
			<div className='flex items-center justify-between p-2 sm:p-1.5 border-b border-white/10 flex-shrink-0'>
				<button
					type='button'
					onClick={() =>
						onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1))
					}
					className='min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-icyWhite/70 hover:text-icyWhite hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack'
					aria-label={t('prevMonth')}
				>
					<svg
						className='w-5 h-5'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M15 19l-7-7 7-7'
						/>
					</svg>
				</button>
				<h3 className='font-serif text-sm sm:text-base text-icyWhite font-medium'>
					{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
				</h3>
				<button
					type='button'
					onClick={() =>
						onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1))
					}
					className='min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-icyWhite/70 hover:text-icyWhite hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack'
					aria-label={t('nextMonth')}
				>
					<svg
						className='w-5 h-5'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M9 5l7 7-7 7'
						/>
					</svg>
				</button>
			</div>

			{/* Weekday headers */}
			<div className='grid grid-cols-7 bg-white/[0.02] flex-shrink-0'>
				{weekHeaders.map(wd => (
					<div
						key={wd}
						className='text-[10px] font-medium text-icyWhite/50 text-center py-px'
					>
						{wd}
					</div>
				))}
			</div>

			{/* Date grid — flex to fit, no scroll */}
			<div className='grid grid-cols-7 gap-1 p-2 flex-1 min-h-0 auto-rows-fr'>
				{days.map((date, i) => {
					if (!date) {
						return <div key={`pad-${i}`} className='min-h-0' aria-hidden />
					}
					const available = isAvailable(date)
					const selected = selectedDate && sameDay(date, selectedDate)
					const isToday = sameDay(date, today)

					return (
						<button
							key={date.toISOString()}
							type='button'
							onClick={() => available && onSelectDate(date)}
							disabled={!available}
							aria-pressed={!!selected}
							aria-label={`${date.getDate()} ${month.toLocaleDateString(locale, { month: 'long' })}${available ? `, ${tCommon('available')}` : `, ${tCommon('unavailable')}`}`}
							className={`
                min-h-[36px] sm:min-h-0 rounded-lg sm:rounded text-sm font-medium transition-colors touch-manipulation w-full h-full min-w-0
                flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-gold-soft/60 focus:ring-offset-2 focus:ring-offset-nearBlack
                ${available ? 'cursor-pointer' : 'cursor-not-allowed'}
                ${
									selected
										? 'bg-gold-soft text-nearBlack ring-1 ring-gold-soft'
										: ''
								}
                ${
									available && !selected
										? 'text-gold-soft/90 hover:bg-gold-soft/25 hover:text-gold-soft hover:ring-1 hover:ring-gold-soft/50'
										: ''
								}
                ${!available ? 'text-icyWhite/30' : ''}
                ${isToday && !selected ? 'ring-1 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow' : ''}
              `}
						>
							{date.getDate()}
						</button>
					)
				})}
			</div>
		</div>
	)
}
