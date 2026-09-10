import { expect, test, type Page } from "@playwright/test";

/**
 * Requires a real Supabase Auth user in the project configured via
 * NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (see
 * playwright.config.ts) — Supabase Auth is an external service, not
 * something the in-memory database fallback can stand in for. Create one
 * researcher test account in the Supabase dashboard (Authentication ->
 * Users -> Add user) and export its credentials before running this file;
 * it skips itself otherwise rather than failing noisily. See README
 * "Testing the admin area".
 */
const EMAIL = process.env.E2E_SUPABASE_TEST_EMAIL;
const PASSWORD = process.env.E2E_SUPABASE_TEST_PASSWORD;

async function disableSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    });
  });
}

async function signInAsResearcher(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("you@example.com").fill(EMAIL!);
  await page.getByPlaceholder("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Research overview" })
  ).toBeVisible();
}

test.skip(
  !EMAIL || !PASSWORD,
  "Set E2E_SUPABASE_TEST_EMAIL/E2E_SUPABASE_TEST_PASSWORD to a real Supabase Auth user to run this flow."
);

test("Flow D: researcher logs in, views a session and its responses", async ({
  page,
}) => {
  await disableSpeechRecognition(page);
  await page.goto("/");
  await page.getByRole("button", { name: /begin the interview/i }).click();
  await page
    .getByRole("checkbox", { name: /read and agree to all five statements/i })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Next section")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Profile layer (Q1-Q4): every question is required, and the server
  // session is only created once all four have an answer.
  await page
    .getByRole("checkbox", { name: "Product / Product Management" })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Retail / E-commerce" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "3-6 years" }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  const sessionCreated = page.waitForResponse(
    (response) =>
      response.url().includes("/api/interview/session") &&
      response.request().method() === "POST" &&
      response.ok()
  );
  await page.locator('label:has(input[name="q4"][value="3"])').click();
  await page.getByRole("button", { name: "Continue" }).click();
  await sessionCreated;

  await signInAsResearcher(page);
  await expect(page.getByText("Retail").first()).toBeVisible();
  await page.getByRole("link", { name: "View", exact: true }).first().click();

  await expect(page.getByText(/Role \/ industry \/ experience/)).toBeVisible();
});
