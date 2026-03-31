'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	getPrepBufferMinutes,
	parseOccupiedSlots,
	type OccupiedSlot,
} from '@/lib/availability-firestore'
import {
	appointmentIntervalsFromDocs,
	queryAppointmentsOverlappingRange,
} from '@/lib/appointments-overlap-query'
import { db } from '@/lib/firebase'
import { getBookingAccent } from '@/lib/booking-accent'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import { getDocs } from 'firebase/firestore'
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
			setDate(d)
		},
		[setDate],
	)

	const year = month.getFullYear()
	const monthNum = month.getMonth()

	useEffect(() => {
		getSchedule(place)
			.then(setSchedule)
			.catch(() => setSchedule(null))
	}, [place])

	useEffect(() => {
		if (step === 2 && (bookingGranularity === 'tbd' || bookingGranularity === 'day')) {
			setOccupiedSlots([])
			setLoading(false)
			return
		}
		let cancelled = false
		async function fetchAppointments() {
			setLoading(true)
			try {
				const rangeStart = new Date(year, monthNum, 1)
				const rangeEnd = new Date(year, monthNum + 1, 0)
				rangeEnd.setHours(23, 59, 59, 999)
				const q = queryAppointmentsOverlappingRange(
					db,
					place,
					rangeStart,
					rangeEnd,
				)
				const snapshot = await getDocs(q)
				if (cancelled) return
				const appointments = appointmentIntervalsFromDocs(snapshot.docs)
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
										{s.bookingGranularity === 'tbd' ? (
											<span className='text-icyWhite/55 ml-1'>
												({t('scheduleTbdBookingBadge')})
											</span>
										) : s.bookingGranularity === 'day' ? (
											<span className='text-icyWhite/55 ml-1'>
												({t('allDayBadge', { count: s.bookingDayCount ?? 1 })})
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
							month={month}
							onMonthChange={d =>
								setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
							}
							schedule={schedule}
						/>
					</div>
					{bookingGranularity !== 'day' && date && (
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
				</div>
			)}
			</div>

			{loading && bookingGranularity !== 'tbd' && (
				<p className='text-xs text-icyWhite/45'>{t('loadingAvailability')}</p>
			)}
		</div>
	)
}
