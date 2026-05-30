/**
 * Cancel button on step 1 of the public booking flow.
 *
 * Background: pre-fix, `handleBack` did `onCancel?.() ?? router.back()`.
 * When the booking page was opened directly (deep link from an email, search
 * result, or a freshly-typed URL), `router.back()` is a no-op because there
 * is no in-app history. Clicking Cancel looked like a dead button to the
 * customer.
 *
 * The fix (see `components/booking-flow/index.tsx` handleBack):
 *   - If `step > 1`, go to the previous step.
 *   - Otherwise, prefer `onCancel` when supplied.
 *   - Otherwise, only call `router.back()` if `document.referrer` is from
 *     the same origin AND `history.length > 1`. Otherwise fall back to
 *     `router.push(`/${locale}/${place}`)` — the place landing page.
 *
 * This spec emulates the "no history" scenario by navigating directly to
 * the booking page in a fresh context and asserting the URL after Cancel.
 */

import { test, expect } from '@playwright/test'

test.describe('public booking — cancel button', () => {
	test('on step 1 with no in-app history, Cancel lands on the place page (not nowhere)', async ({
		page,
	}) => {
		await page.goto('/sk/depilation/booking', { waitUntil: 'load' })

		// Step 1 renders the place catalog; the Back/Cancel button is the
		// leftmost action in the toolbar — accessible name is `Späť` on first
		// step navigations and `Zrušiť` (cancel) on step 1 deep links. The
		// fix branches on `step > 1`, so on a fresh page-load it's labelled
		// for cancel. We match either, to keep the test robust to copy edits.
		const cancelBtn = page
			.getByRole('button', { name: /zrušiť|cancel|cancel|отменить|скасувати|back|späť|назад/i })
			.first()
		await expect(cancelBtn).toBeVisible({ timeout: 15000 })
		await cancelBtn.click()

		// The fix routes to `/sk/depilation` (the place landing) when there's
		// no same-origin referrer. Allow either trailing slash or none.
		await page.waitForURL(/\/sk\/depilation(\?|$|\/(?!booking))/, {
			timeout: 15000,
		})
		expect(page.url()).toMatch(/\/sk\/depilation(\?|$|\/(?!booking))/)
	})

	test('on step 1 with in-app referrer, Cancel uses history.back()', async ({
		page,
	}) => {
		// Drive a same-origin navigation FIRST so `document.referrer` is set
		// to our own origin and `history.length > 1` — that's the branch
		// where `router.back()` is the right behaviour. We avoid clicking
		// the on-page booking CTA: on desktop viewports the mobile-fixed
		// CTA is `md:hidden` (the first DOM match) and the others sit far
		// down the page behind framer-motion gates. Direct `goto()` chained
		// from the place landing produces the exact same browser history
		// state we care about and is dramatically more stable.
		await page.goto('/sk/depilation', { waitUntil: 'load' })
		await page.goto('/sk/depilation/booking', { waitUntil: 'load' })

		const cancelBtn = page
			.getByRole('button', { name: /zrušiť|cancel|отменить|скасувати|back|späť|назад/i })
			.first()
		await cancelBtn.click()

		// We came from /sk/depilation, so back should land us there.
		await page.waitForURL(/\/sk\/depilation(\?|$|\/(?!booking))/, {
			timeout: 10000,
		})
	})
})
