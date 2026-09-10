import { expect, test, type Page } from "@playwright/test";

/** See flow-d-admin.spec.ts for why this requires a real Supabase user. */
const EMAIL = process.env.E2E_SUPABASE_TEST_EMAIL;
const PASSWORD = process.env.E2E_SUPABASE_TEST_PASSWORD;

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

test("Flow E: researcher starts and runs a live interview session", async ({
  page,
}) => {
  await signInAsResearcher(page);
  await page.getByRole("link", { name: "Start live interview" }).click();

  await page.getByLabel("role").fill("VP Marketing");
  await page.getByLabel("industry").fill("Travel");
  await page.getByLabel("experience").fill("12 years");
  await page.getByLabel("closenessToDiscovery").fill("5");

  await page.getByRole("button", { name: "Create live session" }).click();
  const link = await page.locator("code").innerText();
  expect(link).toContain("/interview/resume?token=");

  await page.goto(link);
  await expect(page).toHaveURL(/\/interview$/);

  // The resume-by-link flow hydrates the same local draft used for
  // same-device resume, so it surfaces the same confirmation step.
  await expect(
    page.getByRole("heading", { name: "You have an unfinished session" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue previous session" }).click();

  await expect(
    page.getByRole("heading", { name: /which area best describes/i })
  ).toBeVisible();
});
