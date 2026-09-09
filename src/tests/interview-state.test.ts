import { describe, expect, it } from "vitest";

import { questionnaire } from "@/config/interview";
import { validateAnswer } from "@/domain/interview/answers";
import {
  createInitialState,
  interviewReducer,
  type InterviewAction,
} from "@/domain/interview/reducer";
import type { InterviewState } from "@/domain/interview/types";

function reduce(
  state: InterviewState,
  ...actions: InterviewAction[]
): InterviewState {
  return actions.reduce(
    (current, action) => interviewReducer(current, action, questionnaire),
    state
  );
}

describe("in-memory Phase 1 state", () => {
  it("records answers and preserves them during navigation", () => {
    const state = reduce(
      createInitialState(questionnaire),
      {
        type: "answer",
        questionId: "q2",
        value: { kind: "text", text: "Retail" },
        method: "typed",
      },
      { type: "go_to_step", stepId: "q3" },
      { type: "back" }
    );
    expect(state.responses.q2.value).toEqual({ kind: "text", text: "Retail" });
  });

  it("returns to review after editing", () => {
    const state = reduce(
      createInitialState(questionnaire),
      { type: "go_to_step", stepId: "q2", fromReview: true },
      { type: "next" }
    );
    expect(state.currentStepId).toBe("review");
  });

  it("requires only Q1 and validates its Other field", () => {
    const first = questionnaire.questions[0];
    expect(validateAnswer(first, null)).toMatch(/answer/i);
    expect(
      validateAnswer(first, { kind: "choices", values: ["__other__"] })
    ).toMatch(/Other/);
    expect(validateAnswer(questionnaire.questions[1], null)).toBeNull();
  });

  it("finishes without persisting or submitting externally", () => {
    const state = reduce(createInitialState(questionnaire), { type: "submit" });
    expect(state.status).toBe("submitted");
    expect(state.currentStepId).toBe("complete");
    expect(state.submittedAt).not.toBeNull();
  });

  it("restores a previously saved state verbatim, for resuming a draft", () => {
    const saved = reduce(createInitialState(questionnaire), {
      type: "answer",
      questionId: "q2",
      value: { kind: "text", text: "Retail" },
      method: "typed",
    });

    const restored = reduce(createInitialState(questionnaire), {
      type: "restore",
      state: saved,
    });
    expect(restored).toEqual(saved);
  });
});
