import { expect, test, type Page } from "@playwright/test";

/**
 * The browser under test normally has no speech recognition at all, which
 * would hide the microphone for the wrong reason. Installing a working stub
 * proves the control is gone because questionnaire 1.5.0 retired voice input,
 * not because the API was missing.
 */
async function installSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    class StubSpeechRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      onresult: unknown = null;
      onerror: unknown = null;
      onend: unknown = null;
      start() {}
      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: StubSpeechRecognition,
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

test("Flow C: voice input is retired and typing completes the interview", async ({
  page,
}) => {
  await installSpeechRecognition(page);
  await page.goto("/");

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

  // Speech recognition is available in this browser, yet no microphone
  // control renders: 1.5.0 turned voice off, so the textarea is the only
  // way to answer.
  await expect(page.getByRole("button", { name: "Speak answer" })).toHaveCount(
    0
  );
  const answer = page.getByRole("textbox", { name: "Your answer" });
  await expect(answer).toBeVisible();
  await answer.fill(
    "Typed answer because the interview no longer offers voice."
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await answerOpenQuestions(page, 2);

  await continueSection(page);
  await answerOpenQuestions(page, 1);

  await continueSection(page);
  await answerOpenQuestions(page, 4);

  await continueSection(page);
  await answerOpenQuestions(page, 2);

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for taking part." })
  ).toBeVisible();
});
