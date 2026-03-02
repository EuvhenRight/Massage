import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";

/**
 * Authenticate once and save session for reuse in tests.
 */
async function globalSetup() {
  const authDir = path.join(__dirname, ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  const authPath = path.join(authDir, "admin.json");

  const email = process.env.E2E_ADMIN_EMAIL ?? process.env.AUTH_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.AUTH_ADMIN_PASSWORD;
  if (!email || !password) {
    fs.writeFileSync(authPath, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005";
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.goto("/admin/signin", { waitUntil: "networkidle" });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await context.storageState({ path: authPath });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
