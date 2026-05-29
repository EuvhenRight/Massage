/**
 * Admin manual-send endpoint for client WhatsApp messages.
 *
 *   POST /api/admin/clients/{phoneE164}/send
 *   body: { type: 'birthday' | 'reEngagement' }
 *
 * Bypasses cron filters (year guard, threshold window) on purpose — admin
 * wants the "send now" button to actually send now. On success it still updates
 * `birthdayGreetedYear` / `reEngagementSentAt` so the next cron pass treats
 * the message as already delivered.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
	bookingUrlFor,
	notifyCustomerWhatsAppBirthday,
	notifyCustomerWhatsAppReEngagement,
} from '@/lib/whatsapp-admin-notify'
import {
	getClient,
	markBirthdayGreeted,
	markReEngagementSent,
} from '@/lib/clients-firestore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SendType = 'birthday' | 'reEngagement'

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ phone: string }> },
) {
	const session = await auth()
	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { phone: phoneParam } = await context.params
	const phoneE164 = decodeURIComponent(phoneParam)
	if (!phoneE164.startsWith('+')) {
		return NextResponse.json(
			{ error: 'Phone must be in E.164 format (+…)' },
			{ status: 400 },
		)
	}

	let body: { type?: SendType } | null = null
	try {
		body = (await request.json()) as { type?: SendType }
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}
	if (body?.type !== 'birthday' && body?.type !== 'reEngagement') {
		return NextResponse.json(
			{ error: "Body field 'type' must be 'birthday' or 'reEngagement'" },
			{ status: 400 },
		)
	}
	const type = body.type

	const client = await getClient(phoneE164)
	if (!client) {
		return NextResponse.json({ error: 'Client not found' }, { status: 404 })
	}

	const bookingUrl = bookingUrlFor(client.lastVisitPlace)
	const customerName = client.firstName || '—'

	const result =
		type === 'birthday'
			? await notifyCustomerWhatsAppBirthday({
					customerPhone: phoneE164,
					customerName,
					bookingUrl,
				})
			: await notifyCustomerWhatsAppReEngagement({
					customerPhone: phoneE164,
					customerName,
					bookingUrl,
				})

	if (result.status === 'sent') {
		const now = new Date()
		if (type === 'birthday') {
			// Use Europe/Bratislava year so the guard matches the cron pass.
			const year = Number(
				new Intl.DateTimeFormat('en-CA', {
					timeZone: 'Europe/Bratislava',
					year: 'numeric',
				}).format(now),
			)
			await markBirthdayGreeted(phoneE164, year)
		} else {
			await markReEngagementSent(phoneE164, now)
		}
		return NextResponse.json({ ok: true, status: 'sent' })
	}

	if (result.status === 'skipped') {
		return NextResponse.json(
			{ ok: false, status: 'skipped', reason: result.skipReason },
			{ status: 422 },
		)
	}

	return NextResponse.json(
		{ ok: false, status: 'failed', twilioCode: result.twilioCode },
		{ status: 502 },
	)
}
