'use client'

import { bookAppointment } from '@/lib/book-appointment'
import type { BookingFormData } from '@/lib/booking-schema'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
	BookingFlowProvider,
	useBookingFlow,
	type BookingFlowState,
} from './BookingFlowContext'
import BookingSidebar from './BookingSidebar'
import BookingStepProgress from './BookingStepProgress'
import StepCustomerInfo from './StepCustomerInfo'
import StepDateTime from './StepDateTime'
import StepService from './StepService'

export interface BookingFlowProps {
	services: { title: string }[]
	defaultDuration?: number
	onSuccess?: () => void
}

function BookingFlowInner({
	services,
	defaultDuration = 60,
	onSuccess,
}: BookingFlowProps) {
	const { step, service, date, time, durationMinutes, nextStep, prevStep } =
		useBookingFlow()
	const [isSubmitting, setIsSubmitting] = useState(false)

	const canNext =
		(step === 1 && service) || (step === 2 && date && time) || step === 3

	const handleConfirm = useCallback(
		async (formData: BookingFormData) => {
			if (!date || !time) return
			setIsSubmitting(true)
			try {
				const dateStr = date.toISOString().slice(0, 10)
				await bookAppointment({
					date: dateStr,
					startTime: time,
					durationMinutes,
					service: (service || formData.service || services[0]?.title) ?? '',
					fullName: formData.fullName,
					email: formData.email,
					phone: formData.phone,
				})

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
		[date, time, durationMinutes, service, services, onSuccess],
	)

	const stepLabels = ['Next', 'Next', 'Confirm']
	const showNextButton = step < 3

	return (
		<div className='flex flex-col md:max-h-[calc(100vh-5.5rem)]'>
			<BookingStepProgress currentStep={step} />

			<div className='flex flex-1 flex-col md:flex-row gap-4 md:gap-4 p-4 sm:p-5 md:min-h-0 md:overflow-auto'>
				<main className='flex-1 min-w-0 space-y-4'>
					{step > 1 && (
						<button
							type='button'
							onClick={prevStep}
							className='flex items-center gap-1.5 text-icyWhite/60 hover:text-icyWhite text-sm transition-colors -mb-1'
						>
							<svg
								className='w-4 h-4'
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
							Back
						</button>
					)}

					{step === 1 && <StepService services={services} />}
					{step === 2 && <StepDateTime durationMinutes={durationMinutes} />}
					{step === 3 && (
						<StepCustomerInfo
							onSubmit={handleConfirm}
							isSubmitting={isSubmitting}
						/>
					)}

					{showNextButton && (
						<button
							type='button'
							onClick={nextStep}
							disabled={!canNext}
							className={`
                w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-medium transition-all mb-4
                ${
									canNext
										? 'bg-gold-soft/20 border border-gold-soft/50 text-gold-soft hover:bg-gold-soft/30'
										: 'bg-white/5 border border-white/10 text-icyWhite/40 cursor-not-allowed'
								}
              `}
						>
							{stepLabels[step - 1]}
						</button>
					)}
				</main>

				<BookingSidebar />
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
