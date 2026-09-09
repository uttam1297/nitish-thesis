import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { QUESTIONNAIRE_VERSION, questionnaire } from "@/config/interview";
import { questionnaireSchema } from "@/domain/interview/schema";

function questionsFromMarkdown(): Map<string, string> {
  const source = readFileSync(
    resolve(process.cwd(), "question-set.md"),
    "utf8"
  );
  const matches = source.matchAll(/^Q\.?(\d+)\.?\s(.+)$/gm);
  return new Map(
    Array.from(matches, ([, number, prompt]) => [`Q${number}`, prompt])
  );
}

describe("questionnaire configuration", () => {
  it("passes schema validation", () => {
    expect(() => questionnaireSchema.parse(questionnaire)).not.toThrow();
    expect(questionnaire.version).toBe(QUESTIONNAIRE_VERSION);
  });

  it("contains Q1-Q18 in source order", () => {
    expect(questionnaire.questions.map((question) => question.id)).toEqual(
      Array.from({ length: 18 }, (_, index) => `q${index + 1}`)
    );
  });

  it("uses only verbatim prompts from question-set.md", () => {
    const sourceQuestions = questionsFromMarkdown();
    expect(sourceQuestions.size).toBe(18);
    for (const question of questionnaire.questions) {
      expect(question.prompt).toBe(
        sourceQuestions.get(question.researchMetadata.sourceRef)
      );
    }
  });

  it("preserves the Q1 options from question-set.md", () => {
    const first = questionnaire.questions[0];
    expect(first.responseType).toBe("multi_select");
    if (first.responseType !== "multi_select") return;
    expect(first.options.map((option) => option.label)).toEqual([
      "Product / Product Management",
      "Growth / Customer Acquisition",
      "Performance Marketing",
      "SEO / Organic Growth",
      "Product Marketing",
      "E-commerce",
      "CRM / Lifecycle / Retention",
      "Data / Analytics",
      "Digital Strategy",
      "Engineering / Technology",
    ]);
    expect(first.allowOther).toBe(true);
  });

  it("rejects duplicate question identifiers", () => {
    expect(() =>
      questionnaireSchema.parse({
        ...questionnaire,
        questions: [questionnaire.questions[0], questionnaire.questions[0]],
      })
    ).toThrow(/Duplicate question id/);
  });

  it("rejects a conditional rule referencing an unknown question", () => {
    const [first, ...rest] = questionnaire.questions;
    expect(() =>
      questionnaireSchema.parse({
        ...questionnaire,
        questions: [
          {
            ...first,
            visibleWhen: [
              { questionId: "does-not-exist", operator: "answered" },
            ],
          },
          ...rest,
        ],
      })
    ).toThrow(/unknown question/);
  });

  it("applies the real conditional rule that adapts Q7 for engineering-only respondents", () => {
    const q7 = questionnaire.questions.find((question) => question.id === "q7");
    expect(q7?.visibleWhen).toEqual([
      { questionId: "q1", operator: "notEquals", value: "engineering" },
    ]);
  });
});
