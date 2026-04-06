import type { Place } from "@/lib/places";

/**
 * Shared UI class bundles: massage → purple, depilation → yellow (gold-soft / gold-glow).
 */
export function getPlaceAccentUi(place: Place) {
	const m = place === "massage";
	return {
		navLinkActive: m
			? "bg-purple-soft/20 text-purple-glow border border-purple-soft/40"
			: "bg-gold-soft/20 text-gold-glow border border-gold-soft/40",
		navLinkActiveMobile: m
			? "bg-purple-soft/20 text-purple-glow border border-purple-soft/60"
			: "bg-gold-soft/20 text-gold-glow border border-gold-soft/60",
		backHover: m ? "hover:text-purple-soft" : "hover:text-gold-soft",
		publicBookingHover: m ? "hover:text-purple-soft" : "hover:text-gold-soft",
		mobileMenuBorder: m ? "border-y border-purple-soft/40" : "border-y border-gold-soft/40",
		infoHover: m
			? "hover:text-purple-soft/80 hover:bg-purple-soft/10"
			: "hover:text-gold-soft/80 hover:bg-gold-soft/10",
		analyticsExportBtn: m
			? "border-purple-soft/50 bg-purple-soft/20 text-purple-glow hover:bg-purple-soft/30"
			: "border-gold-soft/50 bg-gold-soft/20 text-gold-glow hover:bg-gold-soft/30",
		fab: m
			? "border border-purple-glow bg-purple-soft text-icyWhite shadow-lg shadow-black/35 hover:brightness-110 focus:ring-2 focus:ring-purple-glow focus:ring-offset-2 focus:ring-offset-nearBlack"
			: "border border-gold-glow bg-gold-soft text-nearBlack shadow-lg shadow-black/35 hover:brightness-110 focus:ring-2 focus:ring-gold-glow focus:ring-offset-2 focus:ring-offset-nearBlack",
		toolbarActive: m
			? "bg-purple-soft/25 border border-purple-soft/50 text-purple-glow"
			: "bg-gold-soft/25 border border-gold-soft/50 text-gold-glow",
		todayHeader: m
			? "bg-purple-soft/20 text-purple-glow"
			: "bg-gold-soft/20 text-gold-glow",
		todayHeaderSub: m ? "text-purple-soft/90" : "text-gold-soft/90",
		todayHeaderDay: m ? "text-purple-glow" : "text-gold-glow",
		btnPrimarySm: m
			? "bg-purple-soft/20 text-purple-soft hover:bg-purple-soft/30"
			: "bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30",
		ringSelected: m
			? "ring-2 ring-purple-soft ring-offset-2 ring-offset-nearBlack"
			: "ring-2 ring-gold-soft ring-offset-2 ring-offset-nearBlack",
		addServiceBorder: m
			? "hover:border-purple-soft/40"
			: "hover:border-gold-soft/40",
		solidCta: m
			? "rounded-lg border border-purple-soft/50 bg-purple-soft/20 px-4 py-2 text-sm font-medium text-purple-soft hover:bg-purple-soft/30 transition-colors"
			: "rounded-lg border border-gold-soft/50 bg-gold-soft/20 px-4 py-2 text-sm font-medium text-gold-soft hover:bg-gold-soft/30 transition-colors",
		navMenuCta: m
			? "inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-purple-soft/15 border border-purple-soft/40 text-purple-soft font-medium text-sm tracking-[0.2em] uppercase hover:bg-purple-soft/25 hover:shadow-glow-purple transition-all duration-300"
			: "inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gold-soft/15 border border-gold-soft/40 text-gold-soft font-medium text-sm tracking-[0.2em] uppercase hover:bg-gold-soft/25 hover:shadow-glow transition-all duration-300",
		menuNumber: m ? "text-purple-soft/30" : "text-gold-soft/30",
		menuTitle: m
			? "font-serif text-3xl sm:text-4xl md:text-3xl lg:text-4xl text-icyWhite/90 group-hover:text-purple-soft transition-colors duration-300 tracking-tight"
			: "font-serif text-3xl sm:text-4xl md:text-3xl lg:text-4xl text-icyWhite/90 group-hover:text-gold-soft transition-colors duration-300 tracking-tight",
		menuArrow: m
			? "ml-auto text-purple-soft/0 group-hover:text-purple-soft/60 transition-colors duration-300"
			: "ml-auto text-gold-soft/0 group-hover:text-gold-soft/60 transition-colors duration-300",
		burgerBorder: m
			? "border-white/10 hover:border-purple-soft/30"
			: "border-white/10 hover:border-gold-soft/30",
		langFocus: m
			? "focus:ring-purple-soft/50"
			: "focus:ring-gold-soft/50",
		langLoader: m ? "text-purple-soft" : "text-gold-soft",
		priceCatalogCard: m
			? "mb-8 rounded-2xl border border-purple-soft/20 p-5 bg-white/[0.02]"
			: "mb-8 rounded-2xl border border-gold-soft/20 p-5 bg-white/[0.02]",
		priceCatalogLink: m
			? "text-purple-soft/80 hover:text-purple-soft text-xs"
			: "text-gold-soft/80 hover:text-gold-soft text-xs",
		priceCatalogLinkSm: m
			? "text-purple-soft/80 hover:text-purple-soft text-sm"
			: "text-gold-soft/80 hover:text-gold-soft text-sm",
		priceCatalogOutlineBtn: m
			? "px-4 py-2.5 rounded-lg border border-purple-soft/40 text-purple-soft text-sm hover:bg-purple-soft/10"
			: "px-4 py-2.5 rounded-lg border border-gold-soft/40 text-gold-soft text-sm hover:bg-gold-soft/10",
		priceCatalogSaveBtn: m
			? "px-5 py-2.5 rounded-lg bg-purple-soft text-nearBlack font-medium text-sm hover:bg-purple-glow disabled:opacity-50"
			: "px-5 py-2.5 rounded-lg bg-gold-soft text-nearBlack font-medium text-sm hover:bg-gold-glow disabled:opacity-50",
		priceCatalogPill: m
			? "bg-purple-soft/20 text-purple-soft"
			: "bg-gold-soft/20 text-gold-soft",
		priceCatalogPillMuted: m
			? "bg-purple-soft/15 text-purple-soft"
			: "bg-gold-soft/15 text-gold-soft",
		/** Working-hours calendar: “open” day cells */
		availabilityDayOpen: m
			? "bg-purple-soft/20 text-purple-glow border border-purple-soft/40 hover:bg-purple-soft/30"
			: "bg-gold-soft/20 text-gold-glow border border-gold-soft/40 hover:bg-gold-soft/30",
		availabilityInfoHover: m
			? "hover:text-purple-soft/80"
			: "hover:text-gold-soft/80",
		availabilityCallout: m
			? "mb-4 rounded-xl border border-purple-soft/20 bg-purple-soft/5 px-4 py-3"
			: "mb-4 rounded-xl border border-gold-soft/20 bg-gold-soft/[0.06] px-4 py-3",
		availabilityCalloutIcon: m
			? "bg-purple-soft/20 text-purple-soft"
			: "bg-gold-soft/25 text-gold-soft",
		availabilityLegendOpen: m
			? "border-purple-soft/40 bg-purple-soft/20"
			: "border-gold-soft/40 bg-gold-soft/20",
		availabilitySaveBtn: m
			? "bg-purple-soft/20 text-purple-soft hover:bg-purple-soft/30"
			: "bg-gold-soft/20 text-gold-soft hover:bg-gold-soft/30",
		/** Add/edit appointment modal shell */
		adminModalShell: m
			? "rounded-2xl border border-white/10 bg-nearBlack shadow-xl"
			: "rounded-3xl border border-gold-soft/15 bg-nearBlack/95 shadow-xl shadow-gold-soft/10 backdrop-blur-md",
		adminDatePickerToday: m
			? "ring-2 ring-purple-soft/70 bg-purple-soft/15 text-purple-glow"
			: "ring-2 ring-gold-soft/70 bg-gold-soft/15 text-gold-glow",
		adminDatePickerSelected: m
			? "bg-sky-500/80 text-white ring-1 ring-sky-400/60"
			: "bg-gold-soft text-nearBlack ring-1 ring-gold-glow/60 font-semibold",
		adminDatePickerFooter: m
			? "text-sky-400/90 hover:text-sky-300"
			: "text-gold-soft hover:text-gold-glow",
		/** Depilation admin: full-page content shell (massage keeps compact rail) */
		adminMainContent: m
			? "px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto w-full min-w-0"
			: "relative z-10 px-4 sm:px-8 lg:px-12 py-8 sm:py-10 w-full min-w-0 min-h-[calc(100dvh-4rem)]",
		adminPanel: m
			? "rounded-2xl border border-white/10 overflow-hidden shadow-xl"
			: "rounded-3xl glass-card overflow-hidden shadow-xl",
		adminPanelInset: m
			? "rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
			: "rounded-2xl glass-card px-4 py-3",
		adminHeaderBar: m ? "border-b border-white/10" : "border-b border-gold-soft/15",
		/** Inside adminPanel: avoid double border on depilation (glass parent) */
		adminNestedPanel: m
			? "rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden"
			: "overflow-hidden bg-nearBlack/20",
		/** Admin weekday toggles — Checkbox overrides (base ui/checkbox is purple) */
		adminCheckbox: m
			? ""
			: "text-gold-soft focus-visible:ring-gold-soft/50 data-[state=checked]:bg-gold-soft/25 data-[state=checked]:border-gold-soft/50",
		/** Calendar cell while dragging over a valid drop target */
		calendarDropTarget: m
			? "bg-purple-soft/20 ring-1 ring-purple-soft/50"
			: "bg-gold-soft/20 ring-1 ring-gold-soft/50",
		/** Week view: circular “today” date (Google Calendar–style header) */
		weekCalendarTodayCircle: m
			? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums bg-purple-soft/35 text-purple-glow ring-1 ring-purple-soft/45 shadow-sm shadow-purple-soft/20 sm:h-9 sm:w-9 sm:text-sm"
			: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums bg-gold-soft/35 text-gold-glow ring-1 ring-gold-soft/45 shadow-sm shadow-gold-soft/15 sm:h-9 sm:w-9 sm:text-sm",
	}
}
