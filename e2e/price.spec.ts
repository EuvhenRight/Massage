import { test, expect } from "@playwright/test";

/**
 * Price catalog API and depilation booking link tests.
 * Run: npx playwright test e2e/price.spec.ts
 * Prerequisite: npm run dev (or PLAYWRIGHT_BASE_URL set).
 */
test.describe("Depilation booking", () => {
  test("Depilation page links to booking", async ({ page }) => {
    await page.goto("/en/depilation", { waitUntil: "load", timeout: 60000 });
    // The page renders the booking CTA in three places — mobile-fixed bar
    // (`md:hidden`, so invisible on desktop viewport), hero block, and
    // mid-page section. We don't care which one Playwright picks: the
    // contract under test is "the depilation page links to the booking
    // page". Asserting count > 0 is the right granularity.
    const bookLinks = page.locator('a[href="/en/depilation/booking"]');
    expect(await bookLinks.count()).toBeGreaterThan(0);
  });

  test("Booking flow page renders step 1 (service catalog)", async ({ page }) => {
    // `networkidle` never fires here — the booking flow opens long-lived
    // Firestore listeners that keep traffic flowing. `load` is the right
    // milestone: HTML + JS bundles done.
    await page.goto("/en/depilation/booking", { waitUntil: "load", timeout: 60000 });
    // The price catalog renders a search input on step 1 — its presence
    // is a stable proxy for "the booking flow loaded and is interactive".
    // Going further into "click a service → next → calendar" is brittle
    // because the catalog UI evolves; the public-booking E2E suite in
    // Phase 4 covers the full flow against pinned fixtures instead.
    const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="hľad" i]').first();
    await expect(search).toBeVisible({ timeout: 30000 });
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
