import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3007",
    trace: "on-first-retry",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3007",
    url: "http://localhost:3007",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
