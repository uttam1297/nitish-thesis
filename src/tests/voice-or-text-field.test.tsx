import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VoiceOrTextField } from "@/components/interview/response/voice-or-text-field";
import { questionnaire } from "@/config/interview";

describe("VoiceOrTextField not-applicable option", () => {
  it("emits a structured answer and disables the text field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = questionnaire.questions.find((item) => item.id === "q5");
    if (!question || question.responseType !== "voice_or_text") {
      throw new Error("Expected Q5 to be a voice-or-text question.");
    }

    render(
      <VoiceOrTextField
        question={question}
        value={{ kind: "text", text: "" }}
        onChange={onChange}
        labelledBy="question"
        invalid={false}
      />
    );

    await user.click(
      screen.getByLabelText(/this question is not applicable to my experience/i)
    );

    expect(onChange).toHaveBeenCalledWith(
      { kind: "not_applicable", reason: "not_applicable" },
      "selected"
    );
  });
});
