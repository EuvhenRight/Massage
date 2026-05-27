/**
 * Short signed tokens for one-click confirm / cancel links sent in WhatsApp reminders.
 * Format: <base64url(payload)>.<base64url(hmac)>  — compact, URL-safe, no deps.
 *
 * Payload = { id: appointmentId, e: expiry unix ms }. One token per appointment is
 * shared between confirm and cancel buttons; the URL path encodes the chosen action,
 * since the only realistic holder of the token is the customer themselves.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export type BookingActionTokenPayload = {
	appointmentId: string
	/** Unix ms — token rejected after this instant */
	expiresAt: number
}

function getSecret(): string {
	const s = process.env.BOOKING_ACTION_SECRET?.trim()
	if (!s || s.length < 32) {
		throw new Error(
			'BOOKING_ACTION_SECRET missing or shorter than 32 chars — generate with `openssl rand -hex 32`',
		)
	}
	return s
}

function b64urlEncode(buf: Buffer): string {
	return buf
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer | null {
	try {
		const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
		const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + pad
		return Buffer.from(normalized, 'base64')
	} catch {
		return null
	}
}

function hmac(payloadBuf: Buffer, secret: string): Buffer {
	return createHmac('sha256', secret).update(payloadBuf).digest()
}

export function signActionToken(input: BookingActionTokenPayload): string {
	const secret = getSecret()
	const json = JSON.stringify({ id: input.appointmentId, e: input.expiresAt })
	const payloadBuf = Buffer.from(json, 'utf8')
	const sig = hmac(payloadBuf, secret)
	return `${b64urlEncode(payloadBuf)}.${b64urlEncode(sig)}`
}

export function verifyActionToken(
	token: string,
): BookingActionTokenPayload | null {
	if (typeof token !== 'string') return null
	const dot = token.indexOf('.')
	if (dot < 1 || dot === token.length - 1) return null

	const payloadB64 = token.slice(0, dot)
	const sigB64 = token.slice(dot + 1)
	const payloadBuf = b64urlDecode(payloadB64)
	const sigBuf = b64urlDecode(sigB64)
	if (!payloadBuf || !sigBuf) return null

	let secret: string
	try {
		secret = getSecret()
	} catch {
		return null
	}
	const expected = hmac(payloadBuf, secret)
	if (expected.length !== sigBuf.length) return null
	if (!timingSafeEqual(expected, sigBuf)) return null

	let parsed: { id?: unknown; e?: unknown }
	try {
		parsed = JSON.parse(payloadBuf.toString('utf8'))
	} catch {
		return null
	}
	if (typeof parsed.id !== 'string' || parsed.id.length === 0) return null
	if (typeof parsed.e !== 'number' || !Number.isFinite(parsed.e)) return null
	if (Date.now() >= parsed.e) return null

	return { appointmentId: parsed.id, expiresAt: parsed.e }
}

/** Convenience: token whose expiry is the appointment start + a small grace period. */
export function signTokenForAppointment(
	appointmentId: string,
	appointmentStart: Date,
	gracePeriodMs: number = 6 * 60 * 60 * 1000,
): string {
	return signActionToken({
		appointmentId,
		expiresAt: appointmentStart.getTime() + gracePeriodMs,
	})
}
