import { expect, test } from "@playwright/test";

test("Flow B: start -> answer -> refresh -> resume", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /begin the interview/i }).click();
  await page
    .getByRole("checkbox", { name: /read and agree to all five statements/i })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Next section")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByRole("checkbox", { name: "Product / Product Management" })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("radio", { name: "Retail / E-commerce" }).check();

  // Wait for the debounced autosave to persist this exact answer (not just
  // any earlier snapshot) before reloading.
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("nitish-thesis-interview:draft:v1");
    if (!raw) return false;
    const draft = JSON.parse(raw);
    return draft.state.responses.q2?.value?.value === "retail-ecommerce";
  });

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "You have an unfinished session" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue previous session" }).click();

  await expect(
    page.getByRole("radio", { name: "Retail / E-commerce" })
  ).toBeChecked();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Product / Product Management" })
  ).toBeChecked();
});

test("Flow B: start over discards the saved draft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /begin the interview/i }).click();
  await page
    .getByRole("checkbox", { name: /read and agree to all five statements/i })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForFunction(() =>
    window.localStorage.getItem("nitish-thesis-interview:draft:v1")
  );
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "You have an unfinished session" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();

  await expect(
    page.getByRole("button", { name: /begin the interview/i })
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("nitish-thesis-interview:draft:v1")
    )
  ).toBeNull();
});
