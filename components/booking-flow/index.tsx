'use client'

import {
	bookAppointment,
	bookScheduleTbdAppointment,
} from '@/lib/book-appointment'
import { getDayBookingSlot } from '@/lib/availability-firestore'
import { getDateKey } from '@/lib/booking'
import { getBookingAccent } from '@/lib/booking-accent'
import type { BookingFormData } from '@/lib/booking-schema'
import { formatDateForEmail, formatTimeForEmail } from '@/lib/format-date'
import type { Place } from '@/lib/places'
import { getSchedule } from '@/lib/schedule-firestore'
import type { PriceCatalogStructure } from '@/types/price-catalog'
import { AnimatePresence, motion } from 'framer-motion'
import { Search as SearchIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookingFlowProvider, useBookingFlow } from './BookingFlowContext'
import BookingSidebar from './BookingSidebar'
import BookingStepProgress from './BookingStepProgress'
import StepCustomerInfo, {
	type StepCustomerInfoHandle,
} from './StepCustomerInfo'
import StepServiceAndDate from './StepServiceAndDate'
import StepServiceFromPriceCatalog from './StepServiceFromPriceCatalog'

export interface BookingFlowProps {
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
	defaultDuration?: number
	defaultService?: string
	priceCatalog?: PriceCatalogStructure | null
	onSuccess?: () => void
	onCancel?: () => void
	place?: Place
}

