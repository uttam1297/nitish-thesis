import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  QUESTIONNAIRE_VERSION,
  questionnaire,
  questionnaireV130,
  questionnaireV140,
} from "@/config/interview";
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

  it("has a migration that activates the configured questionnaire version", () => {
    const migrationDirectory = resolve(process.cwd(), "supabase/migrations");
    const migrations = readdirSync(migrationDirectory)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) =>
        readFileSync(resolve(migrationDirectory, fileName), "utf8")
      );

    expect(
      migrations.some(
        (migration) =>
          migration.includes(`select id, '${QUESTIONNAIRE_VERSION}',`) &&
          migration.includes(
            "on conflict (study_id, version) do update set is_active = true"
          )
      )
    ).toBe(true);
  });

  it("contains expected questions in source order (Q9, Q18, Q11 and Q16 removed)", () => {
    const removed = ["q9", "q18", "q11", "q16"];
    const expectedIds = Array.from(
      { length: 18 },
      (_, i) => `q${i + 1}`
    ).filter((id) => !removed.includes(id));
    expect(questionnaire.questions.map((question) => question.id)).toEqual(
      expectedIds
    );
  });

  it("keeps Q11 and Q16 in the versions that actually asked them", () => {
    for (const version of [questionnaireV130, questionnaireV140]) {
      const ids = version.questions.map((question) => question.id);
      expect(ids).toContain("q11");
      expect(ids).toContain("q16");
    }
  });

  it("keeps voice input available alongside typing in every version", () => {
    const narrative = (item: typeof questionnaire) =>
      item.questions.filter(
        (question) => question.responseType === "voice_or_text"
      );

    expect(
      narrative(questionnaire).every((question) => question.allowVoice)
    ).toBe(true);
    expect(
      narrative(questionnaireV140).every((question) => question.allowVoice)
    ).toBe(true);
  });

  it("adds not-applicable to narrative questions after 1.3", () => {
    const previous = questionnaireV130.questions.filter(
      (question) => question.responseType === "voice_or_text"
    );
    const current = questionnaire.questions.filter(
      (question) => question.responseType === "voice_or_text"
    );

    expect(previous.every((question) => !question.allowNotApplicable)).toBe(
      true
    );
    expect(current.every((question) => question.allowNotApplicable)).toBe(true);
  });

  it("uses only verbatim prompts from question-set.md", () => {
    const sourceQuestions = questionsFromMarkdown();
    expect(sourceQuestions.size).toBe(14);
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
