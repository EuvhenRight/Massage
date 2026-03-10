import { test, expect } from "@playwright/test";

/**
 * Price catalog API and depilation booking link tests.
 * Run: npx playwright test e2e/price.spec.ts
 * Prerequisite: npm run dev (or PLAYWRIGHT_BASE_URL set).
 */
test.describe("Depilation booking", () => {
  test("Depilation page links to booking", async ({ page }) => {
    await page.goto("/en/depilation", { waitUntil: "domcontentloaded", timeout: 30000 });
    const bookLink = page.getByRole("link", { name: /book.*depilation/i });
    await expect(bookLink).toBeVisible();
    await expect(bookLink).toHaveAttribute("href", /\/en\/depilation\/booking/);
  });

  test("Booking flow: step 1 choose service, step 2 shows calendar", async ({ page }) => {
    await page.goto("/en/depilation/booking", { waitUntil: "networkidle", timeout: 30000 });

    // Wait for content to load
    await page.waitForLoadState("domcontentloaded");

    // Step 1: click first service item (has price like "€" or "min")
    const serviceItem = page.locator('[role="button"], button').filter({ hasText: /€|min/ }).first();
    await serviceItem.click({ timeout: 8000 });

    // Next button should become enabled
    const nextBtn = page.getByRole("button", { name: /next/i });
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();

    // Step 2: calendar (PublicDatePicker) should be visible
    const calendar = page.getByRole("application", { name: /calendar/i });
    await expect(calendar).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Price catalog API", () => {
  test("GET price-catalog returns 200 and structure", async ({ request }) => {
    const res = await request.get("/api/price-catalog?place=depilation");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("man");
    expect(data).toHaveProperty("woman");
    expect(data.man).toHaveProperty("services");
    expect(data.woman).toHaveProperty("services");
    expect(Array.isArray(data.man.services)).toBe(true);
    expect(Array.isArray(data.woman.services)).toBe(true);
  });

  test("GET price-catalog with invalid place returns 400", async ({ request }) => {
    const res = await request.get("/api/price-catalog?place=invalid");
    expect(res.status()).toBe(400);
  });
});
