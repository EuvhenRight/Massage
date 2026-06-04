/**
 * Vercel Cron: auto-finalises past bookings whose admin outcome was never
 * marked.
 *
 * Logic:
 *   - `confirmed` + `endTime + grace <= now` → `completed`
 *     (customer confirmed via reminder, appointment time has passed —
 *      assume the visit happened unless admin overrides)
 *
 *   - `pending`   + `endTime + grace <= now` → `no_show`
 *     (customer never responded to reminders, never visibly engaged —
 *      assume no-show unless admin overrides)
 *
 * Grace period (default 12h, override via `AUTO_FINALIZE_GRACE_HOURS`):
 * we don't finalise immediately at `endTime` because the admin might be
 * actively triaging in the popover for an appointment that *just* ended.
 * The grace window gives them time to mark the outcome by hand before the
 * cron decides for them.
 *
 * Safety:
 *   - Only touches docs that explicitly have `bookingStatus` ∈
 *     {pending, confirmed}. Legacy docs without the field are skipped so
 *     pre-migration history doesn't get mass-marked as no-show.
 *   - TBD bookings (`scheduleTbd === true`) live at the 2099 placeholder
 *     date and naturally fall outside the `endTime <= cutoff` query.
 *   - Every transition still funnels through `transitionBookingStatus`,
 *     so the audit log, customer card timeline counters, and Firestore
 *     transaction guarantees apply identically to system actions.
 *   - Admin can flip the outcome via the calendar popover at any time —
 *     transitions between `completed` ↔ `no_show` are explicitly allowed
 *     by the state machine (see `lib/booking-status.ts`).
 *
 * Auth: Vercel attaches `Authorization: Bearer <CRON_SECRET>` to scheduled
 * calls. Same pattern as the reminder cron.
 */

import { NextResponse } from 'next/server'
import {
	Timestamp,
	collection,
	getDocs,
	query,
	where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import type { BookingStatus } from '@/lib/booking-status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_GRACE_HOURS = 12

function gracePeriodMs(): number {
	const raw = Number(process.env.AUTO_FINALIZE_GRACE_HOURS)
	if (!Number.isFinite(raw) || raw < 0) return DEFAULT_GRACE_HOURS * HOUR_MS
	return Math.floor(raw) * HOUR_MS
}

function authorized(request: Request): boolean {
	const expected = process.env.CRON_SECRET?.trim()
	if (!expected) {
		console.warn('[cron/finalize-statuses] CRON_SECRET not set, allowing call')
		return true
	}
	const header = request.headers.get('authorization') ?? ''
	return header === `Bearer ${expected}`
}

type FromStatus = 'pending' | 'confirmed'

interface PassResult {
	scanned: number
	updated: number
	skipped: number
	failed: number
}

/**
 * Process all docs with `bookingStatus === fromStatus` whose `endTime` is
 * past the grace cutoff. Each successful transition counts toward
 * `updated`; idempotent no-ops (already in target state) count as
 * `skipped`; orchestrator failures count as `failed`.
 */
async function finalisePass(
	fromStatus: FromStatus,
	toStatus: Exclude<BookingStatus, 'pending'>,
	cutoffTs: Timestamp,
): Promise<PassResult> {
	const result: PassResult = {
		scanned: 0,
		updated: 0,
		skipped: 0,
		failed: 0,
	}

	const q = query(
		collection(db, 'appointments'),
		where('bookingStatus', '==', fromStatus),
		where('endTime', '<=', cutoffTs),
	)
	const snap = await getDocs(q)
	result.scanned = snap.size

	for (const docSnap of snap.docs) {
		const data = docSnap.data() as Record<string, unknown>

		// Defence in depth — TBD bookings have endTime in 2099 so wouldn't
		// pass the cutoff filter, but if a legacy admin write leaves the
		// scheduleTbd flag set on a real-dated booking we still skip.
		if (data.scheduleTbd === true) {
			result.skipped += 1
			continue
		}

		try {
			const transition = await transitionBookingStatus({
				appointmentId: docSnap.id,
				toStatus,
				actor: 'system',
				source: 'auto_post_appointment',
				metadata: {
					gracePeriodMs: gracePeriodMs(),
					fromStatus,
				},
			})

			if (!transition.ok) {
				console.error(
					'[cron/finalize-statuses] transition failed',
					docSnap.id,
					transition.reason,
				)
				result.failed += 1
				continue
			}

			if (transition.changed) {
				result.updated += 1
			} else {
				result.skipped += 1
			}
		} catch (e) {
			console.error('[cron/finalize-statuses] unexpected error', docSnap.id, e)
			result.failed += 1
		}
	}

	return result
}

export async function GET(request: Request) {
	if (!authorized(request)) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	}

	const cutoffMs = Date.now() - gracePeriodMs()
	const cutoffTs = Timestamp.fromMillis(cutoffMs)

	const [confirmedPass, pendingPass] = await Promise.all([
		finalisePass('confirmed', 'completed', cutoffTs),
		finalisePass('pending', 'no_show', cutoffTs),
	])

	return NextResponse.json({
		ok: true,
		cutoffIso: new Date(cutoffMs).toISOString(),
		gracePeriodHours: gracePeriodMs() / HOUR_MS,
		completed: confirmedPass,
		noShow: pendingPass,
	})
}
