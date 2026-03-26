'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	getDayBookingSlot,
	getPrepBufferMinutes,
	parseOccupiedSlots,
	type OccupiedSlot,
} from '@/lib/availability-firestore'
import { db } from '@/lib/firebase'
import { getBookingAccent } from '@/lib/booking-accent'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import {
	collection,
	getDocs,
	query,
	Timestamp,
	where,
} from 'firebase/firestore'
import { normalizeItemBookingDayCount } from '@/types/price-catalog'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBookingFlow } from './BookingFlowContext'
import PublicDatePicker from './PublicDatePicker'
import TimeSlotPicker from './TimeSlotPicker'

interface StepServiceAndDateProps {
	services: {
		title: string
		durationMinutes?: number
		bookingGranularity?: 'time' | 'day' | 'tbd'
		bookingDayCount?: number
	}[]
	place?: Place
}

export default function StepServiceAndDate({
	services,
	place = 'massage',
}: StepServiceAndDateProps) {
	const accent = useMemo(() => getBookingAccent(place), [place])
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const {
		step,
		service,
		setService,
		date,
		setDate,
		setTime,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		scheduleTbdCustomerMessage,
	} = useBookingFlow()
	const [month, setMonth] = useState(() => {
		const d = date ?? new Date()
		return new Date(d.getFullYear(), d.getMonth(), 1)
	})
	const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([])
	const [schedule, setSchedule] = useState<Awaited<
		ReturnType<typeof getSchedule>
	> | null>(null)
	const [loading, setLoading] = useState(true)

	const handleSelectDate = useCallback(
		(d: Date) => {
			if (bookingGranularity === 'day' && schedule) {
				const slot = getDayBookingSlot(d, schedule)
				setDate(d, slot?.startTime ?? null)
			} else {
				setDate(d)
			}
		},
		[bookingGranularity, schedule, setDate],
	)

	useEffect(() => {
		if (step !== 2 || bookingGranularity !== 'day' || !date || !schedule) return
		const slot = getDayBookingSlot(date, schedule)
		if (slot?.startTime) setTime(slot.startTime)
	}, [step, bookingGranularity, date, schedule, setTime])

	const year = month.getFullYear()
	const monthNum = month.getMonth()

	useEffect(() => {
		getSchedule(place)
			.then(setSchedule)
			.catch(() => setSchedule(null))
	}, [place])

	useEffect(() => {
		if (step === 2 && bookingGranularity === 'tbd') {
			setOccupiedSlots([])
			setLoading(false)
			return
		}
		let cancelled = false
		async function fetchAppointments() {
			setLoading(true)
			try {
				const start = new Date(year, monthNum, 1)
				const end = new Date(year, monthNum + 1, 0)
				end.setHours(23, 59, 59, 999)
				const q = query(
					collection(db, 'appointments'),
					where('place', '==', place),
					where('startTime', '>=', start),
					where('startTime', '<=', end),
				)
				const snapshot = await getDocs(q)
				if (cancelled) return
				const appointments = snapshot.docs.map(doc => {
					const d = doc.data()
					return {
						startTime: d.startTime as Timestamp,
						endTime: d.endTime as Timestamp,
					}
				})
				setOccupiedSlots(
					parseOccupiedSlots(appointments, getPrepBufferMinutes(schedule)),
				)
			} catch {
				setOccupiedSlots([])
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		fetchAppointments()
		return () => {
			cancelled = true
		}
	}, [year, monthNum, place, schedule, step, bookingGranularity])

	return (
		<div className='flex flex-col flex-1 min-h-0'>
			<div className={`${step === 2 ? 'flex flex-col flex-1 min-h-0' : 'space-y-5'}`}>
				{step === 1 && (
					<div className='space-y-2'>
						<label className='block text-sm font-medium text-icyWhite/90'>
							{tCommon('services')}
						</label>
						<Select value={service} onValueChange={setService}>
							<SelectTrigger
								className={`h-11 bg-white/5 border-0 ${accent.inputBorder} text-icyWhite hover:bg-white/[0.07] ${accent.selectTriggerRing}`}
							>
								<SelectValue placeholder={t('selectService')} />
							</SelectTrigger>
							<SelectContent>
								{services.map(s => (
									<SelectItem key={s.title} value={s.title}>
										{s.title}
										{s.bookingGranularity === 'day' ? (
											<span className='text-icyWhite/55 ml-1'>
												(
												{normalizeItemBookingDayCount(s.bookingDayCount) > 1
													? t('fullDaysBookingCount', {
															count: normalizeItemBookingDayCount(
																s.bookingDayCount,
															),
														})
													: t('fullDayBooking')}
												)
											</span>
										) : s.bookingGranularity === 'tbd' ? (
											<span className='text-icyWhite/55 ml-1'>
												({t('scheduleTbdBookingBadge')})
											</span>
										) : s.durationMinutes ? (
											<span className='text-icyWhite/55 ml-1'>
												({s.durationMinutes} min)
											</span>
										) : null}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{step === 2 && bookingGranularity === 'tbd' && (
					<div className='flex flex-col flex-1 min-h-0'>
						<p className='text-sm font-medium text-icyWhite mb-2'>
							{t('scheduleTbdCustomerHeading')}
						</p>
						<div
							className={`rounded-xl border px-4 py-3 text-sm text-icyWhite/85 whitespace-pre-wrap ${accent.inputBorder} bg-white/[0.03]`}
						>
							{scheduleTbdCustomerMessage.trim()
								? scheduleTbdCustomerMessage
								: t('scheduleTbdEmptyMessage')}
						</div>
					</div>
				)}

				{step === 2 && bookingGranularity !== 'tbd' && (
					<div className='flex flex-col flex-1 min-h-0'>
						<div className='flex-1 min-h-0 flex flex-col overflow-hidden'>
							<PublicDatePicker
								accent={accent}
								selectedDate={date}
								onSelectDate={handleSelectDate}
								occupiedSlots={occupiedSlots}
								durationMinutes={durationMinutes}
								bookingGranularity={bookingGranularity}
								multiDayCount={
									bookingGranularity === 'day' ? bookingDayCount : 1
								}
								month={month}
								onMonthChange={d =>
									setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
								}
								schedule={schedule}
							/>
						</div>
						{date && bookingGranularity !== 'day' && (
							<div className='flex-shrink-0 pt-4'>
								<TimeSlotPicker
									accent={accent}
									date={date}
									selectedTime={time}
									onSelectTime={setTime}
									occupiedSlots={occupiedSlots}
									durationMinutes={durationMinutes}
									schedule={schedule}
								/>
							</div>
						)}
						{date && bookingGranularity === 'day' && time && (
							<p className='flex-shrink-0 pt-4 text-sm text-icyWhite/70'>
								{bookingDayCount >= 2
									? t('fullMultiDayBookingSummary', {
											time,
											count: bookingDayCount,
										})
									: t('fullDayBookingWithTime', { time })}
							</p>
						)}
					</div>
				)}
			</div>

			{loading && bookingGranularity !== 'tbd' && (
				<p className='text-xs text-icyWhite/45'>{t('loadingAvailability')}</p>
			)}
		</div>
	)
}
