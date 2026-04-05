'use client'

import { formatTimeFromSlotString } from '@/lib/format-date'
import { getBookingAccent } from '@/lib/booking-accent'
import type { Place } from '@/lib/places'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useBookingFlow } from './BookingFlowContext'
import BookingServiceTitleDisplay from './BookingServiceTitleDisplay'

interface BookingSummaryMobileProps {
	place?: Place
}

/** Compact booking summary shown only on mobile at step 3 (confirm) — replaces sidebar */
export default function BookingSummaryMobile({ place = 'massage' }: BookingSummaryMobileProps) {
	const accent = useMemo(() => getBookingAccent(place), [place])
	const locale = useLocale()
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const tPrice = useTranslations('price')
	const {
		service,
		catalogSex,
		date,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
	} = useBookingFlow()

	if (!service && !date && !(time || bookingGranularity === 'tbd')) return null

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
					<div className="flex items-start justify-between gap-3 min-w-0">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3.5rem] pt-0.5">
							{tCommon('services')}
						</dt>
						<dd className="flex-1 min-w-0 flex flex-col items-end gap-1">
							<BookingServiceTitleDisplay service={service} variant="mobile" />
							{catalogSex && (
								<span className="text-icyWhite/60 text-xs text-right">
									{tPrice('sex')}: {tPrice(catalogSex)}
								</span>
							)}
							{bookingGranularity !== 'tbd' && durationMinutes > 0 && (
								<span className="text-icyWhite/50 text-xs shrink-0 tabular-nums">
									{durationMinutes} min
								</span>
							)}
						</dd>
					</div>
				)}
				{bookingGranularity === 'tbd' && (
					<div className="flex items-start justify-between gap-3 min-w-0">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3.5rem]">{t('tbdSidebarMetaTitle')}</dt>
						<dd className="text-icyWhite/85 text-sm text-right space-y-0.5">
							<p className="text-icyWhite/60 text-xs">{t('scheduleTbdBookingBadge')}</p>
							<p className="text-icyWhite font-medium">
								{t('tbdYourSelectionDays', { count: bookingDayCount })}
							</p>
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
				{bookingGranularity === 'tbd' && (
					<div className="flex items-center justify-between gap-3">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3rem]">{tCommon('time')}</dt>
						<dd className="text-icyWhite font-medium text-right">
							{t('sidebarScheduleTbdTime')}
						</dd>
					</div>
				)}
				{bookingGranularity !== 'tbd' && time && (
					<div className="flex items-center justify-between gap-3">
						<dt className="text-icyWhite/50 shrink-0 min-w-[3rem]">{tCommon('time')}</dt>
						<dd className="text-icyWhite font-medium text-right">
							{formatTimeFromSlotString(time, locale)}
						</dd>
					</div>
				)}
			</dl>
		</motion.div>
	)
}
