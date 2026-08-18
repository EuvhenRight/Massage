import { test, expect } from "@playwright/test";

/**
 * The back button's wording must describe what the next press actually does.
 *
 * Step 1 hosts the whole catalog tree (sex → service → section → zone), and a
 * press there usually walks one level up rather than leaving. The label used to
 * be derived from the step number alone, so the entire time a customer was
 * browsing services the button read "Cancel" on an action that merely went
 * back — it looked like pressing it would throw the booking away.
 *
 * Read-only: no Firestore writes, nothing to clean up.
 */
test.describe("public booking — back button label", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("says Cancel only when the press really leaves the booking", async ({ page }) => {
    await page.goto("/ru/depilation/booking", { waitUntil: "load" });

    const backBtn = page.locator("main main button").first();
    await expect(backBtn).toBeVisible({ timeout: 20000 });

    // Top of the catalog: there is nowhere to go back to, so leaving is honest.
    await expect(backBtn).toHaveText(/Отмена/, { timeout: 15000 });

    // One level in, the press walks back up the tree — it must not say Cancel.
    await page.getByRole("button", { name: "Женщина", exact: true }).click();
    await expect(backBtn).toHaveText(/Назад/, { timeout: 10000 });

    // Walking back out returns to the top, and the wording returns with it.
    await backBtn.click();
    await expect(backBtn).toHaveText(/Отмена/, { timeout: 10000 });
  });

  test("says Back on the date step", async ({ page }) => {
    await page.goto("/ru/depilation/booking", { waitUntil: "load" });
    const backBtn = page.locator("main main button").first();
    await expect(backBtn).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Женщина", exact: true }).click();
    await page.getByRole("button", { name: /^Далее$/ }).click();
    await expect(backBtn).toHaveText(/Назад/, { timeout: 15000 });
  });
});
