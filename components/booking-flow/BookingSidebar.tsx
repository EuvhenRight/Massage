'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useBookingFlow } from './BookingFlowContext'
import { TruncateText } from '@/components/ui/truncate-text'

function formatTime(time: string): string {
	const [h, m] = time.split(':').map(Number)
	if (h === 0) return `12:${String(m).padStart(2, '0')} am`
	if (h < 12) return `${h}:${String(m).padStart(2, '0')} am`
	if (h === 12) return `12:${String(m).padStart(2, '0')} pm`
	return `${h - 12}:${String(m).padStart(2, '0')} pm`
}

const sectionLabelClass = 'text-[11px] font-medium text-icyWhite/50 uppercase tracking-wider block'

export default function BookingSidebar() {
	const locale = useLocale()
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const {
		service,
		date,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		scheduleTbdCustomerMessage,
		fullName,
		email,
		phone,
		step,
	} = useBookingFlow()

	return (
		<div className="flex flex-col h-full p-5">
			<div className="mb-5">
				<h3 className="font-serif text-base font-semibold text-icyWhite">{t('bookingSummary')}</h3>
			</div>

			<div className="flex-1 min-h-0 space-y-5">
				{/* Services */}
				<div className="min-w-0 space-y-1.5">
					<span className={sectionLabelClass}>{tCommon('services')}</span>
					{service ? (
						<div className="flex items-center justify-between gap-2 min-w-0">
							<TruncateText className="text-sm text-icyWhite font-medium" tooltipThreshold={25}>
								{service}
							</TruncateText>
							{bookingGranularity === 'day' ? (
								<span className="text-xs text-icyWhite/50 shrink-0">
									{bookingDayCount >= 2
										? t('fullDaysBookingCount', { count: bookingDayCount })
										: t('fullDayBooking')}
								</span>
							) : bookingGranularity === 'tbd' ? (
								<span className="text-xs text-icyWhite/50 shrink-0">
									{t('scheduleTbdBookingBadge')}
								</span>
							) : (
								durationMinutes > 0 && (
									<span className="text-xs text-icyWhite/50 shrink-0">{durationMinutes} min</span>
								)
							)}
						</div>
					) : (
						<p className="text-sm text-icyWhite/40">—</p>
					)}
				</div>

				{/* Date */}
				<div className="space-y-1.5">
					<span className={sectionLabelClass}>{tCommon('date')}</span>
					{bookingGranularity === 'tbd' ? (
						<p className="text-sm text-icyWhite/75">{t('sidebarScheduleTbdDate')}</p>
					) : date ? (
						<p className="text-sm text-icyWhite">
							{date.toLocaleDateString(locale, {
								weekday: 'short',
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</p>
					) : (
						<p className="text-sm text-icyWhite/40">—</p>
					)}
				</div>

				{/* Time */}
				<div className="space-y-1.5">
					<span className={sectionLabelClass}>{tCommon('time')}</span>
					{bookingGranularity === 'tbd' ? (
						<p className="text-sm text-icyWhite/75">{t('sidebarScheduleTbdTime')}</p>
					) : time ? (
						<p className="text-sm text-icyWhite">
							{formatTime(time)}
							{bookingGranularity === 'day' && (
								<span className="block text-xs text-icyWhite/55 mt-0.5">
									{t('fullDayBooking')}
								</span>
							)}
						</p>
					) : (
						<p className="text-sm text-icyWhite/40">—</p>
					)}
				</div>

				{bookingGranularity === 'tbd' && scheduleTbdCustomerMessage.trim() && (
					<div className="space-y-1.5 pt-1">
						<span className={sectionLabelClass}>{t('scheduleTbdCustomerHeading')}</span>
						<p className="text-xs text-icyWhite/70 whitespace-pre-wrap line-clamp-6">
							{scheduleTbdCustomerMessage}
						</p>
					</div>
				)}

				{/* Your Details — customer's name, email, phone */}
				{((step === 3 || step === 4) && (fullName || email || phone)) && (
					<div className="pt-5 border-t border-white/10 min-w-0 space-y-2">
						<span className={sectionLabelClass}>{t('yourDetails')}</span>
						<dl className="space-y-2 min-w-0">
							{fullName && (
								<div>
									<dt className="text-[11px] text-icyWhite/40 uppercase tracking-wider">{t('fullName').replace(' *', '')}</dt>
									<dd className="text-sm text-icyWhite font-medium mt-0.5 min-w-0">
										<TruncateText tooltipThreshold={25}>{fullName}</TruncateText>
									</dd>
								</div>
							)}
							{email && (
								<div>
									<dt className="text-[11px] text-icyWhite/40 uppercase tracking-wider">{t('email').replace(' *', '')}</dt>
									<dd className="text-sm text-icyWhite/90 mt-0.5 min-w-0 break-all">
										<TruncateText tooltipThreshold={30}>{email}</TruncateText>
									</dd>
								</div>
							)}
							{phone && (
								<div>
									<dt className="text-[11px] text-icyWhite/40 uppercase tracking-wider">{t('phone').replace(' *', '')}</dt>
									<dd className="text-sm text-icyWhite/90 mt-0.5 min-w-0">
										<TruncateText tooltipThreshold={20}>{phone}</TruncateText>
									</dd>
								</div>
							)}
						</dl>
					</div>
				)}
			</div>

		</div>
	)
}
