/**
 * Multi-locale smoke for the public booking flow.
 *
 * For each of the 4 supported locales × 2 places (massage, depilation), we
 * verify that the booking flow's step 1 loads without runtime errors. This
 * is a *cheap* test (no Firestore writes, no Twilio interception) that
 * catches three categories of regression at once:
 *
 *   1. i18n key missing in a locale (build won't break, runtime will throw).
 *   2. Hydration error in a locale-specific code path.
 *   3. Route accidentally broken (404, 500) by an unrelated change.
 *
 * We do NOT click through step 2/3/4 here — that's covered by the
 * customer-form spec for one locale. Doing the full flow on 8 combinations
 * would be expensive and brittle.
 */

import { test, expect } from '@playwright/test'

const LOCALES = ['sk', 'en', 'ru', 'uk'] as const
const PLACES = ['massage', 'depilation'] as const

for (const locale of LOCALES) {
	for (const place of PLACES) {
		test(`booking page loads at /${locale}/${place}/booking without errors`, async ({
			page,
		}) => {
			const consoleErrors: string[] = []
			page.on('pageerror', err => consoleErrors.push(err.message))
			page.on('console', msg => {
				if (msg.type() === 'error') consoleErrors.push(msg.text())
			})

			await page.goto(`/${locale}/${place}/booking`, {
				waitUntil: 'load',
				timeout: 60000,
			})

			// Step 1 has a search input regardless of locale — the price
			// catalog's discovery affordance. Its presence proves the page
			// hydrated successfully.
			const search = page
				.locator(
					'input[type="search"], input[placeholder*="search" i], input[placeholder*="hľad" i], input[placeholder*="поиск" i], input[placeholder*="пошук" i]',
				)
				.first()
			await expect(search).toBeVisible({ timeout: 30000 })

			// Soft assertion: no JS runtime errors should have fired during
			// load. Some warnings are expected (dev mode protobufjs noise),
			// so we filter for `Error` level only via `pageerror`.
			expect(
				consoleErrors.filter(
					msg => !msg.includes('protobufjs') && !msg.includes('@protobufjs'),
				),
			).toHaveLength(0)
		})
	}
}
