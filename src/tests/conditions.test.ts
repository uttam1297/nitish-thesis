import { describe, expect, it } from "vitest";

import { isQuestionVisible } from "@/domain/interview/conditions";
import type { ResponseMap } from "@/domain/interview/types";

function responses(partial: ResponseMap): ResponseMap {
  return partial;
}

describe("conditional question visibility", () => {
  it("is always visible with no rules", () => {
    expect(isQuestionVisible(undefined, {})).toBe(true);
    expect(isQuestionVisible([], {})).toBe(true);
  });

  it("requires every rule to hold (AND)", () => {
    const rules = [
      {
        questionId: "q1",
        operator: "notEquals" as const,
        value: "engineering",
      },
      { questionId: "q4", operator: "gte" as const, value: 3 },
    ];
    const withBoth = responses({
      q1: {
        questionId: "q1",
        value: { kind: "choices", values: ["growth"] },
        method: "selected",
        skipped: false,
        updatedAt: "",
      },
      q4: {
        questionId: "q4",
        value: { kind: "scale", value: 4 },
        method: "selected",
        skipped: false,
        updatedAt: "",
      },
    });
    expect(isQuestionVisible(rules, withBoth)).toBe(true);

    const failsSecond = responses({
      ...withBoth,
      q4: {
        questionId: "q4",
        value: { kind: "scale", value: 1 },
        method: "selected",
        skipped: false,
        updatedAt: "",
      },
    });
    expect(isQuestionVisible(rules, failsSecond)).toBe(false);
  });

  it("hides the real Q7 rule for engineering-only respondents", () => {
    const rule = [
      {
        questionId: "q1",
        operator: "notEquals" as const,
        value: "engineering",
      },
    ];
    const engineeringOnly = responses({
      q1: {
        questionId: "q1",
        value: { kind: "choices", values: ["engineering"] },
        method: "selected",
        skipped: false,
        updatedAt: "",
      },
    });
    expect(isQuestionVisible(rule, engineeringOnly)).toBe(false);

    const mixedRole = responses({
      q1: {
        questionId: "q1",
        value: { kind: "choices", values: ["engineering", "growth"] },
        method: "selected",
        skipped: false,
        updatedAt: "",
      },
    });
    expect(isQuestionVisible(rule, mixedRole)).toBe(true);
  });

  it("evaluates the answered operator without a value", () => {
    const rule = [{ questionId: "q2", operator: "answered" as const }];
    expect(isQuestionVisible(rule, {})).toBe(false);
    expect(
      isQuestionVisible(
        rule,
        responses({
          q2: {
            questionId: "q2",
            value: { kind: "text", text: "Retail" },
            method: "typed",
            skipped: false,
            updatedAt: "",
          },
        })
      )
    ).toBe(true);
  });
});
