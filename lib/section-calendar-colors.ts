/**
 * Tailwind class bundles for calendar / admin chips (same palette as legacy service colors).
 * One color per price section (or per root-level zone when there is no section).
 */
export const SECTION_CALENDAR_COLORS: string[] = [
	'bg-amber-500/30 border-amber-500/60',
	'bg-rose-500/30 border-rose-500/60',
	'bg-orange-500/30 border-orange-500/60',
	'bg-violet-500/30 border-violet-500/60',
	'bg-emerald-500/30 border-emerald-500/60',
	'bg-pink-500/30 border-pink-500/60',
	'bg-cyan-500/30 border-cyan-500/60',
	'bg-teal-500/30 border-teal-500/60',
]

export const DEFAULT_SECTION_CALENDAR_COLOR =
	'bg-gray-500/30 border-gray-500/60'

/** Pick the next color among siblings: prefer an unused preset, else rotate. */
export function pickNextCalendarColor(alreadyAssigned: string[]): string {
	const used = new Set(alreadyAssigned.filter(Boolean))
	for (const c of SECTION_CALENDAR_COLORS) {
		if (!used.has(c)) return c
	}
	const i = alreadyAssigned.filter(Boolean).length
	return SECTION_CALENDAR_COLORS[i % SECTION_CALENDAR_COLORS.length]!
}
