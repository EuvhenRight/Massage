'use client'

import type { BookingStep } from './BookingFlowContext'

const STEPS: { step: BookingStep; label: string }[] = [
	{ step: 1, label: 'Service, date & time' },
	{ step: 2, label: 'Your details' },
]

interface BookingStepProgressProps {
	currentStep: BookingStep
}

export default function BookingStepProgress({
	currentStep,
}: BookingStepProgressProps) {
	return (
		<nav
			className='border-b border-white/10 bg-nearBlack/50 px-4 sm:px-6'
			aria-label='Booking progress'
		>
			<div className='max-w-4xl mx-auto'>
				<ol className='flex items-center justify-center gap-2 sm:gap-8 py-4 overflow-x-auto'>
					{STEPS.map(({ step, label }, idx) => {
						const isComplete = currentStep > step
						const isCurrent = currentStep === step
						const isUpcoming = !isComplete && !isCurrent
						return (
							<li key={step} className='flex items-center shrink-0'>
								<div className='flex items-center gap-2'>
									<span
										className={`
											flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200
											${isComplete ? 'bg-gold-soft/20 text-gold-soft border border-gold-soft/50' : ''}
											${isCurrent ? 'bg-gold-soft text-nearBlack border-2 border-gold-soft shadow-lg shadow-gold-soft/25' : ''}
											${isUpcoming ? 'border border-white/15 text-icyWhite/35 bg-white/[0.02]' : ''}
										`}
										aria-current={isCurrent ? 'step' : undefined}
									>
										{isComplete ? (
											<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
											</svg>
										) : (
											step
										)}
									</span>
									<span
										className={`
											hidden sm:inline text-sm font-medium
											${isCurrent ? 'text-icyWhite' : ''}
											${isComplete ? 'text-gold-soft/90' : ''}
											${isUpcoming ? 'text-icyWhite/40' : ''}
										`}
									>
										{label}
									</span>
								</div>
								{idx < STEPS.length - 1 && (
									<span
										className={`mx-2 sm:mx-4 h-0.5 w-6 sm:w-12 rounded-full flex-shrink-0 ${
											isComplete ? 'bg-gold-soft/40' : 'bg-white/10'
										}`}
										aria-hidden
									/>
								)}
							</li>
						)
					})}
				</ol>
			</div>
		</nav>
	)
}
