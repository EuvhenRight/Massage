/**
 * Admin endpoint for moving a booking between lifecycle statuses from the
 * calendar UI.
 *
 *   POST /api/admin/appointments/{id}/status
 *   body: { toStatus: 'confirmed' | 'cancelled' | 'completed' | 'no_show' }
 *
 * Auth: admin session required (the same NextAuth guard used elsewhere in
 * `/api/admin/*`). All transitions funnel through
 * `transitionBookingStatus` so the audit trail and state machine apply
 * uniformly to customer and admin actions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { transitionBookingStatus } from '@/lib/booking-transitions'
import type {
	BookingStatus,
	StatusSource,
} from '@/lib/booking-status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AdminTargetStatus = Exclude<BookingStatus, 'pending'>

const ALLOWED_TARGETS: ReadonlySet<AdminTargetStatus> = new Set<AdminTargetStatus>([
	'confirmed',
	'cancelled',
	'completed',
	'no_show',
])

function parseTarget(value: unknown): AdminTargetStatus | null {
	if (typeof value !== 'string') return null
	return ALLOWED_TARGETS.has(value as AdminTargetStatus)
		? (value as AdminTargetStatus)
		: null
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const session = await auth()
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { id } = await context.params
	if (!id) {
		return NextResponse.json({ error: 'Missing id' }, { status: 400 })
	}

	let body: Record<string, unknown> = {}
	try {
		const parsed = (await request.json()) as unknown
		if (parsed && typeof parsed === 'object') {
			body = parsed as Record<string, unknown>
		}
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const toStatus = parseTarget(body.toStatus)
	if (!toStatus) {
		return NextResponse.json(
			{ error: 'toStatus must be one of confirmed/cancelled/completed/no_show' },
			{ status: 400 },
		)
	}

	// Source defaults to `admin_calendar`; callers can override (e.g. a future
	// admin edit modal would pass `admin_modal`). Anything else is rejected
	// to keep the audit log free of unknown provenance tags.
	const source: StatusSource =
		body.source === 'admin_modal' ? 'admin_modal' : 'admin_calendar'

	const result = await transitionBookingStatus({
		appointmentId: id,
		toStatus,
		actor: 'admin',
		actorId: session.user.email ?? null,
		source,
		request: {
			ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		},
	})

	if (!result.ok) {
		if (result.reason === 'appointment_not_found') {
			return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
		}
		return NextResponse.json(
			{
				error: 'invalid_transition',
				fromStatus: result.fromStatus,
				toStatus: result.toStatus,
			},
			{ status: 409 },
		)
	}

	return NextResponse.json({
		ok: true,
		changed: result.changed,
		fromStatus: result.fromStatus,
		toStatus: result.toStatus,
		auditId: result.auditId,
	})
}
