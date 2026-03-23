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
		analyticsSearchFocus: m
			? "focus:ring-purple-soft/50 focus:border-purple-soft/50"
			: "focus:ring-gold-soft/50 focus:border-gold-soft/50",
		analyticsExportBtn: m
			? "border-purple-soft/50 bg-purple-soft/20 text-purple-glow hover:bg-purple-soft/30"
			: "border-gold-soft/50 bg-gold-soft/20 text-gold-glow hover:bg-gold-soft/30",
		fab: m
			? "bg-purple-soft/25 border border-purple-soft/50 text-purple-glow shadow-lg shadow-purple-soft/10 hover:bg-purple-soft/35 hover:shadow-purple-soft/20 focus:ring-purple-soft"
			: "bg-gold-soft/25 border border-gold-soft/50 text-gold-glow shadow-lg shadow-gold-soft/10 hover:bg-gold-soft/35 hover:shadow-gold-soft/20 focus:ring-gold-soft",
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
			? "font-serif text-3xl sm:text-4xl lg:text-5xl text-icyWhite/90 group-hover:text-purple-soft transition-colors duration-300 tracking-tight"
			: "font-serif text-3xl sm:text-4xl lg:text-5xl text-icyWhite/90 group-hover:text-gold-soft transition-colors duration-300 tracking-tight",
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
	}
}
