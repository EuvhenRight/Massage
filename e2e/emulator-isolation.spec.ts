import { test, expect } from "@playwright/test";

/**
 * The e2e suite must never touch a real Firebase project.
 *
 * It used to: the browser bundle cannot see `FIRESTORE_EMULATOR_HOST` (that is
 * a Node-only convention), so while Vitest ran safely against the emulator,
 * Playwright drove a real browser that read and wrote production data — and an
 * interrupted run left rows behind. `lib/firebase.ts` now connects to the
 * emulator when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is set, and
 * `playwright.config.ts` passes it to the dev server.
 *
 * This test watches actual network traffic, because the guarantee is only
 * worth anything if it holds at runtime.
 */
test.describe("emulator isolation", () => {
  test.skip(
    !process.env.FIRESTORE_EMULATOR_HOST,
    "Only meaningful under `npm run test:e2e` (emulator mode).",
  );

  test("the browser talks to the emulator and never to the real project", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", r => urls.push(r.url()));

    await page.goto("/ru/depilation/booking", { waitUntil: "load" });
    // Rendering the catalog proves a Firestore read actually completed.
    await expect(
      page.getByRole("button", { name: "Женщина", exact: true }),
    ).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(2000);

    const emulator = urls.filter(u => u.includes(":8080"));
    const realProject = urls.filter(u => /firestore\.googleapis\.com/.test(u));

    expect(emulator.length).toBeGreaterThan(0);
    expect(realProject).toEqual([]);
  });
});
