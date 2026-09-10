import { expect, test, type Page } from "@playwright/test";

/**
 * Speech recognition is unavailable in headless CI (no microphone), so every
 * flow here disables it before the app boots and drives the interview by
 * typing. This keeps the flow deterministic; voice itself is covered by
 * flow-c-voice-fallback.spec.ts.
 */
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

async function continueSection(page: Page) {
  await expect(page.getByText("Next section")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

async function skipQuestions(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    await page.getByRole("button", { name: "Skip this question" }).click();
  }
}

test("Flow A: welcome -> consent -> profile -> complete -> review -> submit", async ({
  page,
}) => {
  await disableSpeechRecognition(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /adapting b2c customer acquisition/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /begin the interview/i }).click();

  await page
    .getByRole("checkbox", { name: /read and agree to all five statements/i })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();

  await continueSection(page);
  await page
    .getByRole("checkbox", { name: "Product / Product Management" })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await skipQuestions(page, 3);

  await continueSection(page);
  await page
    .getByRole("textbox", { name: "Your answer" })
    .fill("More AI-assisted comparison shopping on mobile.");
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
  await expect(page.getByText(/pseudonymous participant code/i)).toBeVisible();
});
