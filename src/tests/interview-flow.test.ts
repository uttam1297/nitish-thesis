import { describe, expect, it } from "vitest";

import { questionnaire } from "@/config/interview";
import {
  buildTimeline,
  calculateProgress,
  nextStepId,
  previousStepId,
  unansweredRequiredQuestions,
} from "@/domain/interview/flow";
import type { ResponseMap } from "@/domain/interview/types";

const firstAnswer: ResponseMap = {
  q1: {
    questionId: "q1",
    value: { kind: "choices", values: ["product"] },
    method: "selected",
    skipped: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("Phase 1 interview flow", () => {
  it("builds a linear one-question-at-a-time timeline", () => {
    const ids = buildTimeline(questionnaire, {}).map((step) => step.id);
    expect(ids.slice(0, 4)).toEqual([
      "welcome",
      "consent",
      "section:about-you",
      "q1",
    ]);
    expect(ids.at(-2)).toBe("review");
    expect(ids.at(-1)).toBe("complete");
    expect(ids.filter((id) => /^q\d+$/.test(id))).toHaveLength(16);
  });

  it("navigates by stable step id", () => {
    const timeline = buildTimeline(questionnaire, {});
    expect(nextStepId(timeline, "welcome")).toBe("consent");
    expect(previousStepId(timeline, "consent")).toBe("welcome");
  });

  it("calculates progress and required answers", () => {
    expect(calculateProgress(questionnaire, firstAnswer, "q2")).toMatchObject({
      resolved: 1,
      total: 16,
      percent: 6,
      position: 2,
    });
    expect(unansweredRequiredQuestions(questionnaire, {})).toHaveLength(16);
    expect(
      unansweredRequiredQuestions(questionnaire, firstAnswer)
    ).toHaveLength(15);
  });

  it("removes a conditionally hidden question from the timeline and progress total", () => {
    const engineeringOnly: ResponseMap = {
      q1: {
        questionId: "q1",
        value: { kind: "choices", values: ["engineering"] },
        method: "selected",
        skipped: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    };

    const ids = buildTimeline(questionnaire, engineeringOnly).map(
      (step) => step.id
    );
    expect(ids).not.toContain("q7");
    expect(ids.filter((id) => /^q\d+$/.test(id))).toHaveLength(15);

    expect(calculateProgress(questionnaire, engineeringOnly, "q6").total).toBe(
      15
    );
  });
});
