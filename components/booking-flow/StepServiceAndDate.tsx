'use client'

import type { OccupiedSlot } from '@/lib/availability-firestore'
import { fetchMergedPublicOccupiedSlots } from '@/lib/booking-occupied-slots'
import { getBookingAccent } from '@/lib/booking-accent'
import {
	bookingItemFromServiceRow,
	MAX_BOOKING_ITEMS,
} from '@/lib/booking-items'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBookingFlow } from './BookingFlowContext'
import { BookingCartTotals } from './BookingCart'
import PublicDatePicker from './PublicDatePicker'
import TbdBookingRecap from './TbdBookingRecap'
import TimeSlotPicker from './TimeSlotPicker'

interface StepServiceAndDateProps {
	services: {
		id?: string
		title: string
		durationMinutes?: number
		bookingGranularity?: 'time' | 'day' | 'tbd'
		bookingDayCount?: number
		scheduleTbdMessage?: string
		scheduleTbdAdminNote?: string
		titleSk?: string
		titleEn?: string
		titleRu?: string
		titleUk?: string
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
	const tPrice = useTranslations('price')
	const {
		step,
		service,
		items,
		addItem,
		removeItem,
		hasItem,
		canAddItem,
		priceTotal,
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
	const [occupancyRefreshTick, setOccupancyRefreshTick] = useState(0)

	useEffect(() => {
		const onVis = () => {
			if (document.visibilityState === 'visible') {
				setOccupancyRefreshTick(t => t + 1)
			}
		}
		document.addEventListener('visibilitychange', onVis)
		return () => document.removeEventListener('visibilitychange', onVis)
	}, [])

	const handleSelectDate = useCallback(
		(d: Date) => {
			setDate(d)
		},
		[setDate],
	)

	/** Same add/remove rules as the catalog step, including the TBD-mix refusal. */
	const handleToggleService = useCallback(
		(row: StepServiceAndDateProps['services'][number]) => {
			const candidate = bookingItemFromServiceRow(row)
			if (hasItem(candidate.key)) {
				removeItem(candidate.key)
				return
			}
			const check = canAddItem(candidate)
			if (!check.ok) {
				if (check.reason === 'max-items') {
					toast.error(t('cartMaxItems', { count: MAX_BOOKING_ITEMS }))
				} else if (check.reason === 'tbd-into-timed') {
					toast.error(t('cartTbdCannotJoin'))
				} else if (check.reason === 'timed-into-tbd') {
					toast.error(t('cartCannotJoinTbd'))
				} else if (check.reason === 'tbd-into-tbd') {
					toast.error(t('cartTbdOnlyOne'))
				}
				return
			}
			addItem(candidate)
		},
		[addItem, removeItem, hasItem, canAddItem, t],
	)

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
				const rangeStart = new Date(year, monthNum, 1)
				const rangeEnd = new Date(year, monthNum + 1, 0)
				rangeEnd.setHours(23, 59, 59, 999)
				const merged = await fetchMergedPublicOccupiedSlots(
					place,
					rangeStart,
					rangeEnd,
					schedule,
				)
				if (cancelled) return
				setOccupiedSlots(merged)
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
	}, [year, monthNum, place, schedule, step, bookingGranularity, occupancyRefreshTick])

	return (
		<div className='flex flex-col flex-1 min-h-0'>
			<div className={`${step === 2 ? 'flex flex-col flex-1 min-h-0' : 'space-y-5'}`}>
				{step === 1 && (
					<div className='space-y-2'>
						<label className='block text-sm font-medium text-icyWhite/90'>
							{tCommon('services')}
						</label>
						{/* Checkbox list rather than a dropdown: a booking can hold several
						    services, and a single-select control would hide that entirely. */}
						<ul className='space-y-2'>
							{services.map(s => {
								const candidate = bookingItemFromServiceRow(s)
								const isSelected = hasItem(candidate.key)
								const isTbd =
									s.bookingGranularity === 'tbd' || s.bookingGranularity === 'day'
								return (
									<li key={candidate.key}>
										<button
											type='button'
											aria-pressed={isSelected}
											onClick={() => handleToggleService(s)}
											className={`w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl border text-left transition-all touch-manipulation active:scale-[0.99] ${
												isSelected
													? accent.itemSelected
													: 'border-white/10 bg-white/5 hover:border-white/20 active:border-white/25'
											}`}
										>
											<span
												className={`shrink-0 size-4 rounded-[5px] border flex items-center justify-center transition-colors ${
													isSelected
														? 'bg-icyWhite border-icyWhite text-nearBlack'
														: 'border-white/25 text-transparent'
												}`}
												aria-hidden
											>
												<Check className='size-3' strokeWidth={3} />
											</span>
											<span className='flex-1 min-w-0'>
												<span className='block text-sm font-medium text-icyWhite truncate'>
													{s.title}
												</span>
												<span className='block text-xs text-icyWhite/55 mt-0.5'>
													{isTbd
														? `${t('scheduleTbdBookingBadge')} · ${t('allDayBadge', {
																count: s.bookingDayCount ?? 1,
															})}`
														: `${s.durationMinutes ?? 60} ${tPrice('min')}`}
												</span>
											</span>
										</button>
									</li>
								)
							})}
						</ul>
						{items.length > 0 && (
							<BookingCartTotals
								items={items}
								durationMinutes={durationMinutes}
								priceTotal={priceTotal}
								className='pt-3 mt-1 border-t border-white/10'
							/>
						)}
					</div>
				)}

				{step === 2 && bookingGranularity === 'tbd' && (
					<div className='flex flex-col flex-1 min-h-0'>
						<TbdBookingRecap
							accent={accent}
							service={service}
							bookingDayCount={bookingDayCount}
						/>
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
					{date && (
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
