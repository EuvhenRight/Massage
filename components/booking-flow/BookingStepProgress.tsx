'use client'

import type { BookingStep } from './BookingFlowContext'

const STEPS: { step: BookingStep; label: string }[] = [
	{ step: 1, label: 'Choose your service' },
	{ step: 2, label: 'Date & Time' },
	{ step: 3, label: 'Your details' },
]

interface BookingStepProgressProps {
	currentStep: BookingStep
}

export default function BookingStepProgress({
	currentStep,
}: BookingStepProgressProps) {
	return (
		<nav
			className='sticky top-20 z-20 w-full border-b border-white/10 bg-nearBlack/95 backdrop-blur-md rounded-t-2xl'
			aria-label='Booking progress'
		>
			<ol className='flex items-center justify-center gap-2 sm:gap-4 px-4 py-3 overflow-x-auto'>
				{STEPS.map(({ step, label }, idx) => {
					const isComplete = currentStep > step
					const isCurrent = currentStep === step
					return (
						<li key={step} className='flex items-center shrink-0'>
							<div className='flex items-center gap-2'>
								<span
									className={`
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors
                    ${isComplete ? 'bg-gold-soft/25 text-gold-soft border border-gold-soft/50' : ''}
                    ${isCurrent ? 'bg-gold-soft text-nearBlack border-2 border-gold-soft' : ''}
                    ${!isComplete && !isCurrent ? 'border border-white/20 text-icyWhite/40' : ''}
                  `}
									aria-current={isCurrent ? 'step' : undefined}
								>
									{isComplete ? '✓' : step}
								</span>
								<span
									className={`
                    hidden sm:inline text-sm font-medium
                    ${isCurrent ? 'text-icyWhite' : ''}
                    ${isComplete ? 'text-gold-soft/90' : ''}
                    ${!isComplete && !isCurrent ? 'text-icyWhite/40' : ''}
                  `}
								>
									{label}
								</span>
							</div>
							{idx < STEPS.length - 1 && (
								<span
									className={`mx-2 sm:mx-3 h-px w-4 sm:w-6 flex-shrink-0 ${
										isComplete ? 'bg-gold-soft/30' : 'bg-white/10'
									}`}
									aria-hidden
								/>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}
