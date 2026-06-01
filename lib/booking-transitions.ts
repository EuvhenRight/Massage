/**
 * Orchestrates booking status transitions.
 *
 * This is the *only* place outside `lib/book-appointment.ts` that writes to
 * the `bookingStatus` / `*At` / `customerResponse` fields. Every customer
 * route (`/api/booking/confirm`, `/api/booking/cancel`) and every admin
 * status change funnels through `transitionBookingStatus` so the audit log
 * and the state machine cannot be bypassed.
 *
 * Atomicity model:
 *   - The status update + `days/*.slots` mutation (for cancellations) happen
 *     in a single Firestore transaction. If the transaction throws, no part
 *     of the change is persisted.
 *   - The audit row and any best-effort side effects (notifications, CRM
 *     activity) run *after* the transaction commits. They are wrapped at the
 *     call site (`Promise.allSettled`) so their failure never corrupts the
 *     primary state.
 *
 * Notifications and CRM denormalization are intentionally *not* inside this
 * module — they live next to the transport layer (Twilio helpers, client
 * card writes). The orchestrator returns enough context for callers to fire
 * the side effects without re-reading the appointment.
 */

import {
	doc,
	runTransaction,
	serverTimestamp,
	Timestamp,
	type DocumentReference,
} from 'firebase/firestore'
import { db } from './firebase'
import {
	readBookingStatus,
	STATUS_TIMESTAMP_FIELD,
	validateTransition,
	type BookingStatus,
	type StatusActor,
	type StatusSource,
} from './booking-status'
import { writeAuditEntry, type AuditAction } from './booking-audit'
import { getAppointmentDayDateKeys } from './book-appointment'
import { parseWhatsappE164 } from './phone-e164'

export interface TransitionInput {
	appointmentId: string
	toStatus: Exclude<BookingStatus, 'pending'>
	actor: StatusActor
	actorId?: string | null
	source: StatusSource
	/** Optional context recorded with the customer's response (IP, user agent). */
	request?: { ip?: string | null; userAgent?: string | null }
	/** Free-form audit metadata; merged into the audit row's `metadata` field. */
	metadata?: Record<string, unknown>
}

export type TransitionFailureReason =
	| 'appointment_not_found'
	| 'invalid_transition'

export type TransitionResult =
	| {
			ok: true
			changed: boolean
			fromStatus: BookingStatus
			toStatus: BookingStatus
			/** Snapshot of the appointment doc after the transition. */
			appointment: Record<string, unknown>
			/** Audit row ID — null when `changed === false` (no row written). */
			auditId: string | null
	  }
	| {
			ok: false
			reason: TransitionFailureReason
			fromStatus?: BookingStatus
			toStatus: BookingStatus
	  }

/**
 * Map the actor + target status to the canonical audit action.
 *
 * The mapping is intentional: a customer cancelling via a reminder link and
 * an admin cancelling from the calendar both move the booking to
 * `cancelled`, but they're two very different signals for reporting. Keeping
 * the audit action verb tied to the actor lets us answer "what fraction of
 * cancellations are customer-initiated?" with a single equality filter.
 */
function auditActionFor(
	actor: StatusActor,
	toStatus: Exclude<BookingStatus, 'pending'>,
	source: StatusSource,
): AuditAction {
	if (actor === 'system') {
		if (source === 'auto_post_appointment') {
			return toStatus === 'no_show' ? 'auto_no_show' : 'auto_completed'
		}
		return 'admin_status_changed'
	}
	if (actor === 'admin') {
		if (toStatus === 'confirmed') return 'admin_confirmed'
		if (toStatus === 'cancelled') return 'admin_cancelled'
		return 'admin_status_changed'
	}
	// customer
	if (toStatus === 'confirmed') return 'customer_confirmed'
	if (toStatus === 'cancelled') return 'customer_cancelled'
	// Customers can't move to completed / no_show via the public API; if it
	// ever happens (bug or future flow), audit it as a generic admin change.
	return 'admin_status_changed'
}

/**
 * Reads day refs that the appointment occupies. Returns an empty list for
 * TBD bookings (they never wrote to `days/*` in the first place) so the
 * caller can skip the cleanup step.
 */
function appointmentDayRefs(data: Record<string, unknown>): DocumentReference[] {
	if (data.scheduleTbd === true) return []
	const place = (data.place as string | undefined) ?? 'massage'
	const dateKeys = getAppointmentDayDateKeys(data)
	return dateKeys.map(k => doc(db, 'days', `${place}_${k}`))
}

/**
 * Execute a booking status transition.
 *
 * Returns `{ ok: false, reason: 'invalid_transition' }` for illegal moves
 * (e.g. confirming a cancelled booking) — the caller decides how to surface
 * that (error redirect, 409, ...). Returns `{ ok: false, reason:
 * 'appointment_not_found' }` when the doc is missing. Otherwise returns
 * `ok: true` with `changed` indicating whether anything actually moved (a
 * self-transition is `changed: false` and writes no audit row).
 */
