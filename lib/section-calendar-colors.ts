/**
 * Tailwind class bundles for calendar / admin chips.
 * One color per price section (or per root-level zone when there is no section).
 * Fully opaque backgrounds/borders for admin timeslots.
 */
export const SECTION_CALENDAR_COLORS: string[] = [
	'bg-rose-500 border-rose-400',
	'bg-amber-500 border-amber-400',
	'bg-emerald-500 border-emerald-400',
	'bg-sky-500 border-sky-400',
	'bg-violet-500 border-violet-400',
	'bg-orange-500 border-orange-400',
	'bg-teal-500 border-teal-400',
	'bg-pink-400 border-pink-300',
	'bg-lime-500 border-lime-400',
	'bg-indigo-500 border-indigo-400',
	'bg-fuchsia-500 border-fuchsia-400',
	'bg-cyan-400 border-cyan-300',
]

/** Opaque neutral fill when no color is set (catalog + admin calendar fallbacks). */
export const DEFAULT_SECTION_CALENDAR_COLOR = 'bg-slate-600 border-slate-500'

/** Remove Tailwind opacity suffix from bg-* / border-* tokens (legacy data may still use /30). */
export function opaqueCalendarSlotClasses(classStr: string): string {
	return classStr
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((tok) => {
			if (tok.startsWith('bg-') || tok.startsWith('border-')) {
				if (tok.startsWith('bg-')) {
					// Fully transparent opacity → treat as no fill so fallback applies
					if (/\/0(?:\.0+)?$/.test(tok) || /\/\[0\]/.test(tok)) {
						return 'bg-transparent'
					}
				}
				return tok.replace(/\/(?:\d+|\[[^\]]+\])$/, '')
			}
			return tok
		})
		.join(' ')
}

const INVISIBLE_BG_TOKENS = new Set(['bg-transparent', 'bg-none'])

function slotHasVisibleBackground(opaqueClasses: string): boolean {
	const tokens = opaqueClasses.trim().split(/\s+/).filter(Boolean)
	if (tokens.some((t) => t.startsWith('bg-gradient-'))) return true
	const bg = tokens.find((t) => t.startsWith('bg-'))
	if (!bg) return false
	if (INVISIBLE_BG_TOKENS.has(bg)) return false
	const lower = bg.toLowerCase()
	if (lower.includes('transparent')) return false
	// Arbitrary colors that are fully transparent, e.g. bg-[rgba(0,0,0,0)]
	if (/rgba?\([^)]*,\s*0(?:\.0+)?\s*\)/.test(lower)) return false
	return true
}

/**
 * Ensures calendar blocks always get a non-transparent fill (empty, only borders, or bg-transparent → fallback).
 */
export function resolvedOpaqueCalendarSlotFill(
	classStr: string | undefined | null,
	fallback = DEFAULT_SECTION_CALENDAR_COLOR,
): string {
	const opaque = opaqueCalendarSlotClasses((classStr ?? '').trim())
	if (slotHasVisibleBackground(opaque)) return opaque
	return fallback
}

/** Pick the next color among siblings: prefer an unused preset, else rotate. */
export function pickNextCalendarColor(alreadyAssigned: string[]): string {
	const used = new Set(
		alreadyAssigned.filter(Boolean).map((c) => opaqueCalendarSlotClasses(c))
	)
	for (const c of SECTION_CALENDAR_COLORS) {
		if (!used.has(c)) return c
	}
	const i = alreadyAssigned.filter(Boolean).length
	return SECTION_CALENDAR_COLORS[i % SECTION_CALENDAR_COLORS.length]!
}
