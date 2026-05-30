/**
 * Clients page (CRM) E2E — creates a brand-new client via the admin UI,
 * verifies the card persists, the search filter finds it, and the manual
 * "Send birthday now" path returns a controlled response.
 *
 * Why mocked send instead of real:
 *   - The "Send now" button POSTs to `/api/admin/clients/{phone}/send` which
 *     calls Twilio server-side. We don't want every E2E run to spend money
 *     on real WhatsApp messages.
 *   - Playwright's `page.route()` intercepts the browser → server hop so
 *     the server-side handler never executes. The UI flow (loading → toast)
 *     is still exercised end-to-end.
 *
 * Test data uses `uniqueTestPhone()` so concurrent runs don't collide. The
 * created `clients/{phone}` doc is left in Firestore — see
 * `e2e/helpers/test-data.ts` for the prefix convention used for cleanup.
 */

import { test, expect, type Locator } from '@playwright/test'
import { adminSignIn } from '../helpers/admin-sign-in'
import {
	uniqueTestEmail,
	uniqueTestName,
	uniqueTestPhone,
} from '../helpers/test-data'

/**
 * Wait for the create/edit modal to disappear after a save click. If it stays
 * open, the in-modal `saveError` `<span class="text-red-300">` text is read
 * and surfaced — that way a Firestore rejection, an unparseable phone, or a
 * duplicate-doc error shows up in the test failure message instead of the
 * generic "received: visible" output.
 */
async function expectModalClosedOrSurfaceError(modal: Locator): Promise<void> {
	const closed = await modal
		.waitFor({ state: 'hidden', timeout: 20000 })
		.then(() => true)
		.catch(() => false)
	if (closed) return
	const errText = await modal
		.locator('span.text-red-300')
		.textContent()
		.catch(() => null)
	throw new Error(
		`Client-card modal did not close after Save click. Visible saveError text: ${
			errText ? `"${errText.trim()}"` : '<none — modal stuck without error message>'
		}`,
	)
}

test.describe('admin clients (CRM)', () => {
	test.beforeEach(async ({ page }) => {
		await adminSignIn(page)
		// `waitUntil: 'load'` instead of 'domcontentloaded' — the page is a
		// client component that subscribes to Firestore on mount and only
		// paints the H1 after hydration. With cold dev compile in the mix,
		// 'domcontentloaded' returns 15-30 s before the heading exists.
		// Clients are now per-place — pick massage; the test covers the same
		// CRM flow either way. The new route shape is `/admin/{place}/clients`.
		await page.goto('/sk/admin/massage/clients', { waitUntil: 'load' })
		await expect(
			page.getByRole('heading', { name: /klienti|clients|клиенты|клієнти/i }),
		).toBeVisible({ timeout: 30000 })
	})

	test('creates a new client and finds it via the search box', async ({
		page,
	}) => {
		const phone = uniqueTestPhone()
		const firstName = uniqueTestName('E2E')
		const email = uniqueTestEmail()

		await page.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i }).click()

		const modal = page.getByRole('dialog')
		await expect(modal).toBeVisible()
		// Phone field is editable in create-mode, read-only in edit-mode.
		await modal.locator('input[type="tel"]').fill(phone)
		// Modal input order: 0 firstName, 1 lastName, 2 phone (tel), 3 email,
		// 4 birthday (date), 5 tag draft. We fill the first text input — that's
		// firstName per the layout in `AdminClientCardModal.tsx`.
		await modal.locator('input').first().fill(firstName)
		await modal.locator('input[type="email"]').fill(email)

		const saveBtn = modal
			.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i })
		await saveBtn.click()

		// Modal closes on successful create. If it stays open the helper reads
		// the in-modal error message to make the failure self-explanatory.
		await expectModalClosedOrSurfaceError(modal)

		// New client appears in the list — search by the unique phone slice.
		// The list renders BOTH a desktop <table> and a mobile-card stack; CSS
		// hides one per breakpoint, but both live in the DOM. Scope to <tr>
		// to pick the visible desktop row only (Playwright's default viewport
		// is Desktop Chrome 1280×720).
		const searchTerm = phone.slice(-6)
		await page
			.getByPlaceholder(/hľadať|search|поиск|пошук/i)
			.fill(searchTerm)
		const row = page.locator('tbody tr', { hasText: phone })
		await expect(row).toBeVisible({ timeout: 5000 })
		await expect(row).toContainText(firstName)
	})

	test('"Send birthday now" button uses the API endpoint and surfaces a toast', async ({
		page,
	}) => {
		const phone = uniqueTestPhone()
		const firstName = uniqueTestName('E2E')

		// 1. Create the client via the UI.
		await page
			.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i })
			.click()
		const createModal = page.getByRole('dialog')
		await createModal.locator('input[type="tel"]').fill(phone)
		await createModal
			.locator('input')
			.filter({ hasNotText: '' })
			.first()
			.fill(firstName)
		// Birthday must be set, otherwise the send-now button is disabled.
		await createModal.locator('input[type="date"]').fill('1992-05-17')
		// Marketing opt-in must also be on — the button is disabled without it.
		const optInLabel = createModal.getByText(
			/marketing|narodeniny|поздравления|привітання/i,
		).first()
		await optInLabel.click()
		await createModal
			.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i })
			.click()
		await expectModalClosedOrSurfaceError(createModal)

		// 2. Open the just-created client.
		await page
			.getByPlaceholder(/hľadať|search|поиск|пошук/i)
			.fill(phone.slice(-6))
		// Target the desktop table row, not the (hidden) mobile card.
		await page.locator('tbody tr', { hasText: phone }).click()

		const editModal = page.getByRole('dialog')
		await expect(editModal).toBeVisible()

		// 3. Mock the server-side send endpoint so we never actually call Twilio.
		await page.route(
			`**/api/admin/clients/${encodeURIComponent(phone)}/send`,
			route =>
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ ok: true, status: 'sent' }),
				}),
		)
		// Auto-accept the native confirm() dialog.
		page.once('dialog', dialog => {
			dialog.accept().catch(() => {
				/* ignore */
			})
		})
		await editModal
			.getByRole('button', { name: /odoslať želanie|send birthday|поздравление|привітання/i })
			.click()

		// 4. Success banner appears inside the modal.
		await expect(
			editModal.getByText(/správa odoslaná|message sent|сообщение отправлено|повідомлення надіслано/i),
		).toBeVisible({ timeout: 5000 })
	})

	test('client card opens in read-only-phone mode for existing clients', async ({
		page,
	}) => {
		const phone = uniqueTestPhone()
		const firstName = uniqueTestName('E2E')

		await page
			.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i })
			.click()
		const createModal = page.getByRole('dialog')
		await createModal.locator('input[type="tel"]').fill(phone)
		await createModal
			.locator('input')
			.filter({ hasNotText: '' })
			.first()
			.fill(firstName)
		await createModal
			.getByRole('button', { name: /nový klient|new client|новый клиент|новий клієнт/i })
			.click()
		await expectModalClosedOrSurfaceError(createModal)

		await page
			.getByPlaceholder(/hľadať|search|поиск|пошук/i)
			.fill(phone.slice(-6))
		// Target the desktop table row, not the (hidden) mobile card.
		await page.locator('tbody tr', { hasText: phone }).click()

		const editModal = page.getByRole('dialog')
		const phoneInput = editModal.locator('input[type="tel"]')
		await expect(phoneInput).toBeVisible()
		await expect(phoneInput).toHaveAttribute('readonly', '')
	})
})