export async function transitionBookingStatus(
	input: TransitionInput,
): Promise<TransitionResult> {
	const aptRef = doc(db, 'appointments', input.appointmentId)

	type TxOutcome =
		| {
				ok: true
				changed: boolean
				fromStatus: BookingStatus
				appointment: Record<string, unknown>
		  }
		| { ok: false; reason: TransitionFailureReason; fromStatus?: BookingStatus }

	const outcome: TxOutcome = await runTransaction(db, async tx => {
		const snap = await tx.get(aptRef)
		if (!snap.exists()) {
			return { ok: false, reason: 'appointment_not_found' } as const
		}

		const data = snap.data() as Record<string, unknown>
		const fromStatus = readBookingStatus(data)

		const decision = validateTransition(fromStatus, input.toStatus)
		if (!decision.ok) {
			return {
				ok: false,
				reason: 'invalid_transition',
				fromStatus,
			} as const
		}

		// Idempotent self-transition: no writes, no audit, no notifications.
		if (!decision.changed) {
			return { ok: true, changed: false, fromStatus, appointment: data } as const
		}

		// Cancellations must read all day docs (Firestore transactions require
		// reads before writes) so we can splice the slot out atomically.
		const dayRefs =
			input.toStatus === 'cancelled' ? appointmentDayRefs(data) : []
		const daySnaps = await Promise.all(dayRefs.map(ref => tx.get(ref)))

		const patch: Record<string, unknown> = {
			bookingStatus: input.toStatus,
			statusUpdatedAt: serverTimestamp(),
			statusUpdatedBy: input.actor,
			statusSource: input.source,
			[STATUS_TIMESTAMP_FIELD[input.toStatus]]: serverTimestamp(),
		}
		if (input.actor === 'customer') {
			patch.customerResponse = {
				action: input.toStatus === 'confirmed' ? 'confirm' : 'cancel',
				at: Timestamp.now(),
				source: input.source,
				userAgent: input.request?.userAgent ?? null,
				ip: input.request?.ip ?? null,
			}
		}

		tx.update(aptRef, patch)

		// Soft-cancel: remove this appointment's slot from each day doc. If a
		// day doc has no slots left, drop it entirely (matches existing
		// `deleteAppointment` cleanup so the calendar doesn't keep ghosts).
		if (input.toStatus === 'cancelled') {
			for (let i = 0; i < dayRefs.length; i++) {
				const daySnap = daySnaps[i]
				if (!daySnap?.exists()) continue
				const slots =
					((daySnap.data() as { slots?: { id: string }[] }).slots ?? []).filter(
						s => s.id !== input.appointmentId,
					)
				if (slots.length === 0) {
					tx.delete(dayRefs[i]!)
				} else {
					tx.set(dayRefs[i]!, { slots }, { merge: true })
				}
			}
		}

		return {
			ok: true,
			changed: true,
			fromStatus,
			appointment: { ...data, ...patch },
		} as const
	})

	if (!outcome.ok) {
		return {
			ok: false,
			reason: outcome.reason,
			fromStatus: outcome.fromStatus,
			toStatus: input.toStatus,
		}
	}

	if (!outcome.changed) {
		return {
			ok: true,
			changed: false,
			fromStatus: outcome.fromStatus,
			toStatus: input.toStatus,
			appointment: outcome.appointment,
			auditId: null,
		}
	}

	const phone =
		typeof outcome.appointment.phone === 'string'
			? parseWhatsappE164(outcome.appointment.phone)
			: null

	// Audit row is best-effort: a Firestore hiccup here mustn't roll back the
	// already-committed status change. Caller-side notifications follow the
	// same convention (see `Promise.allSettled` in route handlers).
	let auditId: string | null = null
	try {
		auditId = await writeAuditEntry({
			appointmentId: input.appointmentId,
			clientPhoneE164: phone,
			action: auditActionFor(input.actor, input.toStatus, input.source),
			actor: input.actor,
			actorId: input.actorId ?? null,
			source: input.source,
			fromStatus: outcome.fromStatus,
			toStatus: input.toStatus,
			metadata: {
				...(input.metadata ?? {}),
				...(input.request
					? {
							request: {
								ip: input.request.ip ?? null,
								userAgent: input.request.userAgent ?? null,
							},
						}
					: {}),
			},
		})
	} catch (e) {
		console.error('[booking-transitions] audit write failed', e)
	}

	return {
		ok: true,
		changed: true,
		fromStatus: outcome.fromStatus,
		toStatus: input.toStatus,
		appointment: outcome.appointment,
		auditId,
	}
}
