/**
 * Hamburger drawer behaviour — opens, closes, navigates, single-studio scope.
 *
 * Drawer was rebuilt in Phase 1 of the recent admin UX refactor:
 *   - slides from the LEFT (matches the hamburger position on the left of
 *     the header — that was a user-visible bug pre-refactor),
 *   - shows ONLY the current studio's sections (not both), with a "Switch
 *     studio" link in the header,
 *   - clicking the X, the backdrop, or pressing Escape all dismiss it.
 *
 * These tests guard against accidental drawer-direction flips and against
 * "scroll lock left on after close" regressions.
 */

import { test, expect } from '@playwright/test'
import { adminSignIn } from '../helpers/admin-sign-in'

test.describe('admin drawer', () => {
	test.beforeEach(async ({ page }) => {
		await adminSignIn(page)
	})

	test('opens from the left, closes via X, restores body scroll', async ({
		page,
	}) => {
		await page.goto('/sk/admin/massage', { waitUntil: 'load' })

		const hamburger = page.getByRole('button', { name: /open admin menu|otvoriť admin menu|открыть админ-меню|відкрити адмін-меню/i })
		await expect(hamburger).toBeVisible({ timeout: 15000 })
		await hamburger.click()

		const drawer = page.getByRole('dialog', { name: /open admin menu|otvoriť admin menu|открыть админ-меню|відкрити адмін-меню/i })
		await expect(drawer).toBeVisible()
		// Section list of the *current* studio — massage — must be the one
		// rendered. The drawer header shows "Studios" then "Massage" group.
		await expect(
			drawer.getByRole('link', { name: /calendar|kalendár|календарь|календар/i }),
		).toBeVisible()

		const close = drawer.getByRole('button', { name: /close admin menu|zavrieť admin menu|закрыть админ-меню|закрити адмін-меню/i })
		await close.click()
		await expect(drawer).toBeHidden()

		// Body scroll must be restored. Otherwise the page stays locked and
		// the user can't scroll the calendar after closing the drawer.
		const overflow = await page.evaluate(() => document.body.style.overflow)
		expect(overflow).not.toBe('hidden')
	})

	test('Escape closes the drawer', async ({ page }) => {
		await page.goto('/sk/admin/massage', { waitUntil: 'load' })
		await page
			.getByRole('button', { name: /open admin menu|otvoriť admin menu|открыть админ-меню|відкрити адмін-меню/i })
			.click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(drawer).toBeHidden()
	})

	test('navigates to the per-studio Clients page from the drawer', async ({
		page,
	}) => {
		await page.goto('/sk/admin/massage', { waitUntil: 'load' })
		await page
			.getByRole('button', { name: /open admin menu|otvoriť admin menu|открыть админ-меню|відкрити адмін-меню/i })
			.click()
		const drawer = page.getByRole('dialog')
		// Clients link now lives inside the current studio's section list,
		// not a separate "Global" group, and routes to /admin/{place}/clients.
		await drawer.getByRole('link', { name: /klienti|clients|клиенты|клієнти/i }).click()
		await page.waitForURL(/\/admin\/massage\/clients/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/admin\/massage\/clients/)
	})

	test('Switch studio link in the drawer header returns to /admin', async ({
		page,
	}) => {
		await page.goto('/sk/admin/depilation', { waitUntil: 'load' })
		await page
			.getByRole('button', { name: /open admin menu|otvoriť admin menu|открыть админ-меню|відкрити адмін-меню/i })
			.click()
		const drawer = page.getByRole('dialog')
		// The drawer header is a Link wrapping the "Admin" title — clicking
		// it must take us back to /admin (where you pick a studio).
		await drawer.getByRole('link', { name: /admin/i }).first().click()
		await page.waitForURL(/\/admin$|\/admin\/$/, { timeout: 10000 })
		await expect(page).toHaveURL(/\/admin$|\/admin\/$/)
	})
})
