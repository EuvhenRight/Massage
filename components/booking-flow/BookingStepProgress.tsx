'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import type { BookingStep } from './BookingFlowContext'

interface BookingStepProgressProps {
	currentStep: BookingStep
}

export default function BookingStepProgress({ currentStep }: BookingStepProgressProps) {
	const t = useTranslations('booking')
	const STEPS: { step: BookingStep; labelKey: string }[] = [
		{ step: 1, labelKey: 'step1Label' },
		{ step: 2, labelKey: 'step2Label' },
		{ step: 3, labelKey: 'step3Label' },
	]
	const progressPercent = (currentStep / 3) * 100

	return (
		<nav className="shrink-0 border-b border-white/10 px-4 py-3 md:px-6" aria-label={t('bookingProgress')}>
			<div className="max-w-4xl mx-auto">
				<div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
					<motion.div
						className='h-full bg-gold-soft rounded-full'
						initial={false}
						animate={{ width: `${progressPercent}%` }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
					/>
				</div>
				<ol className="flex items-center justify-center gap-1 sm:gap-4 md:gap-6 py-3 overflow-x-auto">
					{STEPS.map(({ step, labelKey }, idx) => {
						const isComplete = currentStep > step
						const isCurrent = currentStep === step
						const isUpcoming = !isComplete && !isCurrent
						return (
							<li key={step} className='flex items-center shrink-0'>
								<div className='flex flex-col md:flex-row items-center gap-1 md:gap-2'>
									<span
										className={`
											flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200
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
									{isCurrent && (
										<span className='text-xs md:text-sm font-medium text-center md:text-left text-icyWhite'>
											{t(labelKey)}
										</span>
									)}
								</div>
								{idx < STEPS.length - 1 && (
									<span
										className={`mx-1 sm:mx-3 md:mx-4 h-0.5 w-4 sm:w-8 md:w-12 rounded-full flex-shrink-0 ${
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
