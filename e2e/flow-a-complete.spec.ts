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

/** Every question is required, so the flow answers Q2-Q4 rather than skipping them. */
async function answerProfileQuestions(page: Page) {
  await page.getByRole("radio", { name: "Retail / E-commerce" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "3-6 years" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator('label:has(input[name="q4"][value="3"])').click();
  await page.getByRole("button", { name: "Continue" }).click();
}

async function answerOpenQuestions(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    const textbox = page.getByRole("textbox", { name: "Your answer" });
    // Wait for the freshly mounted (empty) field so a fast fill() never
    // lands on the previous question mid exit-animation.
    await expect(textbox).toHaveValue("");
    await textbox.fill(
      `A substantive research answer with enough detail to pass validation, number ${index}.`
    );
    await page.getByRole("button", { name: "Continue" }).click();
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
  await answerProfileQuestions(page);

  await continueSection(page);
  await page
    .getByRole("textbox", { name: "Your answer" })
    .fill(
      "More AI-assisted comparison shopping on mobile, seen across several clients."
    );
  await page.getByRole("button", { name: "Continue" }).click();
  await answerOpenQuestions(page, 2);

  await continueSection(page);
  await answerOpenQuestions(page, 1);

  await continueSection(page);
  await answerOpenQuestions(page, 5);

  await continueSection(page);
  await answerOpenQuestions(page, 3);

  await expect(
    page.getByRole("heading", { name: "Review your answers" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you for taking part." })
  ).toBeVisible();
  await expect(page.getByText(/pseudonymous participant code/i)).toBeVisible();
  await expect(page.getByText(/^P\d{3}$/)).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("link", { name: /Nitish\.Narayan@student\.htw-berlin\.de/i })
  ).toBeVisible();
});
