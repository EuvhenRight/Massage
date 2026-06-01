/**
 * Visual palette for booking statuses in the admin calendar.
 *
 * All status-driven UI (calendar block rail, status badge, event detail pill)
 * resolves its colors and icon through `getBookingStatusUi`. Keeping the
 * mapping here means:
 *   - Designers can rebalance the palette in one place.
 *   - The calendar block, popover, and any future status filter chip pick
 *     up the same color in lockstep.
 *   - The `i18nKey` slot ties each status to a translation key in the
 *     `admin.bookingStatus` namespace, so labels stay localized without
 *     hardcoding strings in components.
 */

import { CheckCircle2, Circle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BookingStatus } from './booking-status'

export interface BookingStatusUi {
	/**
	 * Tailwind classes for the 3px left rail painted on the calendar block.
	 * Solid color tokens only — no gradients — so the rail stays crisp at
	 * every block size.
	 */
	railClass: string
	/**
	 * Tailwind classes for the small status badge (e.g. top-right of the
	 * calendar block, status pill in the detail popover). Background and
	 * border tuned so the badge reads on top of the service-colored block
	 * surface without bleeding into the underlying color.
	 */
	badgeClass: string
	/** Tailwind class controlling the icon stroke color inside the badge. */
	iconClass: string
	/** Glyph for the status — picked from lucide so we keep visual parity. */
	icon: LucideIcon
	/**
	 * Translation key under the `admin.bookingStatus` namespace. Components
	 * call `t(\`bookingStatus.${ui.i18nKey}\`)` to render the localized label.
	 */
	i18nKey:
		| 'pending'
		| 'confirmed'
		| 'cancelled'
		| 'completed'
		| 'noShow'
	/**
	 * `true` for statuses that should pull the block toward the background
	 * (cancelled). Calendar blocks read this to apply a desaturated surface
	 * + diagonal-stripe overlay.
	 */
	muted: boolean
}

const PENDING_UI: BookingStatusUi = {
	railClass: 'bg-white/40',
	badgeClass: 'border-white/30 bg-white/15 text-white/90',
	iconClass: 'text-white/80',
	icon: Clock,
	i18nKey: 'pending',
	muted: false,
}

const CONFIRMED_UI: BookingStatusUi = {
	railClass: 'bg-emerald-400',
	badgeClass: 'border-emerald-300/40 bg-emerald-500/25 text-emerald-50',
	iconClass: 'text-emerald-100',
	icon: CheckCircle2,
	i18nKey: 'confirmed',
	muted: false,
}

const CANCELLED_UI: BookingStatusUi = {
	railClass: 'bg-rose-500',
	badgeClass: 'border-rose-300/40 bg-rose-500/25 text-rose-50',
	iconClass: 'text-rose-100',
	icon: XCircle,
	i18nKey: 'cancelled',
	muted: true,
}

const COMPLETED_UI: BookingStatusUi = {
	railClass: 'bg-sky-400',
	badgeClass: 'border-sky-300/40 bg-sky-500/25 text-sky-50',
	iconClass: 'text-sky-100',
	icon: Circle,
	i18nKey: 'completed',
	muted: false,
}

const NO_SHOW_UI: BookingStatusUi = {
	railClass: 'bg-amber-500',
	badgeClass: 'border-amber-300/40 bg-amber-500/25 text-amber-50',
	iconClass: 'text-amber-100',
	icon: AlertTriangle,
	i18nKey: 'noShow',
	muted: false,
}

const MAP: Record<BookingStatus, BookingStatusUi> = {
	pending: PENDING_UI,
	confirmed: CONFIRMED_UI,
	cancelled: CANCELLED_UI,
	completed: COMPLETED_UI,
	no_show: NO_SHOW_UI,
}

/**
 * Resolve the UI bundle for a booking status. Returns the `pending` palette
 * when the input is missing or unknown so legacy docs (which lack
 * `bookingStatus`) get a sensible visual default without throwing.
 */
export function getBookingStatusUi(
	status: BookingStatus | undefined | null,
): BookingStatusUi {
	if (!status) return PENDING_UI
	return MAP[status] ?? PENDING_UI
}
