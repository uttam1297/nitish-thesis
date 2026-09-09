import { expect, test } from "@playwright/test";

async function continueSection(page: import("@playwright/test").Page) {
  await expect(page.getByText("Next section")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

async function skipQuestions(
  page: import("@playwright/test").Page,
  count: number
) {
  for (let index = 0; index < count; index += 1) {
    await page.getByRole("button", { name: "Skip this question" }).click();
  }
}

test("participant completes the Phase 1 prototype", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /adapting b2c customer acquisition/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /begin the interview/i }).click();

  const consentContinue = page.getByRole("button", { name: "Continue" });
  await page
    .getByRole("checkbox", { name: /read and agree to all five statements/i })
    .check();
  await consentContinue.click();

  await continueSection(page);
  await page
    .getByRole("checkbox", { name: "Product / Product Management" })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await skipQuestions(page, 3);

  await continueSection(page);
  await page.getByRole("button", { name: "Speak answer" }).click();
  await page.getByRole("button", { name: /listening/i }).click();
  await expect(
    page.getByRole("button", { name: "Answer captured" })
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your answer" })
  ).not.toBeEmpty();
  await page.getByRole("button", { name: "Continue" }).click();
  await skipQuestions(page, 2);

  await continueSection(page);
  await skipQuestions(page, 2);

  await continueSection(page);
  await skipQuestions(page, 5);

  await continueSection(page);
  await skipQuestions(page, 4);

  await expect(
    page.getByRole("heading", { name: "Review your answers" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish prototype" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you for taking part." })
  ).toBeVisible();
  await expect(page.getByText(/did not store or transmit/i)).toBeVisible();
});
