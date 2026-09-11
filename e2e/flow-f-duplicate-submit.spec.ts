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

test("Flow F: a duplicate final-submit request completes only one session", async ({
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
  await answerProfileQuestions(page);

  await continueSection(page);
  await answerOpenQuestions(page, 3);
  await continueSection(page);
  await answerOpenQuestions(page, 1);
  await continueSection(page);
  await answerOpenQuestions(page, 5);
  await continueSection(page);
  await answerOpenQuestions(page, 3);

  await expect(
    page.getByRole("heading", { name: "Review your answers" })
  ).toBeVisible();

  const submitted = page.waitForResponse(
    (response) =>
      response.url().includes("/api/interview/submit") && response.ok()
  );
  await page.getByRole("button", { name: "Submit" }).click();
  await submitted;
  await expect(
    page.getByRole("heading", { name: "Thank you for taking part." })
  ).toBeVisible();

  // Replay the exact same submit request the browser just made — this is
  // what a flaky-network retry looks like from the server's point of view.
  const identity = await page.evaluate(() =>
    window.localStorage.getItem("nitish-thesis-interview:session-identity:v1")
  );
  expect(identity).not.toBeNull();
  const { sessionId, resumeToken } = JSON.parse(identity!);

  const results = await page.evaluate(
    async ({ sessionId, resumeToken }) => {
      const responses = await Promise.all(
        [1, 2].map(() =>
          fetch("/api/interview/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, resumeToken }),
          }).then((r) => r.json())
        )
      );
      return responses;
    },
    { sessionId, resumeToken }
  );

  for (const result of results) {
    expect(result.success).toBe(true);
    expect(result.alreadyCompleted).toBe(true);
  }
});
