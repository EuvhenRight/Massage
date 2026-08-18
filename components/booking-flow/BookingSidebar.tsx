'use client'

import { formatTimeFromSlotString } from '@/lib/format-date'
import { useLocale, useTranslations } from 'next-intl'
import { useBookingFlow } from './BookingFlowContext'
import { TruncateText } from '@/components/ui/truncate-text'
import { BookingCartList, BookingCartTotals } from './BookingCart'

const sectionLabelClass = 'text-[11px] font-medium text-icyWhite/50 uppercase tracking-wider block'

export default function BookingSidebar() {
	const locale = useLocale()
	const t = useTranslations('booking')
	const tCommon = useTranslations('common')
	const tPrice = useTranslations('price')
	const {
		items,
		removeItem,
		priceTotal,
		catalogSex,
		date,
		time,
		durationMinutes,
		bookingGranularity,
		bookingDayCount,
		fullName,
		email,
		phone,
		notifyByEmail,
		notifyByWhatsApp,
		step,
	} = useBookingFlow()

	const notifySummary =
		(notifyByEmail || notifyByWhatsApp) &&
		[
			notifyByEmail ? t('notifyShortEmail') : '',
			notifyByWhatsApp ? t('notifyShortWhatsApp') : '',
		]
			.filter(Boolean)
			.join(t('notifyShortJoin'))

	return (
		<div className="flex flex-col h-full p-5">
			<div className="mb-5">
				<h3 className="font-serif text-base font-semibold text-icyWhite">{t('bookingSummary')}</h3>
			</div>

			<div className="flex-1 min-h-0 space-y-5">
				{/* Services — the cart. Editable while the customer is still picking
				    (steps 1–2); locked to a read-only recap once they are entering
				    contact details, so a stray tap cannot silently change the price. */}
				<div className="min-w-0 space-y-1.5">
					<div className="flex items-baseline justify-between gap-2">
						<span className={sectionLabelClass}>{tCommon('services')}</span>
						{items.length > 1 && (
							<span className="text-[11px] text-icyWhite/40 tabular-nums">
								{t('cartServiceCount', { count: items.length })}
							</span>
						)}
					</div>
					<BookingCartList
						items={items}
						onRemove={step <= 2 ? removeItem : undefined}
					/>
					{items.length > 0 && (
						<BookingCartTotals
							items={items}
							durationMinutes={durationMinutes}
							priceTotal={priceTotal}
							className="pt-2.5 mt-2.5 border-t border-white/10"
						/>
					)}
					{bookingGranularity === 'tbd' && (
						<div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 space-y-1.5">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-icyWhite/40">
								{t('tbdSidebarMetaTitle')}
							</p>
							<p className="text-xs text-icyWhite/60">{t('scheduleTbdBookingBadge')}</p>
							<p className="text-sm text-icyWhite font-medium">
								{t('tbdYourSelectionDays', { count: bookingDayCount })}
							</p>
						</div>
					)}
					{catalogSex && (
						<div className="pt-2 space-y-1">
							<span className={sectionLabelClass}>{tPrice('sex')}</span>
							<p className="text-sm text-icyWhite font-medium">{tPrice(catalogSex)}</p>
						</div>
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
							{formatTimeFromSlotString(time, locale)}
						</p>
					) : (
						<p className="text-sm text-icyWhite/40">—</p>
					)}
				</div>

				{/* Your Details — customer's name, email, phone */}
				{(step === 3 || step === 4) && notifySummary && (
					<div className="pt-5 border-t border-white/10 space-y-1.5">
						<span className={sectionLabelClass}>{t('notifySummaryTitle')}</span>
						<p className="text-sm text-icyWhite/85">{notifySummary}</p>
					</div>
				)}

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
