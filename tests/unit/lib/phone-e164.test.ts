/**
 * Unit tests for `lib/phone-e164.ts`.
 *
 * Why this module is P0:
 *   - The phone number is the canonical client identity (it's the Firestore
 *     document ID in the `clients` collection — see lib/clients-firestore.ts).
 *     A wrong normalisation creates orphan client cards and breaks
 *     re-engagement / birthday targeting.
 *   - It's also the WhatsApp `To` address. A malformed E.164 means Twilio
 *     rejects the send.
 *
 * Coverage targets every public function plus the regional fallback list.
 * Real numbers below are formatted samples, not actual customer numbers.
 */

import { describe, expect, it } from 'vitest'
import {
	formatPhoneInternationalDisplay,
	normalizeStoredPhone,
	parseWhatsappE164,
} from '@/lib/phone-e164'

describe('parseWhatsappE164', () => {
	describe('valid international formats', () => {
		it.each([
			['+421 912 345 678', '+421912345678'],
			['+421912345678', '+421912345678'],
			['+421-912-345-678', '+421912345678'],
			['+421 (912) 345-678', '+421912345678'],
			['+380 50 123 4567', '+380501234567'],
			['+49 30 12345678', '+493012345678'],
		])('normalises %p to %p', (input, expected) => {
			expect(parseWhatsappE164(input)).toBe(expected)
		})

		it('accepts 00-prefixed international format', () => {
			expect(parseWhatsappE164('00421912345678')).toBe('+421912345678')
		})

		it('strips internal whitespace and punctuation before parsing', () => {
			expect(parseWhatsappE164('  +421 / 912.345.678  ')).toBe('+421912345678')
		})
	})

	describe('national formats resolved against regional defaults', () => {
		// SK is intentionally first in CUSTOMER_PHONE_REGION_DEFAULTS — the
		// salon is in Slovakia, so leading-0 numbers default to +421 even
		// when the customer might mean +420 (Czech). Customers from other
		// countries should supply the country code; this is documented in
		// the booking-form helper text.
		it('parses Slovak national format with leading 0 as +421', () => {
			expect(parseWhatsappE164('0912 345 678')).toBe('+421912345678')
		})
	})

	describe('invalid input', () => {
		// Only inputs that NO region heuristic in libphonenumber-js can ever
		// interpret as a phone number. Short-but-numeric strings like '12345'
		// or '+123' are intentionally NOT here — libphonenumber matches them
		// against country defaults (AT short codes, etc.), so they're a
		// libphonenumber decision rather than a `phone-e164` one. The module
		// is by design generous to maximise WhatsApp deliverability.
		it.each(['', ' ', '—', 'abc', '+'])('rejects %p', input => {
			expect(parseWhatsappE164(input)).toBeNull()
		})

		it('rejects digits-only too long to be a phone number (> 15 digits)', () => {
			expect(parseWhatsappE164('1234567890123456')).toBeNull()
		})
	})
})

describe('normalizeStoredPhone', () => {
	it('returns E.164 for parseable input', () => {
		expect(normalizeStoredPhone('+421 912 345 678')).toBe('+421912345678')
	})

	it('preserves trimmed input when parsing fails (legacy / admin freeform)', () => {
		expect(normalizeStoredPhone('  ask reception  ')).toBe('ask reception')
	})

	it('keeps the em-dash placeholder used by the admin booking form', () => {
		expect(normalizeStoredPhone('—')).toBe('—')
	})

	it('empties stay empty', () => {
		expect(normalizeStoredPhone('')).toBe('')
		expect(normalizeStoredPhone('   ')).toBe('')
	})
})

describe('formatPhoneInternationalDisplay', () => {
	it('returns null for invalid E.164 input', () => {
		expect(formatPhoneInternationalDisplay('not-a-number')).toBeNull()
	})

	it('returns a libphonenumber international display string for valid input', () => {
		const display = formatPhoneInternationalDisplay('+421912345678')
		expect(display).not.toBeNull()
		// libphonenumber's exact spacing can vary by country; just sanity-check
		// that it starts with the country code and contains the subscriber digits.
		expect(display).toMatch(/^\+421\s/)
		expect(display).toContain('912')
	})
})
