import { test, expect } from "@playwright/test";

/**
 * The mobile booking bar is `position: fixed`, so the scrollable content must
 * reserve exactly its height or the bar sits on top of whatever is at the
 * bottom of the step.
 *
 * This regressed once already: the bar grew a cart strip above the CTA while
 * the content still reserved a constant sized for the old single-button bar,
 * and the strip covered the time picker on step 2 — the control the customer
 * has to tap to finish booking. Read-only: no Firestore writes, nothing to
 * clean up.
 */
test.describe("public booking — mobile bottom bar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("content reserves the bar's real height, not a stale constant", async ({ page }) => {
    await page.goto("/ru/depilation/booking", { waitUntil: "load" });

    // The layout renders an outer <main>; the flow's scroll area is nested.
    const content = page.locator("main main");
    await expect(content).toBeVisible({ timeout: 20000 });

    const bar = page.locator("div.md\\:hidden.fixed.inset-x-0.bottom-0").first();
    await expect(bar).toBeVisible({ timeout: 15000 });

    const barBox = (await bar.boundingBox())!;

    // The padding is driven by a ResizeObserver, so it settles a frame after
    // layout — poll rather than race it.
    await expect
      .poll(async () =>
        Math.round(
          await content.evaluate(el =>
            parseFloat(getComputedStyle(el).paddingBottom),
          ),
        ),
      )
      .toBe(Math.round(barBox.height));
  });

  test("desktop keeps no phantom padding (the bar is hidden there)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ru/depilation/booking", { waitUntil: "load" });
    const content = page.locator("main main");
    await expect(content).toBeVisible({ timeout: 20000 });
    await expect
      .poll(async () =>
        await content.evaluate(el =>
          parseFloat(getComputedStyle(el).paddingBottom),
        ),
      )
      .toBe(0);
  });
});
