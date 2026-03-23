import type { Place } from "@/lib/places";

/** Accent tokens for booking UI: gold (depilation) vs purple (massage). */
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
	searchFocus: string
	progressBar: string
	stepComplete: string
	stepCurrent: string
	stepConnector: string
	/** Default border on text fields and selects (includes `border` width). */
	inputBorder: string
	inputFocus: string
	/** Shared focus ring for SelectTrigger (service + time). */
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

export function getBookingAccent(place: Place): BookingAccent {
	if (place === "massage") {
		return {
			pillActive: "bg-purple-soft text-nearBlack",
			sectionPillActive: "bg-purple-soft text-nearBlack",
			showMoreLink:
				"text-purple-soft/90 hover:text-purple-soft text-xs font-medium mt-1.5 py-0.5 -ml-1 focus:outline-none focus:ring-2 focus:ring-purple-soft/40 focus:ring-offset-1 focus:ring-offset-transparent rounded",
			itemSelected: "border-purple-soft/50 bg-purple-soft/10",
			priceText: "text-purple-soft/90 text-sm shrink-0",
			descLink: "text-purple-soft/80 text-xs hover:underline",
			navMonthFocus:
				"focus:outline-none focus:ring-2 focus:ring-purple-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack",
			dayFocus:
				"focus:outline-none focus:ring-2 focus:ring-purple-soft/60 focus:ring-offset-2 focus:ring-offset-nearBlack",
			daySelected: "bg-purple-soft text-nearBlack ring-1 ring-purple-soft",
			dayAvailableHover:
				"text-purple-soft/90 hover:bg-purple-soft/25 hover:text-purple-soft hover:ring-1 hover:ring-purple-soft/50",
			dayToday: "ring-1 ring-purple-soft/70 bg-purple-soft/15 text-purple-glow",
			btnPrimary:
				"bg-purple-soft text-nearBlack hover:bg-purple-glow active:scale-[0.98] transition-all touch-manipulation",
			btnPrimaryDesktop:
				"bg-purple-soft text-nearBlack hover:bg-purple-glow active:scale-[0.99]",
			btnPrimaryMobile:
				"bg-purple-soft text-nearBlack hover:bg-purple-glow active:scale-[0.98]",
			searchFocus:
				"w-full pl-10 pr-3 py-2.5 sm:py-3 rounded-xl border border-purple-soft/40 bg-white/5 text-icyWhite placeholder:text-icyWhite/40 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-soft/40 focus:border-purple-soft/70 transition-shadow",
			progressBar: "h-full bg-purple-soft rounded-full",
			stepComplete:
				"bg-purple-soft/20 text-purple-soft border border-purple-soft/50",
			stepCurrent:
				"bg-purple-soft text-nearBlack border-2 border-purple-soft shadow-lg shadow-purple-soft/25",
			stepConnector: "bg-purple-soft/40",
			inputBorder: "border border-purple-soft/40",
			inputFocus:
				"focus:ring-purple-soft/30 focus:border-purple-soft/70 touch-manipulation",
			selectTriggerRing: "focus:ring-purple-soft/30 focus:border-purple-soft/70",
			selectItemFocus: "text-icyWhite focus:bg-purple-soft/20 focus:text-icyWhite",
			timeSlotEmptyBorder: "border-purple-soft/20",
			timeSlotEmptyBg: "bg-purple-soft/5",
			timeSlotEmptyText: "text-purple-soft/90",
			summaryBorder: "border-purple-soft/20",
			summaryBg: "bg-purple-soft/5",
			summaryHeading: "text-purple-soft/90",
			successBtn:
				"min-h-[48px] px-6 py-3 rounded-xl bg-purple-soft text-nearBlack text-sm font-semibold hover:bg-purple-glow active:scale-[0.98] transition-all touch-manipulation",
		}
	}
	return {
		pillActive: "bg-gold-soft text-nearBlack",
		sectionPillActive: "bg-gold-soft text-nearBlack",
		showMoreLink:
			"text-gold-soft/90 hover:text-gold-soft text-xs font-medium mt-1.5 py-0.5 -ml-1 focus:outline-none focus:ring-2 focus:ring-gold-soft/40 focus:ring-offset-1 focus:ring-offset-transparent rounded",
		itemSelected: "border-gold-soft/50 bg-gold-soft/10",
		priceText: "text-gold-soft/90 text-sm shrink-0",
		descLink: "text-gold-soft/80 text-xs hover:underline",
		navMonthFocus:
			"focus:outline-none focus:ring-2 focus:ring-gold-soft/50 focus:ring-offset-2 focus:ring-offset-nearBlack",
		dayFocus:
			"focus:outline-none focus:ring-2 focus:ring-gold-soft/60 focus:ring-offset-2 focus:ring-offset-nearBlack",
		daySelected: "bg-gold-soft text-nearBlack ring-1 ring-gold-soft",
		dayAvailableHover:
			"text-gold-soft/90 hover:bg-gold-soft/25 hover:text-gold-soft hover:ring-1 hover:ring-gold-soft/50",
		dayToday: "ring-1 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow",
		btnPrimary:
			"bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.98] transition-all touch-manipulation",
		btnPrimaryDesktop:
			"bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.99]",
		btnPrimaryMobile:
			"bg-gold-soft text-nearBlack hover:bg-gold-glow active:scale-[0.98]",
		searchFocus:
			"w-full pl-10 pr-3 py-2.5 sm:py-3 rounded-xl border border-white/10 bg-white/5 text-icyWhite placeholder:text-icyWhite/40 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold-soft/40 focus:border-gold-soft transition-shadow",
		progressBar: "h-full bg-gold-soft rounded-full",
		stepComplete:
			"bg-gold-soft/20 text-gold-soft border border-gold-soft/50",
		stepCurrent:
			"bg-gold-soft text-nearBlack border-2 border-gold-soft shadow-lg shadow-gold-soft/25",
		stepConnector: "bg-gold-soft/40",
		inputBorder: "border border-white/10",
		inputFocus: "focus:ring-gold-soft/30 touch-manipulation",
		selectTriggerRing: "focus:ring-gold-soft/30",
		selectItemFocus: "text-icyWhite focus:bg-gold-soft/20 focus:text-icyWhite",
		timeSlotEmptyBorder: "border-gold-soft/20",
		timeSlotEmptyBg: "bg-gold-soft/5",
		timeSlotEmptyText: "text-gold-soft/90",
		summaryBorder: "border-gold-soft/20",
		summaryBg: "bg-gold-soft/5",
		summaryHeading: "text-gold-soft/90",
		successBtn:
			"min-h-[48px] px-6 py-3 rounded-xl bg-gold-soft text-nearBlack text-sm font-semibold hover:bg-gold-glow active:scale-[0.98] transition-all touch-manipulation",
	}
}
