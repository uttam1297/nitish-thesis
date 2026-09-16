import { describe, expect, it } from "vitest";

import { questionnaireV130, researchConstructs } from "./questionnaire-v1-3-0";
import { questionnaireV140 } from "./questionnaire-v1-4-0";
import {
  getExpectedQuestionIds,
  getQuestion,
  getQuestionIds,
  getQuestionnaire,
  isQuestionExpected,
  supportedQuestionnaireVersions,
} from "./questionnaires";

const version = "1.3.0";
const expectedQuestionIds = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q10",
  "q11",
  "q12",
  "q13",
  "q14",
  "q15",
  "q16",
  "q17",
];

describe("questionnaire 1.3.0 catalogue", () => {
  it("contains exactly the 16 current questions in source order", () => {
    expect(questionnaireV130.questions).toHaveLength(16);
    expect(getQuestionIds(version)).toEqual(expectedQuestionIds);
    expect(getQuestion(version, "q9")).toBeUndefined();
    expect(getQuestion(version, "q18")).toBeUndefined();
  });

  it("keeps Q10 and Q11 as distinct questions despite identical wording", () => {
    const q10 = getQuestion(version, "q10");
    const q11 = getQuestion(version, "q11");

    expect(q10?.id).toBe("q10");
    expect(q11?.id).toBe("q11");
    expect(q10).not.toBe(q11);
    expect(q10?.wording).toBe(q11?.wording);
    expect(q10?.hint).not.toBe(q11?.hint);
  });

  it("marks every current question as required", () => {
    expect(
      questionnaireV130.questions.every((question) => question.required)
    ).toBe(true);
  });

  it("defines every core response as voice-or-text with a trimmed 20-character minimum", () => {
    const coreQuestions = questionnaireV130.questions.slice(4);

    for (const question of coreQuestions) {
      expect(question.responseType).toBe("voice_or_text");
      if (question.responseType !== "voice_or_text") continue;
      expect(question.responseShape).toEqual({ kind: "text", text: "string" });
      expect(question.validation.minimumNonWhitespaceCharacters).toBe(20);
      expect(question.input).toEqual({ voice: true, text: true });
    }
  });

  it("preserves response-shape semantics for Q1 through Q4", () => {
    expect(getQuestion(version, "q1")?.responseShape.kind).toBe("choices");
    expect(getQuestion(version, "q2")?.responseShape.kind).toBe("choice");
    expect(getQuestion(version, "q3")?.responseShape.kind).toBe("choice");
    expect(getQuestion(version, "q4")?.responseShape.kind).toBe("scale");
  });
});

describe("profile option parity", () => {
  it("preserves Q1 option slugs and labels plus Other semantics", () => {
    const q1 = getQuestion(version, "q1");
    expect(q1?.responseType).toBe("multi_select");
    if (q1?.responseType !== "multi_select") return;

    expect(q1.options).toEqual([
      { value: "product", label: "Product / Product Management" },
      { value: "growth", label: "Growth / Customer Acquisition" },
      { value: "performance-marketing", label: "Performance Marketing" },
      { value: "seo", label: "SEO / Organic Growth" },
      { value: "product-marketing", label: "Product Marketing" },
      { value: "e-commerce", label: "E-commerce" },
      { value: "crm", label: "CRM / Lifecycle / Retention" },
      { value: "data", label: "Data / Analytics" },
      { value: "digital-strategy", label: "Digital Strategy" },
      { value: "engineering", label: "Engineering / Technology" },
    ]);
    expect(q1.otherOption).toEqual({
      enabled: true,
      value: "__other__",
      requiresText: true,
    });
    expect(q1.validation).toEqual({ minimumSelections: 1 });
  });

  it("preserves Q2 sector options and select-with-Other semantics", () => {
    const q2 = getQuestion(version, "q2");
    expect(q2?.responseType).toBe("single_select");
    if (q2?.responseType !== "single_select") return;

    expect(q2.options).toContainEqual({
      value: "retail-ecommerce",
      label: "Retail / E-commerce",
    });
    expect(q2.options).toContainEqual({
      value: "financial-services",
      label: "Financial Services / Fintech",
    });
    expect(q2.options).toContainEqual({
      value: "education",
      label: "Education",
    });
    expect(q2.otherOption?.value).toBe("__other__");
  });

  it("preserves all Q3 experience-band slugs and labels", () => {
    const q3 = getQuestion(version, "q3");
    expect(q3?.responseType).toBe("single_select");
    if (q3?.responseType !== "single_select") return;

    expect(q3.options).toEqual([
      { value: "under-1", label: "Under 1 year" },
      { value: "1-3", label: "1-3 years" },
      { value: "3-6", label: "3-6 years" },
      { value: "6-10", label: "6-10 years" },
      { value: "10-plus", label: "10+ years" },
    ]);
    expect(q3.otherOption).toBeUndefined();
  });

  it("preserves the Q4 1–5 scale and anchors", () => {
    const q4 = getQuestion(version, "q4");
    expect(q4?.responseType).toBe("likert_scale");
    if (q4?.responseType !== "likert_scale") return;

    expect(q4.scale).toEqual({
      minimum: 1,
      maximum: 5,
      minimumLabel: "Not closely",
      maximumLabel: "Very closely",
    });
  });
});

