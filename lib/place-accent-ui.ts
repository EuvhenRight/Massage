import type { Place } from "@/lib/places";

/**
 * Shared UI class bundles. Massage and depilation use the same studio palette (gold-soft / gold-glow);
 * `place` is kept for call-site compatibility and future per-context tweaks.
 */
export function getPlaceAccentUi(_place: Place) {
	void _place;
	return {
		navLinkActive:
			"bg-gold-soft/20 text-gold-glow border border-gold-soft/40",
		navLinkActiveMobile:
			"bg-gold-soft/20 text-gold-glow border border-gold-soft/60",
		backHover: "hover:text-gold-soft",
		publicBookingHover: "hover:text-gold-soft",
		mobileMenuBorder: "border-y border-gold-soft/40",
		infoHover: "hover:text-gold-soft/80 hover:bg-gold-soft/10",
		analyticsExportBtn:
			"border-gold-soft/50 bg-gold-soft/20 text-gold-glow hover:bg-gold-soft/30",
		fab: "border border-gold-glow bg-gold-soft text-nearBlack shadow-lg shadow-black/35 hover:brightness-110 focus:ring-2 focus:ring-gold-glow focus:ring-offset-2 focus:ring-offset-nearBlack",
		toolbarActive:
			"bg-gold-soft/25 border border-gold-soft/50 text-gold-glow",
		todayHeader: "bg-gold-soft/20 text-gold-glow",
		todayHeaderSub: "text-gold-soft/90",
		todayHeaderDay: "text-gold-glow",
		btnPrimarySm:
			"bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30",
		ringSelected:
			"ring-2 ring-gold-soft ring-offset-2 ring-offset-nearBlack",
		addServiceBorder: "hover:border-gold-soft/40",
		solidCta:
			"rounded-lg border border-gold-soft/50 bg-gold-soft/20 px-4 py-2 text-sm font-medium text-gold-soft hover:bg-gold-soft/30 transition-colors",
		navMenuCta:
			"inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-[0.2em] uppercase hover:bg-gold-soft/25 hover:shadow-glow transition-all duration-300",
		menuNumber: "text-gold-soft/30",
		menuTitle:
			"font-serif text-3xl sm:text-4xl md:text-3xl lg:text-4xl text-icyWhite/90 group-hover:text-gold-soft transition-colors duration-300 tracking-tight",
		menuArrow:
			"ml-auto text-gold-soft/0 group-hover:text-gold-soft/60 transition-colors duration-300",
		burgerBorder: "border-white/10 hover:border-gold-soft/30",
		langFocus: "focus:ring-gold-soft/50",
		langLoader: "text-gold-soft",
		priceCatalogCard:
			"mb-8 rounded-2xl border border-gold-soft/20 p-5 bg-white/[0.02]",
		priceCatalogLink: "text-gold-soft/80 hover:text-gold-soft text-xs",
		priceCatalogLinkSm: "text-gold-soft/80 hover:text-gold-soft text-sm",
		priceCatalogOutlineBtn:
			"px-4 py-2.5 rounded-lg border border-gold-soft/40 text-gold-soft text-sm hover:bg-gold-soft/10",
		priceCatalogSaveBtn:
			"px-5 py-2.5 rounded-lg bg-gold-soft text-nearBlack font-medium text-sm hover:bg-gold-glow disabled:opacity-50",
		priceCatalogPill: "bg-gold-soft/20 text-gold-soft",
		priceCatalogPillMuted: "bg-gold-soft/15 text-gold-soft",
		availabilityDayOpen:
			"bg-gold-soft/20 text-gold-glow border border-gold-soft/40 hover:bg-gold-soft/30",
		availabilityInfoHover: "hover:text-gold-soft/80",
		availabilityCallout:
			"mb-4 rounded-xl border border-gold-soft/20 bg-gold-soft/[0.06] px-4 py-3",
		availabilityCalloutIcon: "bg-gold-soft/25 text-gold-soft",
		availabilityLegendOpen: "border-gold-soft/40 bg-gold-soft/20",
		availabilitySaveBtn:
			"bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30",
		adminModalShell:
			"rounded-3xl border border-gold-soft/15 bg-nearBlack/95 shadow-xl shadow-gold-soft/10 backdrop-blur-md",
		adminDatePickerToday:
			"ring-2 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow",
		adminDatePickerSelected:
			"bg-gold-soft text-nearBlack ring-1 ring-gold-glow/60 font-semibold",
		adminDatePickerFooter: "text-gold-soft hover:text-gold-glow",
		adminMainContent:
			"relative z-10 px-4 sm:px-8 lg:px-12 py-8 sm:py-10 w-full min-w-0 min-h-[calc(100dvh-4rem)]",
		adminPanel: "rounded-3xl glass-card overflow-hidden shadow-xl",
		adminPanelInset: "rounded-2xl glass-card px-4 py-3",
		adminHeaderBar: "border-b border-gold-soft/15",
		adminNestedPanel: "overflow-hidden bg-nearBlack/20",
		adminCheckbox:
			"text-gold-soft focus-visible:ring-gold-soft/50 data-[state=checked]:bg-gold-soft/25 data-[state=checked]:border-gold-soft/50",
		calendarDropTarget: "bg-gold-soft/20 ring-1 ring-gold-soft/50",
		weekCalendarTodayCircle:
			"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums bg-gold-soft/35 text-gold-glow ring-1 ring-gold-soft/45 shadow-sm shadow-gold-soft/15 sm:h-9 sm:w-9 sm:text-sm",
	}
}
