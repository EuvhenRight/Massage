import type { Place } from '@/lib/places'
import { fieldBorderFocusGold, fieldBorderIdle } from '@/lib/unified-field-styles'

/** Accent tokens for booking UI — same gold palette for massage and depilation. */
export type BookingAccent = {
	pillActive: string
	sectionPillActive: string
	showMoreLink: string
	itemSelected: string
	priceText: string
	descLink: string
	navMonthFocus: string
	dayFocus: string
	daySelected: string
	dayAvailableHover: string
	dayToday: string
	btnPrimary: string
	btnPrimaryDesktop: string
	btnPrimaryMobile: string
	progressBar: string
	stepComplete: string
	stepCurrent: string
	stepConnector: string
	inputBorder: string
	inputFocus: string
	selectTriggerRing: string
	selectItemFocus: string
	timeSlotEmptyBorder: string
	timeSlotEmptyBg: string
	timeSlotEmptyText: string
	summaryBorder: string
	summaryBg: string
	summaryHeading: string
	successBtn: string
}

const BOOKING_ACCENT_GOLD: BookingAccent = {
	pillActive: 'bg-gold-soft text-nearBlack',
	sectionPillActive: 'bg-gold-soft text-nearBlack',
	showMoreLink:
		'text-gold-soft/90 hover:text-gold-soft text-xs font-medium mt-1.5 py-0.5 -ml-1 focus:outline-none focus:ring-2 focus:ring-gold-soft/40 focus:ring-offset-1 focus:ring-offset-transparent rounded',
	itemSelected: 'border-gold-soft/50 bg-gold-soft/10',
	priceText: 'text-gold-soft/90 text-sm shrink-0',
	descLink: 'text-gold-soft/80 text-xs hover:underline',
	navMonthFocus:
		'focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack',
	dayFocus:
		'focus:outline-none focus:ring-2 focus:ring-gold-soft/60 focus:ring-offset-2 focus:ring-offset-nearBlack',
	daySelected: 'bg-gold-soft text-nearBlack ring-1 ring-gold-soft',
	dayAvailableHover:
		'text-gold-soft/90 hover:bg-gold-soft/25 hover:text-gold-soft hover:ring-1 hover:ring-gold-soft/50',
	dayToday: 'ring-1 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow',
	btnPrimary:
		'bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.98] transition-all touch-manipulation',
	btnPrimaryDesktop:
		'bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.99]',
	btnPrimaryMobile:
		'bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.98]',
	progressBar: 'h-full bg-gold-soft rounded-full',
	stepComplete: 'bg-gold-soft/20 text-gold-soft border border-gold-soft/50',
	stepCurrent:
		'bg-gold-soft text-nearBlack border-2 border-gold-soft shadow-lg shadow-gold-soft/25',
	stepConnector: 'bg-gold-soft/40',
	inputBorder: fieldBorderIdle,
	inputFocus: fieldBorderFocusGold,
	selectTriggerRing: fieldBorderFocusGold,
	selectItemFocus: 'text-icyWhite focus:bg-gold-soft/20 focus:text-icyWhite',
	timeSlotEmptyBorder: 'border-gold-soft/20',
	timeSlotEmptyBg: 'bg-gold-soft/5',
	timeSlotEmptyText: 'text-gold-soft/90',
	summaryBorder: 'border-gold-soft/20',
	summaryBg: 'bg-gold-soft/5',
	summaryHeading: 'text-gold-soft/90',
	successBtn:
		'min-h-[48px] px-6 py-3 rounded-xl bg-gold-soft text-nearBlack text-sm font-semibold hover:bg-gold-glow active:scale-[0.98] transition-all touch-manipulation',
}

export function getBookingAccent(_place: Place): BookingAccent {
	void _place
	return BOOKING_ACCENT_GOLD
}
