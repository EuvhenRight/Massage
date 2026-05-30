/**
 * Unit tests for `lib/booking-schema.ts` — the zod schema that gates every
 * inbound booking before it touches Firestore.
 *
 * Two reasons this is P0:
 *   1. The schema is the only validation between public form input and
 *      `bookAppointment`. A regression here means malformed data lands in
 *      the appointment collection (broken phones, empty names, etc.).
 *   2. New fields (`birthday`, `optInMarketing`) are GDPR-relevant — opt-in
 *      must default to OFF, and birthday must accept "absent" without error.
 */

import { describe, expect, it } from 'vitest'
import { getBookingSchema } from '@/lib/booking-schema'

const schema = getBookingSchema()

describe('booking schema — required fields', () => {
	it('accepts a minimal valid booking (name + email + phone)', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(true)
	})

	it('rejects fullName shorter than 3 characters', () => {
		const result = schema.safeParse({
			fullName: 'An',
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(false)
	})

	it('rejects fullName longer than 100 characters', () => {
		const result = schema.safeParse({
			fullName: 'a'.repeat(101),
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(false)
	})

	it('rejects malformed email', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'not-an-email',
			phone: '+421912345678',
		})
		expect(result.success).toBe(false)
	})

	it('rejects phone that cannot be parsed to E.164', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: 'reception calls back',
		})
		expect(result.success).toBe(false)
	})
})

describe('booking schema — optional birthday (Phase 6)', () => {
	it('accepts a booking with no birthday field at all', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(true)
	})

	it('accepts a booking with an empty birthday string (native <input> blank state)', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			birthday: '',
		})
		expect(result.success).toBe(true)
	})

	it('accepts a YYYY-MM-DD birthday', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			birthday: '1992-05-17',
		})
		expect(result.success).toBe(true)
	})

	it('rejects a malformed birthday string', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			birthday: '17/05/1992',
		})
		expect(result.success).toBe(false)
	})
})

describe('booking schema — optInMarketing (GDPR)', () => {
	it('accepts a booking without optInMarketing (treated as off downstream)', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.optInMarketing).toBeUndefined()
		}
	})

	it('preserves a boolean true when supplied', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			optInMarketing: true,
		})
		expect(result.success).toBe(true)
		if (result.success) expect(result.data.optInMarketing).toBe(true)
	})

	it('preserves a boolean false when supplied', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			optInMarketing: false,
		})
		expect(result.success).toBe(true)
		if (result.success) expect(result.data.optInMarketing).toBe(false)
	})

	it('rejects non-boolean optInMarketing', () => {
		const result = schema.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			optInMarketing: 'yes',
		})
		expect(result.success).toBe(false)
	})
})

describe('booking schema — localized error messages', () => {
	it('uses custom Slovak message for fullName min', () => {
		const localized = getBookingSchema({
			fullNameMin: 'Meno musí mať aspoň 3 znaky',
		})
		const result = localized.safeParse({
			fullName: 'An',
			email: 'andrea@example.test',
			phone: '+421912345678',
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.message === 'Meno musí mať aspoň 3 znaky')).toBe(
				true,
			)
		}
	})

	it('uses custom birthday error message when override provided', () => {
		const localized = getBookingSchema({
			invalidBirthday: 'Použite výber dátumu',
		})
		const result = localized.safeParse({
			fullName: 'Andrea Nováková',
			email: 'andrea@example.test',
			phone: '+421912345678',
			birthday: '17.05.1992',
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues.some(i => i.message === 'Použite výber dátumu')).toBe(true)
		}
	})
})
