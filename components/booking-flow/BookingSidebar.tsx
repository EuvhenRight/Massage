'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useBookingFlow } from './BookingFlowContext'

function formatTime(time: string): string {
	const [h, m] = time.split(':').map(Number)
	if (h === 0) return `12:${String(m).padStart(2, '0')} am`
	if (h < 12) return `${h}:${String(m).padStart(2, '0')} am`
	if (h === 12) return `12:${String(m).padStart(2, '0')} pm`
	return `${h - 12}:${String(m).padStart(2, '0')} pm`
}

export default function BookingSidebar() {
	const locale = useLocale()
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const {
		service,
		date,
		time,
		durationMinutes,
		fullName,
		email,
		step,
		setStep,
	} = useBookingFlow()

	const hasAnySelection = service || date || time

	return (
		<div className='w-full'>
			<div className='rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] overflow-hidden'>
				<div className='px-5 py-4 border-b border-white/10'>
					<h3 className='font-serif text-base font-medium text-icyWhite'>
						{t('bookingSummary')}
					</h3>
					<p className='text-xs text-icyWhite/50 mt-0.5'>
						{hasAnySelection
							? t('reviewSelection')
							: t('choicesAppearHere')}
					</p>
				</div>
				<div className='p-5 space-y-4'>
					<div className='flex flex-col gap-1'>
						<span className='text-[11px] font-medium text-icyWhite/45 uppercase tracking-wider'>
							{tCommon('services')}
						</span>
						{service ? (
							<div className='flex items-center justify-between gap-2'>
								<span className='text-icyWhite text-sm font-medium'>
									{service}
								</span>
								{durationMinutes > 0 && (
									<span className='text-icyWhite/50 text-xs shrink-0'>
										{durationMinutes} min
									</span>
								)}
							</div>
						) : (
							<button
								type='button'
								onClick={() => setStep(1)}
								className='text-left text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								{t('chooseService')}
							</button>
						)}
					</div>

					<div className='flex flex-col gap-1'>
						<span className='text-[11px] font-medium text-icyWhite/45 uppercase tracking-wider'>
							{tCommon('date')}
						</span>
						{date ? (
							<span className='text-icyWhite text-sm'>
								{date.toLocaleDateString(locale, {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									year: 'numeric',
								})}
							</span>
						) : (
							<button
								type='button'
								onClick={() => setStep(1)}
								className='text-left text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								{t('selectDate')}
							</button>
						)}
					</div>

					<div className='flex flex-col gap-1'>
						<span className='text-[11px] font-medium text-icyWhite/45 uppercase tracking-wider'>
							{tCommon('time')}
						</span>
						{time ? (
							<span className='text-icyWhite text-sm'>{formatTime(time)}</span>
						) : date ? (
							<button
								type='button'
								onClick={() => setStep(1)}
								className='text-left text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								{t('selectTime')}
							</button>
						) : (
							<span className='text-icyWhite/40 text-sm'>—</span>
						)}
					</div>
				</div>

				{step === 2 && (fullName || email) && (
					<div className='px-5 py-4 border-t border-white/10 space-y-1'>
						<span className='text-[11px] font-medium text-icyWhite/45 uppercase tracking-wider'>
							{t('contact')}
						</span>
						{fullName && (
							<div className='text-icyWhite text-sm'>{fullName}</div>
						)}
						{email && <div className='text-icyWhite/60 text-sm'>{email}</div>}
					</div>
				)}
			</div>
		</div>
	)
}
