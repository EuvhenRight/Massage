'use client'

import { getBookingAccent } from '@/lib/booking-accent'
import type { Place } from '@/lib/places'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { TruncateText } from '@/components/ui/truncate-text'
import { useBookingFlow } from './BookingFlowContext'

function formatTime(time: string): string {
	const [h, m] = time.split(':').map(Number)
	if (h === 0) return `12:${String(m).padStart(2, '0')} am`
	if (h < 12) return `${h}:${String(m).padStart(2, '0')} am`
	if (h === 12) return `12:${String(m).padStart(2, '0')} pm`
	return `${h - 12}:${String(m).padStart(2, '0')} pm`
}

interface BookingSummaryMobileProps {
	place?: Place
}

/** Compact booking summary shown only on mobile at step 3 (confirm) — replaces sidebar */
export default function BookingSummaryMobile({ place = 'massage' }: BookingSummaryMobileProps) {
	const accent = useMemo(() => getBookingAccent(place), [place])
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
	} = useBookingFlow()

	if (!service && !date && !time) return null

	return (
		<motion.div
			initial={{ opacity: 0, y: -12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
			className={`rounded-xl border p-4 mb-6 ${accent.summaryBorder} ${accent.summaryBg}`}
			role="region"
			aria-label={t('bookingSummary')}
		>
			<h4 className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${accent.summaryHeading}`}>
				{t('bookingSummary')}
			</h4>
			<dl className="space-y-2.5 text-sm">
				{service && (
					<div className="flex items-center justify-between gap-3 min-w-0">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3.5rem]">{tCommon('services')}</dt>
						<dd className="flex-1 min-w-0 flex items-center justify-end gap-1">
							<TruncateText
								className="text-icyWhite font-medium text-right"
								tooltipThreshold={25}
							>
								{service}
							</TruncateText>
							{bookingGranularity === 'day' ? (
								<span className="text-icyWhite/50 text-xs shrink-0">
									(
									{bookingDayCount >= 2
										? t('fullDaysBookingCount', { count: bookingDayCount })
										: t('fullDayBooking')}
									)
								</span>
							) : (
								durationMinutes > 0 && (
									<span className="text-icyWhite/50 text-xs shrink-0 tabular-nums">
										({durationMinutes} min)
									</span>
								)
							)}
						</dd>
					</div>
				)}
				{date && (
					<div className="flex items-center justify-between gap-3">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3rem]">{tCommon('date')}</dt>
						<dd className="text-icyWhite font-medium">
							{date.toLocaleDateString(locale, {
								weekday: 'short',
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})}
						</dd>
					</div>
				)}
				{time && (
					<div className="flex items-center justify-between gap-3">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3rem]">{tCommon('time')}</dt>
						<dd className="text-icyWhite font-medium text-right">
							{formatTime(time)}
							{bookingGranularity === 'day' && (
								<span className="block text-xs text-icyWhite/55 font-normal mt-0.5">
									{t('fullDayBooking')}
								</span>
							)}
						</dd>
					</div>
				)}
			</dl>
		</motion.div>
	)
}
