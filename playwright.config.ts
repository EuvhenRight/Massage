import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

/**
 * When the suite runs under `firebase emulators:exec` the Node side already
 * sees FIRESTORE_EMULATOR_HOST. The browser cannot, so the dev server is
 * handed NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST too — that is what keeps a real
 * browser from writing into the production database (see lib/firebase.ts).
 */
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
/** Separate port so an emulator run can never reuse a plain dev server. */
const PORT = emulatorHost ? 3008 : 3007;

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
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
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never reuse a server in emulator mode: an already-running dev server
    // would be pointed at the real project and the run would silently write
    // production data while claiming to be isolated.
    reuseExistingServer: !emulatorHost,
    timeout: 120000,
    env: emulatorHost
      ? { NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: emulatorHost }
      : undefined,
  },
});
