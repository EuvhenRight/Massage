'use client'

import { useBookingFlow } from './BookingFlowContext'

function formatTime(time: string): string {
	const [h, m] = time.split(':').map(Number)
	if (h === 0) return `12:${String(m).padStart(2, '0')} am`
	if (h < 12) return `${h}:${String(m).padStart(2, '0')} am`
	if (h === 12) return `12:${String(m).padStart(2, '0')} pm`
	return `${h - 12}:${String(m).padStart(2, '0')} pm`
}

export default function BookingSidebar() {
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

	return (
		<aside className='sticky top-[68px] z-10 w-full md:w-64 lg:w-56 shrink-0 md:self-start'>
			<div className='rounded-xl border border-white/10 bg-nearBlack/70 p-4'>
				<h3 className='font-serif text-lg text-icyWhite mb-4'>
					Appointment details
				</h3>

				<div className='space-y-3'>
					<div>
						<div className='text-[10px] text-icyWhite/45 uppercase tracking-wider mb-1'>
							Service
						</div>
						{service ? (
							<div className='text-icyWhite text-sm'>{service}</div>
						) : (
							<button
								type='button'
								onClick={() => setStep(1)}
								className='text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								Choose service →
							</button>
						)}
					</div>

					<div>
						<div className='text-[10px] text-icyWhite/45 uppercase tracking-wider mb-1'>
							Date
						</div>
						{date ? (
							<div className='text-icyWhite text-sm'>
								{date.toLocaleDateString('en-US', {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									year: 'numeric',
								})}
							</div>
						) : (
							<button
								type='button'
								onClick={() => setStep(2)}
								className='text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								Select date →
							</button>
						)}
					</div>

					<div>
						<div className='text-[10px] text-icyWhite/45 uppercase tracking-wider mb-1'>
							Time
						</div>
						{time ? (
							<div className='text-icyWhite text-sm'>
								{formatTime(time)}
								{durationMinutes > 0 && (
									<span className='text-icyWhite/55 ml-1'>
										({durationMinutes} min)
									</span>
								)}
							</div>
						) : date ? (
							<button
								type='button'
								onClick={() => setStep(2)}
								className='text-gold-soft/80 hover:text-gold-soft text-sm transition-colors'
							>
								Select time →
							</button>
						) : (
							<span className='text-icyWhite/40 text-sm'>—</span>
						)}
					</div>
				</div>

				{step === 3 && (fullName || email) && (
					<div className='pt-3 mt-3 border-t border-white/10 space-y-1'>
						<div className='text-[10px] text-icyWhite/45 uppercase tracking-wider'>
							Contact
						</div>
						{fullName && (
							<div className='text-icyWhite text-sm'>{fullName}</div>
						)}
						{email && <div className='text-icyWhite/70 text-sm'>{email}</div>}
					</div>
				)}
			</div>
		</aside>
	)
}
