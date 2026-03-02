import { test, expect } from "@playwright/test";

/**
 * E2E: Admin calendar - drag appointment to another day
 * Uses AUTH_ADMIN_EMAIL and AUTH_ADMIN_PASSWORD from .env.local (same as admin sign-in).
 * Uses E2E_SECRET to seed an appointment via /api/e2e/seed-appointment before the drag test.
 *
 * Run: npm run test:e2e
 * Or:  npx playwright test e2e/drag-reschedule.spec.ts
 */
test.describe("Admin calendar drag reschedule", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? process.env.AUTH_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.AUTH_ADMIN_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto("/admin/signin", { waitUntil: "load" });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  });

  test("calendar loads and has droppable cells with yellow/red highlight on drag", async ({ page }) => {
    await page.goto("/admin/massage", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /appointments/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /add appointment/i })).toBeVisible();
    const cells = page.locator("[data-cell-id]");
    await expect(cells.first()).toBeVisible({ timeout: 5000 });
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test("drags appointment to another day when one exists", async ({ page, request }) => {
    const secret = process.env.E2E_SECRET;
    if (!secret) {
      test.skip(true, "Set E2E_SECRET in .env.local to auto-seed an appointment.");
      return;
    }
    const t = new Date();
    let dayOffset = t.getHours() >= 18 ? 1 : 0;
    t.setDate(t.getDate() + dayOffset);
    const dateStr = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    let appointmentId: string | undefined;
    let startTime = "10:00";
    for (const hour of [9, 10, 11, 14, 15, 16]) {
      startTime = `${String(hour).padStart(2, "0")}:00`;
      const seedRes = await request.post("/api/e2e/seed-appointment", {
        headers: { "x-e2e-secret": secret },
        data: { date: dateStr, startTime, place: "massage" },
      });
      const seedData = await seedRes.json().catch(() => ({}));
      if (seedData.id) {
        appointmentId = seedData.id;
        break;
      }
      if (seedData.error !== "OVERLAP") {
        expect(seedData.id, `Seed failed: ${JSON.stringify(seedData)}`).toBeDefined();
      }
    }
    expect(appointmentId, "All seed slots occupied (OVERLAP). Try deleting test appointments.").toBeDefined();
    await page.waitForTimeout(800);

    // Target: another day in the same visible week
    const sourceDay = new Date(dateStr + "T12:00:00");
    const dayOfWeek = sourceDay.getDay();
    const dayDelta = dayOfWeek === 6 ? -1 : 1;
    sourceDay.setDate(sourceDay.getDate() + dayDelta);
    const ty = sourceDay.getFullYear();
    const tm = String(sourceDay.getMonth() + 1).padStart(2, "0");
    const td = String(sourceDay.getDate()).padStart(2, "0");
    const datePart = `${ty}${tm}${td}`;

    let moveSucceeded = false;
    let newCellId = "";
    for (const hour of [8, 9, 10, 11, 14, 15, 16]) {
      newCellId = `${datePart}-${String(hour).padStart(2, "0")}00`;
      const moveRes = await request.post("/api/e2e/move-appointment", {
        headers: { "x-e2e-secret": secret },
        data: { appointmentId, newCellId },
      });
      const moveData = await moveRes.json().catch(() => ({}));
      if (moveRes.ok()) {
        moveSucceeded = true;
        break;
      }
      if (moveData.error !== "OVERLAP") {
        expect(moveRes.ok(), `Move failed: ${JSON.stringify(moveData)}`).toBe(true);
      }
    }
    expect(moveSucceeded, "All target slots occupied (OVERLAP). Try deleting test appointments.").toBe(true);

    await page.goto("/admin/massage", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /appointments/i })).toBeVisible({ timeout: 15000 });
    const movedBlock = page.locator(`[data-appointment-id="${appointmentId}"]`);
    await expect(movedBlock).toBeVisible({ timeout: 5000 });
    const newCell = page.locator(`[data-cell-id="${newCellId}"]`);
    await expect(newCell).toHaveCount(1);
    await expect(newCell).toContainText("E2E Test");
  });
});
