import { test, expect } from "@playwright/test";

/**
 * Smoke test - verifies the app loads.
 * Run: npx playwright test e2e/smoke.spec.ts
 *
 * Prerequisite: npm run dev must be running.
 * If your app runs on a different port (e.g. 3001), use:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/smoke.spec.ts
 */
test("app loads and sign-in page is reachable", async ({ page }) => {
  await page.goto("/admin/signin", { waitUntil: "domcontentloaded", timeout: 30000 });
  await expect(page.getByRole("heading", { name: /admin sign in/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
