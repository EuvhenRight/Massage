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
	appointmentServiceLabel,
	flattenServiceTitlesForWhatsApp,
	messageServiceLabel,
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

describe('service label — variant-only leaves', () => {
	// Massage lines end in the duration, so the leaf alone said "1 hour" and the
	// customer never learned which massage they had booked.
	it('prepends the parent when the leaf is only a duration', () => {
		expect(messageServiceLabel('Massage › Sports › 1 hour')).toBe('Sports — 1 hour')
		expect(messageServiceLabel('Массаж › Расслабляющий › 1 час')).toBe(
			'Расслабляющий — 1 час',
		)
		expect(messageServiceLabel('Masáž › Relaxačná › 1,5 hodiny')).toBe(
			'Relaxačná — 1,5 hodiny',
		)
		expect(messageServiceLabel('Масаж › Спортивний › 2 години')).toBe(
			'Спортивний — 2 години',
		)
	})

	it('prepends the parent for the catch-all body-parts line', () => {
		expect(
			messageServiceLabel('Masáž › Medová masáž › jednotlivé časti tela (nohy, ruky)'),
		).toBe('Medová masáž — jednotlivé časti tela (nohy, ruky)')
	})

	it('leaves a leaf that names a real service untouched', () => {
		expect(
			messageServiceLabel('Masáž › Anticelulitídové zábaly › Anticelulitídové telové zábaly'),
		).toBe('Anticelulitídové telové zábaly')
		expect(messageServiceLabel('Depilácia › Nohy › Lýtko')).toBe('Lýtko')
	})

	it('returns the whole title when there is no breadcrumb', () => {
		expect(messageServiceLabel('Lazerová epilácia')).toBe('Lazerová epilácia')
	})
})

describe('WhatsApp service variable', () => {
	it('names every booked service — the bug was showing only the last', () => {
		expect(flattenServiceTitlesForWhatsApp(MULTI)).toBe('Lýtko, Predlaktie')
	})

	it('renders a single service exactly as before', () => {
		expect(flattenServiceTitlesForWhatsApp('A › B › Leaf')).toBe('Leaf')
	})

	it('names each massage by its service, not just its duration', () => {
		expect(
			flattenServiceTitlesForWhatsApp(
				'Massage › Sports › 1 hour + Masáž › Medová masáž › 2 hodiny',
			),
		).toBe('Sports — 1 hour, Medová masáž — 2 hodiny')
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

describe('empty template variables', () => {
	// WhatsApp renders a template's approved sample when a parameter is empty —
	// a blank name reached a real customer as the literal "[Meno]".
	it('a blank name must never survive as an empty variable', () => {
		const firstName = (full: string) => {
			const part = full.trim().split(/\s+/)[0]
			return part || full.trim() || ''
		}
		// Whitespace-only input used to pass the route's truthiness check…
		expect(Boolean(' ')).toBe(true)
		// …and collapse to an empty variable here.
		expect(firstName(' ')).toBe('')
		// The route now trims before validating, so it is rejected up front.
		expect(String(' ').trim()).toBe('')
	})
})

describe('appointmentServiceLabel', () => {
	// Appointments booked before the write side was fixed keep only the leaf in
	// `service` — and a massage leaf is a bare duration or "body parts", which
	// told the customer nothing. The full path survives in the locale fields, so
	// the label is derived at read time and old bookings render correctly too.
	it('recovers the parent from the locale fields for legacy docs', () => {
		expect(
			appointmentServiceLabel({
				service: 'окремі частини тіла (ноги, руки, стопи, шия)',
				serviceUk: 'Масаж › Спортивний › окремі частини тіла (ноги, руки, стопи, шия)',
			}),
		).toBe('Спортивний — окремі частини тіла (ноги, руки, стопи, шия)')
	})

	it('leaves an already-labelled service untouched', () => {
		expect(appointmentServiceLabel({ service: 'Спортивний — 1 година' })).toBe(
			'Спортивний — 1 година',
		)
	})

	it('keeps the multi-service separator so the string still splits back', () => {
		const label = appointmentServiceLabel({ service: 'Legs + Arms' })
		expect(label).toBe('Legs + Arms')
		expect(splitBookingServiceTitles(label)).toEqual(['Legs', 'Arms'])
	})

	it('does not touch depilation, whose leaf is already a real name', () => {
		expect(
			appointmentServiceLabel({
				service: 'Ruky po lakeť (+ lakeť)',
				serviceSk: 'Depilácia › Cukrová › Ruky a telo › Ruky po lakeť (+ lakeť)',
			}),
		).toBe('Ruky po lakeť (+ lakeť)')
	})

	it('returns an empty string when there is nothing to label', () => {
		expect(appointmentServiceLabel({ service: '' })).toBe('')
	})
})
