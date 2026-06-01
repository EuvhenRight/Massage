/**
 * Append-only audit log for booking lifecycle events.
 *
 * Every customer- or admin-initiated change to a booking writes one row here
 * — the orchestrator in `transitionBookingStatus` is the only caller for
 * status transitions; the reminder cron and booking creation paths add their
 * own rows for `created` / `reminder_sent`.
 *
 * Why a separate collection rather than embedding history on the appointment:
 *   1. Firestore docs are size-capped (1 MiB) and we never want a chatty
 *      booking to bump into that ceiling.
 *   2. Cross-booking reporting ("how many no-shows last month?",
 *      "confirmation rate by reminder window") becomes a single collection
 *      query instead of a fan-out.
 *   3. We also denormalize a slimmer projection into
 *      `clients/{phone}/activity` for the CRM timeline — the wider audit row
 *      is the system-of-record, the activity row is the customer-facing view.
 *
 * Rows are immutable once written: there is no `updateAuditEntry`. Mistakes
 * are corrected by appending a new row (e.g. an `admin_status_changed` after
 * a wrongly-applied `customer_cancelled`).
 */

import {
	addDoc,
	collection,
	serverTimestamp,
	type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
	BookingStatus,
	StatusActor,
	StatusSource,
} from './booking-status'

/**
 * Discriminated set of audit actions. Values include both system-wide events
 * (booking created, reminder sent) and status transitions (confirmed,
 * cancelled, ...). Adding a new action means: append here, then update the
 * UI mapping in `AdminCalendarEventDetail` and the CRM timeline component.
 */
export const AUDIT_ACTION_VALUES = [
	'created',
	'updated',
	'rescheduled',
	'reminder_sent',
	'customer_confirmed',
	'customer_cancelled',
	'admin_confirmed',
	'admin_cancelled',
	'admin_status_changed',
	'auto_completed',
	'auto_no_show',
	'notification_failed',
] as const

export type AuditAction = (typeof AUDIT_ACTION_VALUES)[number]

export interface AuditEntryInput {
	appointmentId: string
	/** E.164 phone string used as the client doc ID; null when unknown. */
	clientPhoneE164: string | null
	action: AuditAction
	actor: StatusActor
	/** Admin uid when actor === 'admin'; null otherwise. */
	actorId?: string | null
	source: StatusSource | 'cron' | 'admin_api' | 'public_api'
	fromStatus?: BookingStatus | null
	toStatus?: BookingStatus | null
	/**
	 * Free-form context: service, dates, IP, user agent, notification result.
	 * Keep payloads small (< ~5 kB) to leave headroom — large blobs belong in
	 * dedicated logs, not the audit collection.
	 */
	metadata?: Record<string, unknown>
}

export interface AuditEntry extends AuditEntryInput {
	id: string
	createdAt: Timestamp
}

/**
 * Append a single audit row. Returns the new document ID.
 *
 * Best-effort by convention: callers wrap this in `Promise.allSettled` so an
 * audit-write failure never rolls back the underlying business action. We do
 * not retry inline; if Firestore is degraded the orchestrator logs the
 * rejection and the operator can replay from logs.
 *
 * Field shape stays flat (no nested timestamps, no Date objects) so the row
 * can be exported to BigQuery via the Firestore connector without
 * schema-on-read coercion.
 */
export async function writeAuditEntry(input: AuditEntryInput): Promise<string> {
	const ref = await addDoc(collection(db, 'booking_audit'), {
		appointmentId: input.appointmentId,
		clientPhoneE164: input.clientPhoneE164,
		action: input.action,
		actor: input.actor,
		actorId: input.actorId ?? null,
		source: input.source,
		fromStatus: input.fromStatus ?? null,
		toStatus: input.toStatus ?? null,
		metadata: input.metadata ?? {},
		createdAt: serverTimestamp(),
	})
	return ref.id
}
