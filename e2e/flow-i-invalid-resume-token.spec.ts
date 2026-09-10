import { expect, test } from "@playwright/test";

test("Flow I: an invalid resume token fails safely", async ({ page }) => {
  await page.goto("/interview/resume?token=this-token-does-not-exist");

  await expect(
    page.getByText(/no longer valid|could not resume/i)
  ).toBeVisible();
  // Never a raw Google/API error, and no crash/blank page.
  await expect(page.getByText(/google|stack|exception/i)).toHaveCount(0);
});

test("Flow I: a missing token fails safely", async ({ page }) => {
  await page.goto("/interview/resume");

  await expect(page.getByText(/missing its token/i)).toBeVisible();
});
