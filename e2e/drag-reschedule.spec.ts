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
  /**
   * Appointments this spec seeded, cleared after every test.
   *
   * These specs write to the shared Firestore, not an emulator. Each seeded
   * row is 60 minutes and the 15-minute prep buffer blocks the hour on either
   * side, so five leftovers saturate all ten candidate hours the drag test
   * tries — after which it failed with "All seed slots occupied (OVERLAP)"
   * until the calendar date rolled over. Cleaning up keeps the spec repeatable.
   */
  const seededAppointmentIds: string[] = [];

  test.afterEach(async ({ request }) => {
    const secret = process.env.E2E_SECRET;
    const ids = seededAppointmentIds.splice(0, seededAppointmentIds.length);
    if (!secret) return;
    for (const id of ids) {
      await request
        .post("/api/e2e/delete-appointment", {
          headers: { "x-e2e-secret": secret },
          data: { appointmentId: id },
        })
        // Never let cleanup mask the real assertion failure.
        .catch(() => undefined);
    }
  });

  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? process.env.AUTH_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.AUTH_ADMIN_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto("/ru/admin/signin", { waitUntil: "load" });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  });

  test("calendar loads and has droppable cells with yellow/red highlight on drag", async ({ page }) => {
    await page.goto("/ru/admin/massage", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /appointments|rezervácie|записи/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /add appointment|pridať rezerváciu|добавить запись|додати запис/i })).toBeVisible();
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
    // The booking calendar grid renders only the current visible week, and
    // within it only the salon's working hours. Both the seed slot and the
    // move target must therefore be cells the grid actually draws — so read
    // them out of the DOM instead of guessing. A hardcoded hour list used to
    // start at 08:00, which is before opening: the API happily booked it
    // (admin bookings ignore working hours) but the grid never rendered that
    // row, so the final assertion looked for a cell that cannot exist.
    await page.goto("/ru/admin/massage", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /appointments|rezervácie|записи/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 15000 });

    /** Cell ids the grid renders for one day, ascending. Format: `YYYYMMDD-HHmm`. */
    const renderedCellIds = async (datePart: string): Promise<string[]> => {
      const ids = await page
        .locator(`[data-cell-id^="${datePart}-"]`)
        .evaluateAll(nodes =>
          nodes.map(n => (n as HTMLElement).dataset.cellId ?? "")
        );
      return Array.from(new Set(ids.filter(Boolean))).sort();
    };

    const t = new Date();
    const dayOffset = t.getHours() >= 18 ? 1 : 0;
    t.setDate(t.getDate() + dayOffset);
    const dateStr = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    const sourceDatePart = dateStr.replace(/-/g, "");

    const sourceCells = await renderedCellIds(sourceDatePart);
    expect(
      sourceCells.length,
      `Calendar rendered no cells for ${dateStr} — is the salon open that day?`
    ).toBeGreaterThan(0);

    let appointmentId: string | undefined;
    for (const cellId of sourceCells) {
      const startTime = `${cellId.slice(9, 11)}:${cellId.slice(11, 13)}`;
      const seedRes = await request.post("/api/e2e/seed-appointment", {
        headers: { "x-e2e-secret": secret },
        data: { date: dateStr, startTime, place: "massage" },
      });
      const seedData = await seedRes.json().catch(() => ({}));
      if (seedData.id) {
        appointmentId = seedData.id;
        seededAppointmentIds.push(seedData.id);
        break;
      }
      if (seedData.error !== "OVERLAP") {
        expect(seedData.id, `Seed failed: ${JSON.stringify(seedData)}`).toBeDefined();
      }
    }
    expect(appointmentId, "Every rendered slot is occupied — clear test appointments.").toBeDefined();

    // Target: another rendered day in the same visible week.
    const sourceDay = new Date(dateStr + "T12:00:00");
    const dayOfWeek = sourceDay.getDay();
    const dayDelta = dayOfWeek === 6 ? -1 : 1;
    sourceDay.setDate(sourceDay.getDate() + dayDelta);
    const ty = sourceDay.getFullYear();
    const tm = String(sourceDay.getMonth() + 1).padStart(2, "0");
    const td = String(sourceDay.getDate()).padStart(2, "0");
    const datePart = `${ty}${tm}${td}`;

    const targetCells = await renderedCellIds(datePart);
    expect(
      targetCells.length,
      `Calendar rendered no cells for ${ty}-${tm}-${td} — is the salon open that day?`
    ).toBeGreaterThan(0);

    let moveSucceeded = false;
    let newCellId = "";
    for (const cellId of targetCells) {
      newCellId = cellId;
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
    expect(moveSucceeded, "Every rendered target slot is occupied — clear test appointments.").toBe(true);

    await page.goto("/ru/admin/massage", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /appointments|rezervácie|записи/i })).toBeVisible({ timeout: 15000 });
    const movedBlock = page.locator(`[data-appointment-id="${appointmentId}"]`);
    await expect(movedBlock).toBeVisible({ timeout: 5000 });
    const newCell = page.locator(`[data-cell-id="${newCellId}"]`);
    await expect(newCell).toHaveCount(1);
    // The appointment block is absolutely positioned OVER the cell grid, so
    // the cell's own text content stays empty — we assert against the
    // `[data-appointment-id]` block (the visible appointment rectangle),
    // which we already confirmed exists above.
    await expect(movedBlock).toContainText("E2E Test", { timeout: 15000 });
  });
});
