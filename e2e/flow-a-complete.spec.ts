import { expect, test, type Page } from "@playwright/test";

/**
 * This flow covers typing end to end, so voice capture is switched off before
 * the app boots: it keeps the run deterministic and stops CI from downloading
 * the speech model. That voice is offered — and optional — where the browser
 * supports it is covered by flow-c-voice-optional.spec.ts.
 */
async function disableVoiceInput(page: Page) {
  await page.addInitScript(() => {
    // Removing the Audio Worklet constructor is how a browser without local
    // speech support looks to the app: the microphone control never renders
    // and the speech model is never downloaded, keeping CI runs fast.
    Object.defineProperty(window, "AudioWorkletNode", {
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
  await disableVoiceInput(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /adapting b2c customer acquisition/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /get started/i }).click();

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
  await answerOpenQuestions(page, 4);

  await continueSection(page);
  await answerOpenQuestions(page, 2);

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
