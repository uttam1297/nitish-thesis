import { defineConfig, devices } from "@playwright/test";

const port = 3127;
const baseURL = `http://127.0.0.1:${port}`;

export const E2E_ADMIN_EMAIL = "researcher@example.com";
export const E2E_ADMIN_TEST_SECRET = "e2e-test-only-secret";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      // No GOOGLE_* vars: research data uses the in-memory Sheets fallback
      // for e2e runs, never a real spreadsheet.
      AUTH_SECRET: "e2e-test-only-auth-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      ADMIN_ALLOWED_EMAILS: E2E_ADMIN_EMAIL,
      ALLOW_ADMIN_TEST_LOGIN: "true",
      E2E_ADMIN_TEST_SECRET,
    },
  },
});
