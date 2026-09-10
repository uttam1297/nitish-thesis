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
  await skipQuestions(page, 3);

  await continueSection(page);
  await skipQuestions(page, 3);
  await continueSection(page);
  await skipQuestions(page, 2);
  await continueSection(page);
  await skipQuestions(page, 5);
  await continueSection(page);
  await skipQuestions(page, 4);

  await expect(
    page.getByRole("heading", { name: "Review your answers" })
  ).toBeVisible();

  const submitted = page.waitForResponse(
    (response) =>
      response.url().includes("/api/interview/submit") && response.ok()
  );
  await page.getByRole("button", { name: "Finish prototype" }).click();
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