describe("Q7 expected-question routing", () => {
  it.each([
    { roles: ["engineering"], expected: false, count: 15 },
    { roles: ["engineering", "product"], expected: true, count: 16 },
    { roles: ["product"], expected: true, count: 16 },
    { roles: ["growth"], expected: true, count: 16 },
    { roles: ["__other__"], expected: true, count: 16 },
    { roles: ["engineering", "__other__"], expected: true, count: 16 },
  ])("handles Q1 roles $roles", ({ roles, expected, count }) => {
    const context = {
      questionnaireVersion: version,
      q1Response: { kind: "choices" as const, values: roles },
    };

    expect(isQuestionExpected("q7", context)).toBe(expected);
    expect(getExpectedQuestionIds(context)).toHaveLength(count);
  });

  it("encodes the exact source rule rather than a broad engineering exclusion", () => {
    expect(getQuestion(version, "q7")?.visibility).toEqual({
      questionId: "q1",
      operator: "notEquals",
      value: "engineering",
      semantics: "not-exactly-one-selected-value",
    });
  });
});

describe("version-aware registry", () => {
  it("advertises both preserved and current metadata versions", () => {
    expect(supportedQuestionnaireVersions).toEqual(["1.3.0", "1.4.0"]);
    expect(getQuestionnaire("1.3.0")).toBe(questionnaireV130);
    expect(getQuestionnaire("1.4.0")).toBe(questionnaireV140);
  });

  it("rejects unknown versions instead of silently falling back", () => {
    expect(() => getQuestionnaire("1.2.0")).toThrow(
      "Unsupported questionnaire version: 1.2.0"
    );
  });
});

describe("research constructs", () => {
  it("preserves all ten construct identifiers and their source order", () => {
    expect(researchConstructs.map((construct) => construct.id)).toEqual([
      "discovery-behaviour",
      "journey-evidence",
      "ai-use-and-channels",
      "competitive-risk",
      "exposure-and-consequences",
      "organisational-response",
      "prioritisation",
      "governance",
      "measurement",
      "capability-requirements",
    ]);
    expect(researchConstructs.map((construct) => construct.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("preserves representative question-to-construct mappings", () => {
    expect(getQuestion(version, "q7")?.construct).toBe("ai-use-and-channels");
    expect(getQuestion(version, "q12")?.construct).toBe("prioritisation");
    expect(getQuestion(version, "q14")?.construct).toBe("governance");
    expect(getQuestion(version, "q15")?.construct).toBe("measurement");
    expect(getQuestion(version, "q17")?.construct).toBe(
      "capability-requirements"
    );
  });
});
