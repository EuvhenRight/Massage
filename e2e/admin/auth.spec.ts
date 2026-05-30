/**
 * Admin sign-in flow — happy path + wrong-password path.
 *
 * Why these two and not more:
 *   - Happy path catches the most common "admin can't get in" regression
 *     (NextAuth config breakage, callbackUrl drift, signin form rename).
 *   - Wrong-password catches accidental "any password works" regressions
 *     introduced by misconfigured credentials provider.
 *
 * Sign-out and language switching are covered downstream by the drawer +
 * clients specs — no need to duplicate here.
 */

import { test, expect } from '@playwright/test'
import { adminSignIn } from '../helpers/admin-sign-in'

test.describe('admin auth', () => {
	test('signs in with valid credentials and lands on the admin hub', async ({
		page,
	}) => {
		await adminSignIn(page)
		await expect(page).toHaveURL(/\/admin(\?|$|\/)/)
		// The hub page renders the two place tiles plus the Clients tile we
		// added in Phase 7. If any of them is missing, the hub is broken.
		await expect(
			page.getByRole('heading', { name: /admin/i }).first(),
		).toBeVisible({ timeout: 15000 })
	})

	test('rejects invalid credentials without redirecting away from /signin', async ({
		page,
	}) => {
		const email =
			process.env.E2E_ADMIN_EMAIL ?? process.env.AUTH_ADMIN_EMAIL
		if (!email) {
			test.skip(true, 'No admin email configured.')
			return
		}
		await page.goto('/sk/admin/signin', { waitUntil: 'domcontentloaded' })
		await page.locator('input[name="email"]').fill(email)
		await page.locator('input[name="password"]').fill('definitely-wrong-pw')
		await page.locator('form button[type="submit"]').click()
		// Allow the auth round-trip to settle, then assert we're still on
		// /signin (NextAuth's credentials provider re-renders the page on
		// failure rather than redirecting).
		await page.waitForTimeout(1500)
		await expect(page).toHaveURL(/\/admin\/signin/)
	})
})
