import { expect, test, type Page } from "@playwright/test";

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

test("Flow C: voice unavailable falls back to typing and still completes", async ({
  page,
}) => {
  await disableSpeechRecognition(page);
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
  await skipQuestions(page, 3);

  await continueSection(page);

  // The first core question offers voice on a supported browser. With
  // speech recognition disabled, no microphone control renders at all and
  // the textarea is the only way to answer.
  await expect(page.getByRole("button", { name: "Speak answer" })).toHaveCount(
    0
  );
  const answer = page.getByRole("textbox", { name: "Your answer" });
  await expect(answer).toBeVisible();
  await answer.fill("Typed answer because voice input is unavailable here.");
  await page.getByRole("button", { name: "Continue" }).click();
  await skipQuestions(page, 2);

  await continueSection(page);
  await skipQuestions(page, 2);

  await continueSection(page);
  await skipQuestions(page, 5);

  await continueSection(page);
  await skipQuestions(page, 4);

  await page.getByRole("button", { name: "Finish prototype" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for taking part." })
  ).toBeVisible();
});
