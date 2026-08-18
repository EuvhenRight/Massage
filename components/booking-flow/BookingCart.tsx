'use client'

import { useLocale, useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import type { BookingItem, CartPriceTotal } from '@/lib/booking-items'
import BookingServiceTitleDisplay from './BookingServiceTitleDisplay'

/** "75" → "1 h 15 min"; under an hour stays "45 min". */
export function useDurationLabel() {
	const t = useTranslations('booking')
	const tPrice = useTranslations('price')
	return (totalMinutes: number): string => {
		const total = Math.max(0, Math.round(totalMinutes))
		const h = Math.floor(total / 60)
		const m = total % 60
		if (h === 0) return `${m} ${tPrice('min')}`
		if (m === 0) return `${h} ${t('hoursShort')}`
		return `${h} ${t('hoursShort')} ${m} ${tPrice('min')}`
	}
}

/** Formats the running total, marking it a lower bound when any line is "from X" or unpriced. */
export function useCartPriceLabel() {
	const t = useTranslations('booking')
	const locale = useLocale()
	return (total: CartPriceTotal): string | null => {
		if (!total.hasAnyPrice) return null
		const amount = new Intl.NumberFormat(locale, {
			maximumFractionDigits: 2,
		}).format(total.total)
		return total.approximate
			? t('cartTotalFrom', { amount: `${amount} €` })
			: `${amount} €`
	}
}

interface BookingCartListProps {
	items: BookingItem[]
	/** Omit to render read-only (confirmation screens). */
	onRemove?: (key: string) => void
	className?: string
}

/** The cart itself: one row per booked service, each removable. */
export function BookingCartList({
	items,
	onRemove,
	className = '',
}: BookingCartListProps) {
	const t = useTranslations('booking')
	const durationLabel = useDurationLabel()

	if (items.length === 0) {
		return <p className='text-sm text-icyWhite/40'>—</p>
	}

	return (
		<ul className={`space-y-2 min-w-0 ${className}`}>
			{items.map((item, index) => (
				<li
					key={item.key}
					className='flex items-start gap-2 min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5'
				>
					<span className='text-[11px] font-semibold text-icyWhite/35 tabular-nums pt-0.5 shrink-0 w-4'>
						{index + 1}
					</span>
					<div className='flex-1 min-w-0 space-y-1'>
						<BookingServiceTitleDisplay
							service={item.title}
							variant='sidebar'
							className='min-w-0'
						/>
						<div className='flex items-center gap-2 text-xs text-icyWhite/50'>
							{item.granularity === 'time' && (
								<span className='tabular-nums'>
									{durationLabel(item.durationMinutes)}
								</span>
							)}
							{item.price != null && (
								<span className='tabular-nums'>{item.price} €</span>
							)}
						</div>
					</div>
					{onRemove && (
						<button
							type='button'
							onClick={() => onRemove(item.key)}
							aria-label={t('cartRemoveItem', { service: item.title })}
							className='shrink-0 -mr-1 -mt-1 p-2 rounded-lg text-icyWhite/40 hover:text-icyWhite hover:bg-white/10 active:bg-white/15 transition-colors touch-manipulation'
						>
							<X className='size-4' aria-hidden />
						</button>
					)}
				</li>
			))}
		</ul>
	)
}

interface BookingCartTotalsProps {
	items: BookingItem[]
	durationMinutes: number
	priceTotal: CartPriceTotal
	className?: string
}

/** "3 services · 1 h 45 min · 78 €" summary line. */
export function BookingCartTotals({
	items,
	durationMinutes,
	priceTotal,
	className = '',
}: BookingCartTotalsProps) {
	const t = useTranslations('booking')
	const durationLabel = useDurationLabel()
	const priceLabel = useCartPriceLabel()

	if (items.length === 0) return null
	const isTbd = items[0]?.granularity === 'tbd'
	const price = priceLabel(priceTotal)

	return (
		<div
			className={`flex items-baseline justify-between gap-3 min-w-0 ${className}`}
		>
			<span className='text-[11px] font-medium text-icyWhite/50 uppercase tracking-wider'>
				{t('cartTotalLabel')}
			</span>
			<span className='text-sm text-icyWhite font-semibold text-right tabular-nums'>
				{!isTbd && durationLabel(durationMinutes)}
				{!isTbd && price && <span className='text-icyWhite/45'> · </span>}
				{price}
			</span>
		</div>
	)
}

/** One-line cart digest for tight spots (mobile sticky bar, step-1 header). */
export function BookingCartSummaryLine({
	items,
	durationMinutes,
}: {
	items: BookingItem[]
	durationMinutes: number
}) {
	const t = useTranslations('booking')
	const durationLabel = useDurationLabel()
	if (items.length === 0) return null
	const isTbd = items[0]?.granularity === 'tbd'
	return (
		<span className='truncate'>
			{t('cartServiceCount', { count: items.length })}
			{!isTbd && (
				<>
					<span className='text-icyWhite/40'> · </span>
					<span className='tabular-nums'>{durationLabel(durationMinutes)}</span>
				</>
			)}
		</span>
	)
}