function BookingFlowInner({
	services,
	defaultDuration = 60,
	priceCatalog,
	onSuccess,
	onCancel,
	place = 'massage',
}: BookingFlowProps) {
	const accent = useMemo(() => getBookingAccent(place), [place])
	const t = useTranslations('booking')
	const locale = useLocale()
	const router = useRouter()
	const {
		step,
		service,
		date,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		scheduleTbdCustomerMessage,
		scheduleTbdAdminHint,
		fullName,
		email,
		phone,
		nextStep,
		prevStep,
		clearDraft,
	} = useBookingFlow()
	const [searchQuery, setSearchQuery] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [formValid, setFormValid] = useState(false)
	const stepCustomerRef = useRef<StepCustomerInfoHandle | null>(null)

	const canNextStep12 =
		(step === 1 && !!service) ||
		(step === 2 &&
			(bookingGranularity === 'tbd' || (!!date && !!time)))
	const canNextStep3 = step === 3 && formValid
	const isMobileReview = step === 4
	const canConfirm =
		formValid || (isMobileReview && !!(fullName && email && phone))

	const handleBack = useCallback(() => {
		if (step > 1) prevStep()
		else onCancel?.() ?? router.back()
	}, [step, prevStep, onCancel, router])

	const handleConfirm = useCallback(
		async (formData?: BookingFormData) => {
			if (bookingGranularity !== 'tbd' && !date) return
			let submitTime = time
			let submitDuration = durationMinutes
			let multiDayFullDayCount: number | undefined
			if (bookingGranularity === 'tbd') {
				const dataTbd: BookingFormData = formData ?? {
					service: service || '',
					fullName: fullName || '',
					email: email || '',
					phone: phone || '',
				}
				setIsSubmitting(true)
				try {
					const finalService =
						(service || dataTbd.service || services[0]?.title) ?? ''
					const selected =
						services.find(s => s.title === finalService) ?? services[0]
					await bookScheduleTbdAppointment(
						{
							service: finalService,
							fullName: dataTbd.fullName,
							email: dataTbd.email,
							phone: dataTbd.phone,
							durationMinutes: selected?.durationMinutes ?? durationMinutes,
							serviceId: selected?.id,
							serviceSk: selected?.titleSk ?? finalService,
							serviceEn: selected?.titleEn ?? finalService,
							serviceRu: selected?.titleRu ?? finalService,
							serviceUk: selected?.titleUk ?? finalService,
							scheduleTbdAdminHint: scheduleTbdAdminHint || undefined,
						},
						place,
					)

					const res = await fetch('/api/send-confirmation', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							to: dataTbd.email,
							customerName: dataTbd.fullName,
							date: t('emailScheduleTbdDateLine'),
							time: t('emailScheduleTbdTimeLine'),
							service: finalService,
						}),
					})

					if (!res.ok) {
						const errBody = await res.json().catch(() => ({}))
						toast.error(
							t('emailNotSent', {
								error: errBody?.error ?? 'email could not be sent',
							}),
						)
					} else {
						clearDraft()
						const itemName = finalService.includes(' › ')
							? (finalService.split(' › ').pop() ?? finalService)
							: finalService
						setSuccessMessage(
							JSON.stringify({
								title: t('bookingConfirmed'),
								service: itemName,
							}),
						)
					}
					onSuccess?.()
				} catch {
					toast.error(t('bookingFailed'))
				} finally {
					setIsSubmitting(false)
				}
				return
			}

			if (!date) return
			if (bookingGranularity === 'day') {
				const sched = await getSchedule(place)
				const slot = getDayBookingSlot(date, sched)
				if (!slot) {
					toast.error(t('slotUnavailable'))
					return
				}
				submitTime = slot.startTime
				submitDuration = slot.durationMinutes
				if (bookingDayCount >= 2) {
					multiDayFullDayCount = bookingDayCount
				}
			} else if (!submitTime) {
				return
			}
			const data: BookingFormData = formData ?? {
				service: service || '',
				fullName: fullName || '',
				email: email || '',
				phone: phone || '',
			}
			setIsSubmitting(true)
			try {
				const finalService =
					(service || data.service || services[0]?.title) ?? ''
				const selected =
					services.find(s => s.title === finalService) ?? services[0]
				const dateStr = getDateKey(date)
				await bookAppointment(
					{
						date: dateStr,
						startTime: submitTime,
						durationMinutes: submitDuration,
						service: finalService,
						serviceId: selected?.id,
						serviceSk: selected?.titleSk ?? finalService,
						serviceEn: selected?.titleEn ?? finalService,
						serviceRu: selected?.titleRu ?? finalService,
						serviceUk: selected?.titleUk ?? finalService,
						fullName: data.fullName,
						email: data.email,
						phone: data.phone,
						...(multiDayFullDayCount != null
							? { multiDayFullDayCount }
							: {}),
					},
					place,
				)

				const slotDate = new Date(date)
				const [h, m] = submitTime.split(':').map(Number)
				slotDate.setHours(h, m, 0, 0)

				const baseTime = formatTimeForEmail(slotDate)
				const emailTime =
					bookingGranularity === 'day' && bookingDayCount >= 2
						? t('emailTimeMultiDay', {
								time: baseTime,
								count: bookingDayCount,
							})
						: baseTime

				const res = await fetch('/api/send-confirmation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						to: data.email,
						customerName: data.fullName,
						date: formatDateForEmail(slotDate),
						time: emailTime,
						service: finalService,
					}),
				})

				if (!res.ok) {
					const data = await res.json().catch(() => ({}))
					toast.error(
						t('emailNotSent', {
							error: data?.error ?? 'email could not be sent',
						}),
					)
				} else {
					clearDraft()
					const itemName = finalService.includes(' › ')
						? (finalService.split(' › ').pop() ?? finalService)
						: finalService
					setSuccessMessage(
						JSON.stringify({ title: t('bookingConfirmed'), service: itemName }),
					)
				}
				onSuccess?.()
			} catch (err) {
				const code = err instanceof Error ? err.message : ''
				const msg =
					code === 'OVERLAP' || code === 'DAY_CLOSED'
						? t('slotUnavailable')
						: t('bookingFailed')
				toast.error(msg)
			} finally {
				setIsSubmitting(false)
			}
		},
		[
			date,
			time,
			durationMinutes,
			bookingGranularity,
			bookingDayCount,
			service,
			services,
			scheduleTbdAdminHint,
			fullName,
			email,
			phone,
			onSuccess,
			place,
			t,
			clearDraft,
		],
	)

	const getDesktopButtonLabel = () => {
		if (step <= 2) return t('next')
		return t('confirmBooking')
	}
	const getDesktopCanProceed = () => {
		if (step <= 2) return !!canNextStep12
		return !!canConfirm
	}
	const handleDesktopButtonClick = useCallback(() => {
		if (step <= 2) {
			nextStep()
			return
		}
		if (step === 3) {
			stepCustomerRef.current?.submitForConfirm(handleConfirm)
			return
		}
		handleConfirm()
	}, [step, nextStep, handleConfirm])

	const getMobileButtonLabel = () => {
		if (step <= 3) return t('next')
		return t('confirmBooking')
	}
	const getMobileCanProceed = () => {
		if (step <= 2) return !!canNextStep12
		if (step === 3) return !!canNextStep3
		return true
	}
	const handleMobileButtonClick = useCallback(async () => {
		if (step <= 2) {
			nextStep()
			return
		}
		if (step === 3) {
			const ok = await stepCustomerRef.current?.submitForSave()
			if (ok) nextStep()
			return
		}
		handleConfirm()
	}, [step, nextStep, handleConfirm])

	if (successMessage) {
		let title = t('bookingConfirmed')
		let serviceName = ''
		try {
			const parsed = JSON.parse(successMessage)
			title = parsed.title ?? title
			serviceName = parsed.service ?? ''
		} catch {
			title = successMessage
		}
		return (
			<motion.div
				className='flex-1 flex items-center justify-center p-6 sm:p-8'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
			>
				<motion.div
					className='text-center space-y-6 max-w-md'
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.35,
						delay: 0.1,
						ease: [0.25, 0.46, 0.45, 0.94],
					}}
				>
					<p className='font-serif text-xl sm:text-2xl text-icyWhite'>
						{title}
					</p>
					{serviceName && (
						<p className='text-icyWhite/80 text-base sm:text-lg'>
							{serviceName}
						</p>
					)}
					<button
						type='button'
						onClick={() => router.push(`/${locale}`)}
						className={accent.successBtn}
					>
						{t('backToWebsite')}
					</button>
				</motion.div>
			</motion.div>
		)
	}

	const progressStep = step === 4 ? 3 : step

	return (
		<div className='flex flex-col h-full min-h-0 md:min-h-[420px]'>
			{/* Progress — static top */}
			<div className='shrink-0'>
				<BookingStepProgress currentStep={progressStep} place={place} />
			</div>

			{/* Body: main + sidebar — tablet/laptop: row; mobile: column, full height to bottom button */}
			<div className='flex-1 flex min-h-0 md:flex-row flex-col overflow-hidden'>
				{/* Main content — full width mobile, flex-1 tablet+ */}
				<main className='flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden pb-12 md:pb-0'>
					<div className='px-4 py-2 sm:px-5 flex-shrink-0 flex items-center justify-between gap-3 sm:gap-4'>
						<button
							type='button'
							onClick={handleBack}
							className='flex items-center gap-1.5 text-icyWhite/60 hover:text-icyWhite text-sm font-medium transition-colors shrink-0 min-h-[44px] pl-0 pr-1 py-0 md:py-2 -ml-1 rounded-lg active:bg-white/5 touch-manipulation'
							aria-label={step === 1 ? t('cancel') : t('back')}
						>
							<svg
								className='w-5 h-5 shrink-0'
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
							<span>{step === 1 ? t('cancel') : t('back')}</span>
						</button>
						{step === 1 &&
							priceCatalog &&
							(priceCatalog.man.services?.length ||
								priceCatalog.woman.services?.length) && (
								<div className='flex-1 min-w-0 max-w-[240px] sm:max-w-[280px] relative'>
									<SearchIcon
										className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-icyWhite/50 pointer-events-none'
										aria-hidden
									/>
									<input
										type='search'
										value={searchQuery}
										onChange={e => setSearchQuery(e.target.value)}
										placeholder={t('searchServicePlaceholder')}
										aria-label={t('searchServicePlaceholder')}
										className={accent.searchFocus}
									/>
								</div>
							)}
					</div>

					<div className='flex-1 min-h-0 flex flex-col overflow-hidden px-4 sm:px-5 pb-4 sm:pb-5'>
						<div className='flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 md:p-5'>
							<AnimatePresence mode='wait'>
								{step <= 2 &&
								priceCatalog &&
								(priceCatalog.man.services?.length ||
									priceCatalog.woman.services?.length) ? (
									<motion.div
										key='step-price-catalog'
										initial={{ opacity: 0, x: -8 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 8 }}
										transition={{
											duration: 0.2,
											ease: [0.25, 0.46, 0.45, 0.94],
										}}
										className='flex-1 min-h-0 flex flex-col'
									>
										<StepServiceFromPriceCatalog
											place={place}
											accent={accent}
											catalog={priceCatalog}
											services={services}
											searchQuery={searchQuery}
											setSearchQuery={setSearchQuery}
										/>
									</motion.div>
								) : step <= 2 ? (
									<motion.div
										key='step-service-date'
										initial={{ opacity: 0, x: -8 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 8 }}
										transition={{
											duration: 0.2,
											ease: [0.25, 0.46, 0.45, 0.94],
										}}
										className='flex-1 min-h-0 flex flex-col'
									>
										<StepServiceAndDate services={services} place={place} />
									</motion.div>
								) : null}
								{step === 3 && (
									<motion.div
										key='step-customer'
										initial={{ opacity: 0, x: 8 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.25,
											ease: [0.25, 0.46, 0.45, 0.94],
										}}
										className='flex flex-col min-h-0 overflow-y-auto'
									>
										<StepCustomerInfo
											ref={stepCustomerRef}
											place={place}
											onSubmit={handleConfirm}
											isSubmitting={isSubmitting}
											onValidityChange={setFormValid}
										/>
									</motion.div>
								)}
								{/* Mobile step 4: full booking summary (review before confirm) */}
								{step === 4 && (
									<motion.div
										key='step-mobile-review'
										initial={{ opacity: 0, x: 8 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.25,
											ease: [0.25, 0.46, 0.45, 0.94],
										}}
										className='flex-1 min-h-0 overflow-y-auto md:hidden'
									>
										<BookingSidebar />
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				</main>

				{/* Sidebar — tablet (md) and laptop: visible. Mobile: hidden for steps 1–3, step 4 shows summary in main */}
				<aside className='hidden md:flex w-80 lg:w-96 shrink-0 flex-col border-l border-white/10 min-h-0'>
					<div className='flex-1 min-h-0 overflow-y-auto'>
						<BookingSidebar />
					</div>
					<div className='p-4 lg:p-5 border-t border-white/10 flex-shrink-0'>
						<button
							type='button'
							onClick={handleDesktopButtonClick}
							disabled={!getDesktopCanProceed() || isSubmitting}
							className={`w-full py-3 sm:py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
								getDesktopCanProceed() && !isSubmitting
									? accent.btnPrimaryDesktop
									: 'bg-white/10 text-icyWhite/40 cursor-not-allowed'
							}`}
						>
							{step >= 3 && isSubmitting
								? t('bookingInProgress')
								: getDesktopButtonLabel()}
						</button>
					</div>
				</aside>
			</div>

			{/* Mobile-only: fixed bottom button — steps 1–4 */}
			<div className='md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-nearBlack/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0)]'>
				<div className='px-4 py-3 sm:py-4'>
					<button
						type='button'
						onClick={handleMobileButtonClick}
						disabled={!getMobileCanProceed() || (step === 4 && isSubmitting)}
						className={`w-full min-h-[48px] sm:min-h-[52px] py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
							getMobileCanProceed() && !(step === 4 && isSubmitting)
								? accent.btnPrimaryMobile
								: 'bg-white/10 text-icyWhite/40 cursor-not-allowed'
						}`}
					>
						{step === 4 && isSubmitting
							? t('bookingInProgress')
							: getMobileButtonLabel()}
					</button>
				</div>
			</div>
		</div>
	)
}

export default function BookingFlow(props: BookingFlowProps) {
	return (
		<BookingFlowProvider
			services={props.services}
			defaultDuration={props.defaultDuration}
			defaultService={props.defaultService ?? props.services[0]?.title}
			place={props.place}
		>
			<BookingFlowInner {...props} />
		</BookingFlowProvider>
	)
}

export { BookingFlowProvider, useBookingFlow }
export type { BookingFlowState, BookingGranularity } from './BookingFlowContext'
