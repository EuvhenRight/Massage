import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Per-test budget. Next.js dev mode compiles routes on first request — a
  // cold `/sk/admin/clients` hit can take 15-30 s before the HTML is served,
  // and the page then triggers Firebase subscriptions during hydration. 90 s
  // covers the first hit of every route used in the suite without masking
  // genuinely-stuck tests.
  timeout: 90000,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3007",
    trace: "on-first-retry",
    // Locator actions (.fill(), .click(), .toBeVisible()) — also need to
    // tolerate the cold-compile delay for the first-touched route.
    actionTimeout: 30000,
    // Page navigations (page.goto, waitForURL) — bumped to 60s so the very
    // first hit on a fresh dev server doesn't burn 50% of the test budget.
    navigationTimeout: 60000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3007",
    url: "http://localhost:3007",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
