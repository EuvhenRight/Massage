/**
 * Booking lifecycle state machine.
 *
 * Every customer- or admin-initiated status change in the booking system
 * funnels through `transitionBookingStatus` (added later in this phase). The
 * pure helpers in this file own the type definitions and the validation rules
 * — they are dependency-free so they can be exercised in unit tests without
 * a Firestore emulator.
 *
 * States:
 *   pending    — created, customer has not responded to a reminder yet.
 *   confirmed  — customer (or admin) confirmed attendance.
 *   cancelled  — customer (or admin) cancelled. Soft-delete: the appointment
 *                doc is kept for history; the calendar slot is freed.
 *   completed  — terminal "happy" state, set automatically after the booking
 *                end time has passed for `pending` or `confirmed` rows.
 *   no_show    — terminal "missed" state, set automatically for `pending`
 *                rows after the end time, or manually by an admin.
 *
 * Why a state machine: implicit status (presence of timestamps, doc existence)
 * is impossible to filter on at query level and impossible to render in the
 * calendar UI without a switch chain in every component. The explicit enum
 * also gives us a stable contract for the new `booking_audit` rows.
 */

export const BOOKING_STATUS_VALUES = [
	'pending',
	'confirmed',
	'cancelled',
	'completed',
	'no_show',
] as const

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number]

export type StatusActor = 'customer' | 'admin' | 'system'

/**
 * Provenance of a status change. `reminder_*` values are set when a customer
 * action originates from a WhatsApp reminder (the reminder window is encoded
 * into the signed token; see `lib/booking-action-token.ts`). `admin_*` values
 * come from staff actions in the admin calendar; `auto_post_appointment` is
 * set by the daily finalize cron; `initial_booking` is set by the booking
 * flow when it creates a doc.
 */
export const STATUS_SOURCE_VALUES = [
	'reminder_2d',
	'reminder_1d',
	'reminder_0d',
	'admin_calendar',
	'admin_modal',
	'auto_post_appointment',
	'initial_booking',
] as const

export type StatusSource = (typeof STATUS_SOURCE_VALUES)[number]

/**
 * Allowed state transitions. Keys are source statuses; values are the set of
 * statuses you may move to. Self-transitions are allowed and treated as
 * idempotent by the orchestrator (so a customer re-clicking a confirm link
 * doesn't re-send notifications or write a new audit row).
 *
 * Terminal states (`completed`, `no_show`) only allow swapping between each
 * other (admin override) — never back to `pending`/`confirmed`/`cancelled`.
 * Cancelled is one-way: once a cancellation has been communicated to the
 * customer we don't quietly re-activate. Rescheduling will go through a
 * separate path that creates a fresh booking; cancelled remains immutable.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, ReadonlySet<BookingStatus>> = {
	pending: new Set<BookingStatus>([
		'pending',
		'confirmed',
		'cancelled',
		'completed',
		'no_show',
	]),
	confirmed: new Set<BookingStatus>([
		'confirmed',
		'cancelled',
		'completed',
		'no_show',
	]),
	cancelled: new Set<BookingStatus>(['cancelled']),
	completed: new Set<BookingStatus>(['completed', 'no_show']),
	no_show: new Set<BookingStatus>(['no_show', 'completed']),
}

/**
 * Per-status timestamp field on `appointments/{id}`. `confirmedAt`/etc. are
 * monotonic — once set they are never cleared, even if a later transition
 * overwrites `bookingStatus`. This preserves the "was confirmed at some point"
 * signal for reporting (e.g. "of bookings that the customer confirmed, what
 * percentage ended up as no-shows").
 */
export const STATUS_TIMESTAMP_FIELD: Record<
	Exclude<BookingStatus, 'pending'>,
	'confirmedAt' | 'cancelledAt' | 'completedAt' | 'noShowAt'
> = {
	confirmed: 'confirmedAt',
	cancelled: 'cancelledAt',
	completed: 'completedAt',
	no_show: 'noShowAt',
}

export type TransitionDecision =
	| { ok: true; changed: boolean }
	| { ok: false; reason: 'invalid_transition'; from: BookingStatus; to: BookingStatus }

/**
 * Pure decision function: returns whether moving from `from` to `to` is
 * allowed, and whether the transition actually changes state. Self-transitions
 * are `ok: true, changed: false` — callers should treat that as a no-op.
 *
 * This separation matters for testability: the orchestrator can be tested
 * against a real emulator while this rule table is verified by cheap unit
 * tests covering every combination.
 */
export function validateTransition(
	from: BookingStatus,
	to: BookingStatus,
): TransitionDecision {
	const allowed = ALLOWED_TRANSITIONS[from]
	if (!allowed.has(to)) {
		return { ok: false, reason: 'invalid_transition', from, to }
	}
	return { ok: true, changed: from !== to }
}

/**
 * Read the status off a raw Firestore appointment payload. Older docs created
 * before the bookingStatus migration won't have the field — they're treated as
 * `pending`, which matches the prior implicit semantics (a booking with no
 * `customerConfirmedAt` and no deletion was effectively pending).
 */
export function readBookingStatus(data: Record<string, unknown>): BookingStatus {
	const raw = data.bookingStatus
	if (typeof raw === 'string' && (BOOKING_STATUS_VALUES as readonly string[]).includes(raw)) {
		return raw as BookingStatus
	}
	return 'pending'
}

/**
 * Map a reminder window identifier from the action token to the matching
 * status source. The token uses the compact `'r2' | 'r1' | 'r0'` form to keep
 * the URL short; this function expands it into the canonical
 * `reminder_<window>` value used in audit logs and reporting.
 *
 * Returns `null` for unrecognised input so callers can fall back to a default
 * (typically `reminder_1d` for tokens minted before the source field existed).
 */
export function reminderTokenSourceToStatusSource(
	token: string | undefined | null,
): Extract<StatusSource, 'reminder_2d' | 'reminder_1d' | 'reminder_0d'> | null {
	if (token === 'r2') return 'reminder_2d'
	if (token === 'r1') return 'reminder_1d'
	if (token === 'r0') return 'reminder_0d'
	return null
}
