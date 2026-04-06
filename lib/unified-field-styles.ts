import { cn } from "@/lib/utils"

/**
 * Shared “contact form” field look: charcoal panel, subtle idle edge, full gold border on focus.
 * Use everywhere (marketing, booking, admin) for consistent inputs/textareas.
 */

export const focusRingKill =
  "outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:shadow-none focus-visible:ring-0 focus-visible:shadow-none ring-offset-0"

/** Idle border/bg only — info cards, select shells, TBD recap boxes */
export const fieldBorderIdle =
  "rounded-xl border-2 border-white/10 bg-white/[0.04]"

/** Gold focus on all four sides (border-based, no box-shadow ring) */
export const fieldBorderFocusGold = cn(
  focusRingKill,
  "focus:border-solid focus:border-gold-soft focus-visible:border-gold-soft",
)

export const fieldText = "text-sm text-icyWhite placeholder:text-icyWhite/25"

/** Hook for `app/globals.css` — guarantees gold focus border if Tailwind merge drops utilities */
export const FIELD_ANCHOR_CLASS = "u-field"

/** Standard `<Input />` / single-line fields */
export const unifiedInputClasses = cn(
  "block w-full min-w-0",
  fieldBorderIdle,
  "px-4 py-3",
  fieldText,
  "transition-[border-color] duration-150",
  fieldBorderFocusGold,
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-icyWhite",
  "disabled:cursor-not-allowed disabled:opacity-50",
  FIELD_ANCHOR_CLASS,
)

/** Booking flow: larger touch targets */
export const unifiedInputBookingClasses = cn(
  unifiedInputClasses,
  "min-h-[48px] sm:min-h-[44px] h-auto text-base sm:text-sm",
)

/** Standard `<Textarea />` */
export const unifiedTextareaClasses = cn(
  "w-full min-w-0",
  fieldBorderIdle,
  "px-4 py-3",
  fieldText,
  "transition-[border-color] duration-150",
  fieldBorderFocusGold,
  "resize-none min-h-[6rem]",
  "disabled:cursor-not-allowed disabled:opacity-50",
  FIELD_ANCHOR_CLASS,
)

/** Search bars (icon on the left) — same gold active border as other fields */
export const unifiedSearchInputClasses = cn(
  "w-full min-w-0",
  fieldBorderIdle,
  "pl-10 pr-4 py-2.5",
  fieldText,
  "transition-[border-color] duration-150",
  fieldBorderFocusGold,
  "disabled:cursor-not-allowed disabled:opacity-50",
  FIELD_ANCHOR_CLASS,
)

/** Compact admin tables (price catalog, narrow widths) */
export const unifiedInputDenseClasses = cn(
  "w-full min-w-0 rounded-lg border-2 border-white/10 bg-white/[0.04]",
  "px-2 py-1.5 text-sm text-icyWhite placeholder:text-icyWhite/40",
  "transition-[border-color] duration-150",
  fieldBorderFocusGold,
  "disabled:cursor-not-allowed disabled:opacity-50",
  FIELD_ANCHOR_CLASS,
)

export const unifiedTextareaDenseClasses = cn(
  "w-full min-w-0 rounded-lg border-2 border-white/10 bg-white/[0.04]",
  "px-2 py-1.5 text-sm text-icyWhite placeholder:text-icyWhite/40",
  "transition-[border-color] duration-150",
  fieldBorderFocusGold,
  "resize-y",
  "disabled:cursor-not-allowed disabled:opacity-50",
  FIELD_ANCHOR_CLASS,
)
