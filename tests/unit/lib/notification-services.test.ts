/**
 * Unit tests for how a multi-service booking is rendered into notifications:
 * `lib/split-catalog-service-title.ts` (splitting the joined `service` string)
 * and `lib/email-templates.ts` (the services block + HTML escaping).
 *
 * P0 because these are the last mile of a booking. Before multi-service support
 * the WhatsApp flattener took the LAST path segment of the whole string, so a
 * "legs + arms" booking told the customer only "arms" — silently dropping a
 * service they had paid for. These tests pin that down.
 */

import { describe, expect, it } from 'vitest'
import {
	bookingServiceLineTitles,
	flattenServiceTitlesForWhatsApp,
	splitBookingServiceTitles,
	splitCatalogServiceTitle,
} from '@/lib/split-catalog-service-title'
import {
	buildAdminNewBooking,
	buildConfirmationEmail,
} from '@/lib/email-templates'

const MULTI = 'Depilácia › Nohy › Lýtko + Depilácia › Ruky › Predlaktie'

describe('splitBookingServiceTitles', () => {
	it('splits a joined multi-service string into one entry per service', () => {
		expect(splitBookingServiceTitles(MULTI)).toEqual([
			'Depilácia › Nohy › Lýtko',
			'Depilácia › Ruky › Predlaktie',
		])
	})

	it('returns a single-service string unchanged', () => {
		expect(splitBookingServiceTitles('Masáž chrbta')).toEqual(['Masáž chrbta'])
	})

	it('returns nothing for an empty string', () => {
		expect(splitBookingServiceTitles('   ')).toEqual([])
	})
})

describe('bookingServiceLineTitles', () => {
	it('keeps every service, not just the last — the old truncation bug', () => {
		expect(bookingServiceLineTitles(MULTI)).toEqual(['Lýtko', 'Predlaktie'])
	})

	it('reduces each entry to its leaf, dropping the catalog path', () => {
		expect(splitCatalogServiceTitle('A › B › Leaf').lineTitle).toBe('Leaf')
		expect(bookingServiceLineTitles('A › B › Leaf')).toEqual(['Leaf'])
	})
})

describe('confirmation email — services block', () => {
	it('lists every booked service', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', [
			'Lýtko',
			'Predlaktie',
		])
		expect(html).toContain('Lýtko')
		expect(html).toContain('Predlaktie')
	})

	it('numbers the lines and uses the plural label for several services', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', [
			'Lýtko',
			'Predlaktie',
		])
		expect(html).toContain('Služby')
		expect(html).toContain('1.')
		expect(html).toContain('2.')
	})

	it('keeps the singular one-line row for a single service', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', ['Lýtko'])
		expect(html).toContain('Služba')
		expect(html).not.toContain('Služby')
	})

	it('still accepts a bare string (admin / legacy callers)', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', 'Masáž')
		expect(html).toContain('Masáž')
	})

	it('falls back to a generic label when no service is given', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', [])
		expect(html).toContain('Rezervácia')
	})
})

describe('email HTML escaping', () => {
	it('escapes a customer name so form input cannot inject markup', () => {
		const html = buildConfirmationEmail(
			'<script>alert(1)</script>',
			'1.1.2030',
			'10:00',
			['Lýtko'],
		)
		expect(html).not.toContain('<script>alert(1)</script>')
		expect(html).toContain('&lt;script&gt;')
	})

	it('escapes service titles', () => {
		const html = buildConfirmationEmail('Andrea', '1.1.2030', '10:00', [
			'<b>Lýtko</b>',
			'Predlaktie',
		])
		expect(html).not.toContain('<b>Lýtko</b>')
		expect(html).toContain('&lt;b&gt;')
	})

	it('escapes the admin email address in both the link and the label', () => {
		const html = buildAdminNewBooking(
			'Andrea',
			'"><script>x</script>@example.test',
			'1.1.2030',
			'10:00',
			['Lýtko'],
		)
		expect(html).not.toContain('<script>x</script>')
	})

	it('leaves an ordinary booking untouched', () => {
		const html = buildConfirmationEmail('Andrea Nováková', '1.1.2030', '10:00', [
			'Lýtko',
		])
		expect(html).toContain('Andrea Nováková')
	})
})

describe('WhatsApp service variable', () => {
	it('names every booked service — the bug was showing only the last', () => {
		expect(flattenServiceTitlesForWhatsApp(MULTI)).toBe('Lýtko, Predlaktie')
	})

	it('renders a single service exactly as before', () => {
		expect(flattenServiceTitlesForWhatsApp('A › B › Leaf')).toBe('Leaf')
	})

	it('marks overflow instead of dropping services', () => {
		const many = Array.from({ length: 12 }, (_, i) => `Service number ${i}`).join(' + ')
		const out = flattenServiceTitlesForWhatsApp(many)
		expect(out.endsWith('…')).toBe(true)
		expect(out.length).toBeLessThanOrEqual(122)
	})

	it('never cuts a service name mid-word when trimming', () => {
		const many = Array.from({ length: 12 }, (_, i) => `Service number ${i}`).join(' + ')
		const out = flattenServiceTitlesForWhatsApp(many)
		for (const chunk of out.replace(/ …$/, '').split(', ')) {
			expect(chunk).toMatch(/^Service number \d+$/)
		}
	})

	it('truncates a single over-long name rather than returning nothing', () => {
		const out = flattenServiceTitlesForWhatsApp('x'.repeat(400), 20)
		expect(out).toHaveLength(20)
		expect(out.endsWith('…')).toBe(true)
	})

	it('passes an empty string through unchanged', () => {
		expect(flattenServiceTitlesForWhatsApp('')).toBe('')
	})
})
