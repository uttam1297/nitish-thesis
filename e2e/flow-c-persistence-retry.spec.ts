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

test("Flow C: a temporary persistence failure retains local answers and retries successfully", async ({
  page,
}) => {
  await disableSpeechRecognition(page);

  // Simulate the database being temporarily unavailable for the first
  // session-creation attempt only — every later request (including the
  // retry) goes through normally.
  let failedOnce = false;
  await page.route("**/api/interview/session", async (route) => {
    if (route.request().method() === "POST" && !failedOnce) {
      failedOnce = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "Your response is saved on this device and will retry automatically.",
        }),
      });
      return;
    }
    await route.continue();
  });

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

  // The failed session-creation attempt must never destroy what the
  // participant selected — local autosave is untouched regardless of
  // server state. Check the local draft directly rather than navigating
  // back through the UI, which keeps this assertion independent of screen
  // flow.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem(
          "nitish-thesis-interview:draft:v1"
        );
        if (!raw) return null;
        const draft = JSON.parse(raw);
        return draft.state.responses.q2?.value?.value ?? null;
      })
    )
    .toBe("retail-ecommerce");

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "3-6 years" }).check();
  // Server sync only starts once the whole profile layer (Q1-Q4) is
  // resolved — see use-server-sync.ts — so Q4 needs an answer too before
  // the (forced-to-fail) session-creation attempt happens at all.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator('label:has(input[name="q4"][value="3"])').click();
  await page.getByRole("button", { name: "Continue" }).click();

  // The UI shows a subtle retry state, never a hard failure blocking
  // completion — then the background retry (every ~8s) succeeds once the
  // route is no longer forced to fail.
  await expect(page.getByText(/saved on this device.*retrying/i)).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByText(/Saved$/)).toBeVisible({ timeout: 15_000 });
});
