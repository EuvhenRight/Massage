'use client'

import { bookAppointment } from '@/lib/book-appointment'
import { getDateKey } from '@/lib/booking'
import type { BookingFormData } from '@/lib/booking-schema'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
	BookingFlowProvider,
	useBookingFlow,
	type BookingFlowState,
} from './BookingFlowContext'
import BookingSidebar from './BookingSidebar'
import BookingStepProgress from './BookingStepProgress'
import StepCustomerInfo from './StepCustomerInfo'
import StepServiceAndDate from './StepServiceAndDate'

import type { Place } from '@/lib/places'

export interface BookingFlowProps {
	services: { title: string; durationMinutes?: number }[]
	defaultDuration?: number
	onSuccess?: () => void
	onCancel?: () => void
	place?: Place
}

function BookingFlowInner({
	services,
	defaultDuration = 60,
	onSuccess,
	onCancel,
	place = 'massage',
}: BookingFlowProps) {
	const router = useRouter()
	const { step, service, date, time, durationMinutes, nextStep, prevStep } =
		useBookingFlow()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const canNext =
		(step === 1 && service && date && time) || step === 2

	const handleBack = useCallback(() => {
		if (step > 1) {
			prevStep()
		} else {
			onCancel?.() ?? router.back()
		}
	}, [step, prevStep, onCancel, router])

	const handleConfirm = useCallback(
		async (formData: BookingFormData) => {
			if (!date || !time) return
			setIsSubmitting(true)
			try {
				const dateStr = getDateKey(date)
				await bookAppointment(
					{
						date: dateStr,
						startTime: time,
						durationMinutes,
						service: (service || formData.service || services[0]?.title) ?? '',
						fullName: formData.fullName,
						email: formData.email,
						phone: formData.phone,
					},
					place
				)

				const slotDate = new Date(date)
				const [h, m] = time.split(':').map(Number)
				slotDate.setHours(h, m, 0, 0)

				const res = await fetch('/api/send-confirmation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						to: formData.email,
						customerName: formData.fullName,
						date: slotDate.toLocaleDateString('en-US', {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							year: 'numeric',
						}),
						time: slotDate.toLocaleTimeString('en-US', {
							hour: 'numeric',
							minute: '2-digit',
							hour12: true,
						}),
						service: service || formData.service,
					}),
				})

				if (!res.ok) {
					const data = await res.json().catch(() => ({}))
					toast.error(
						`Booking confirmed, but ${data?.error ?? 'email could not be sent'}`,
					)
				} else {
					toast.success('Booking confirmed! Check your email.')
				}

				onSuccess?.()
			} catch (err) {
				const message =
					err instanceof Error && err.message === 'OVERLAP'
						? 'This time slot is no longer available. Please choose another.'
						: 'Booking failed. Please try again.'
				toast.error(message)
			} finally {
				setIsSubmitting(false)
			}
		},
		[date, time, durationMinutes, service, services, onSuccess, place],
	)

	const stepTitles = [
		'Choose service, date & time',
		'Your details',
	]
	const stepDescriptions = [
		'Pick your treatment, date and time.',
		'We\'ll use this to confirm your booking.',
	]
	const stepLabels = ['Next', 'Confirm booking']
	const showNextButton = step < 2

	return (
		<div className='flex flex-col min-h-[420px]'>
			<BookingStepProgress currentStep={step} />

			<div className='flex flex-1 flex-col lg:flex-row gap-6 lg:gap-8 p-6 sm:p-8 md:min-h-0'>
				<main className='flex-1 min-w-0'>
					<div className='mb-6'>
						<button
							type='button'
							onClick={handleBack}
							className='flex items-center gap-1.5 text-icyWhite/60 hover:text-icyWhite text-sm transition-colors mb-3'
						>
							<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
							</svg>
							{step === 1 ? 'Cancel' : 'Back'}
						</button>
						<h2 className='font-serif text-xl sm:text-2xl text-icyWhite mb-1'>
							{stepTitles[step - 1]}
						</h2>
						<p className='text-icyWhite/60 text-sm'>
							{stepDescriptions[step - 1]}
						</p>
					</div>

					<div className='rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8'>
						{step === 1 && <StepServiceAndDate services={services} place={place} />}
						{step === 2 && (
							<StepCustomerInfo
								onSubmit={handleConfirm}
								isSubmitting={isSubmitting}
							/>
						)}
					</div>
				</main>

				<aside className='w-full lg:w-80 shrink-0 lg:self-start lg:pt-[4.5rem] flex flex-col gap-4'>
					<BookingSidebar />
					{/* Next under Booking summary */}
					{showNextButton && (
						<button
							type='button'
							onClick={nextStep}
							disabled={!canNext}
							className={`
								w-full px-8 py-3 rounded-xl text-sm font-semibold transition-all
								${
									canNext
										? 'bg-gold-soft text-nearBlack hover:bg-gold-glow shadow-lg shadow-gold-soft/20'
										: 'bg-white/10 text-icyWhite/40 cursor-not-allowed'
								}
							`}
						>
							{stepLabels[step - 1]}
						</button>
					)}
				</aside>
			</div>
		</div>
	)
}

export default function BookingFlow(props: BookingFlowProps) {
	return (
		<BookingFlowProvider
			services={props.services}
			defaultDuration={props.defaultDuration}
			defaultService={props.services[0]?.title}
		>
			<BookingFlowInner {...props} />
		</BookingFlowProvider>
	)
}


export { BookingFlowProvider, useBookingFlow }
export type { BookingFlowState }
