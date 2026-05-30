/**
 * Shared admin sign-in helper for Playwright specs.
 *
 *   import { adminSignIn } from '../helpers/admin-sign-in'
 *
 *   test.beforeEach(async ({ page }) => {
 *     await adminSignIn(page)  // throws test.skip() when creds aren't configured
 *   })
 *
 * Reads creds from `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` first, then falls
 * back to the project's `AUTH_ADMIN_EMAIL`/`AUTH_ADMIN_PASSWORD` so the same
 * local `.env.local` that powers the dev server can drive the tests.
 *
 * NOTE: the project's `e2e/global-setup.ts` stashes a storage state at
 * `e2e/.auth/admin.json` but the current playwright.config.ts does not
 * `use` it. To keep specs self-contained and resilient to that omission,
 * each spec authenticates inline via this helper.
 */

import { type Page, test } from '@playwright/test'

interface SignInOptions {
	/** Locale segment of the sign-in URL. Defaults to "sk" — matches the salon's primary language. */
	locale?: 'sk' | 'en' | 'ru' | 'uk'
	/** Expected landing URL after sign-in. Defaults to `/{locale}/admin`. */
	expectedRedirect?: RegExp
}

export async function adminSignIn(
	page: Page,
	options: SignInOptions = {},
): Promise<void> {
	const email = process.env.E2E_ADMIN_EMAIL ?? process.env.AUTH_ADMIN_EMAIL
	const password =
		process.env.E2E_ADMIN_PASSWORD ?? process.env.AUTH_ADMIN_PASSWORD
	if (!email || !password) {
		test.skip(
			true,
			'AUTH_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD not set — admin specs need them.',
		)
		return
	}

	const locale = options.locale ?? 'sk'
	const expectedRedirect = options.expectedRedirect ?? /\/admin(\?|$|\/)/

	// `waitUntil: 'load'` ensures the JS bundle finishes loading — the sign-in
	// form is rendered inside a <Suspense> boundary (see
	// `app/[locale]/admin/signin/page.tsx`), so on `'domcontentloaded'` we'd
	// only see the loading fallback and the email input would not yet exist.
	await page.goto(`/${locale}/admin/signin`, { waitUntil: 'load' })
	const emailInput = page.locator('input[name="email"]')
	await emailInput.waitFor({ state: 'visible' })
	await emailInput.fill(email)
	await page.locator('input[name="password"]').fill(password)
	await page.locator('form button[type="submit"]').click()
	await page.waitForURL(expectedRedirect, { timeout: 60000 })
}
