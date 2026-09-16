import { describe, expect, it } from "vitest";

import { getQuestion } from "../research-metadata";
import type { ResearchDataSnapshot } from "../supabase/rows";

import { answerToReadable, validateResponseValue } from "./answers";
import {
  buildParticipantViewModels,
  buildQuestionSummaries,
  buildQuestionViewModels,
} from "./view-models";

const now = "2026-09-16T08:00:00.000Z";

function snapshot(
  roleValues: string[],
  overrides: Record<string, unknown> = {}
): ResearchDataSnapshot {
  const session = {
    id: "s1",
    participant_id: "p1",
    questionnaire_version_id: "v1",
    questionnaire_version: "1.3.0",
    response_mode: "asynchronous_form" as const,
    status: "in_progress" as const,
    current_question_id: "q5",
    progress_percentage: 25,
    study_stage: "main" as const,
    started_at: now,
    last_activity_at: now,
    completed_at: null,
    withdrawn_at: null,
    ...overrides,
  };
  return {
    studies: [],
    questionnaireVersions: [],
    participants: [
      {
        id: "p1",
        participant_code: "P002",
        role: "formatted",
        industry: "Retail",
        experience: "3-6 years",
        closeness_to_discovery: "4",
        created_at: now,
      },
    ],
    sessions: [session],
    responses: [
      {
        id: "r1",
        session_id: "s1",
        participant_id: "p1",
        question_id: "q1",
        question_version: "1",
        construct: "discovery-behaviour",
        response_type: "multi_select",
        response_value: { kind: "choices", values: roleValues },
        created_at: now,
        updated_at: now,
      },
    ],
    consents: [],
    refreshedAt: now,
  };
}

describe("response transformations", () => {
  it("validates every current response shape and renders option labels", () => {
    const q1 = getQuestion("1.3.0", "q1")!;
    const q2 = getQuestion("1.3.0", "q2")!;
    const q4 = getQuestion("1.3.0", "q4")!;
    const q5 = getQuestion("1.3.0", "q5")!;
    const multi = validateResponseValue(
      { kind: "choices", values: ["product", "engineering"] },
      q1
    );
    expect(multi.valid && answerToReadable(multi.answer, q1)).toBe(
      "Product / Product Management, Engineering / Technology"
    );
    const choice = validateResponseValue(
      { kind: "choice", value: "retail-ecommerce" },
      q2
    );
    expect(choice.valid && answerToReadable(choice.answer, q2)).toBe(
      "Retail / E-commerce"
    );
    expect(
      validateResponseValue({ kind: "scale", value: 4 }, q4)
    ).toMatchObject({ valid: true });
    expect(
      validateResponseValue(
        {
          kind: "text",
          text: "Detailed interview evidence from the participant.",
        },
        q5
      )
    ).toMatchObject({ valid: true });
  });

  it("supports Other without trusting malformed values", () => {
    const q2 = getQuestion("1.3.0", "q2")!;
    const other = validateResponseValue(
      { kind: "choice", value: "__other__", otherText: "Energy" },
      q2
    );
    expect(other.valid && answerToReadable(other.answer, q2)).toBe(
      "Other — Energy"
    );
    expect(
      validateResponseValue(
        { kind: "scale", value: 99 },
        getQuestion("1.3.0", "q4")!
      )
    ).toMatchObject({ valid: false });
  });
});

describe("participant view models", () => {
  it("uses the exact engineering-only Q7 denominator", () => {
    const engineeringOnly = buildParticipantViewModels(
      snapshot(["engineering"])
    )[0];
    expect(engineeringOnly.expectedCount).toBe(15);
    expect(engineeringOnly.hiddenQuestionIds).toEqual(["q7"]);
    const multiRole = buildParticipantViewModels(
      snapshot(["engineering", "product"])
    )[0];
    expect(multiRole.expectedCount).toBe(16);
  });

  it("distinguishes missing, conditional and withdrawn records", () => {
    const active = buildParticipantViewModels(snapshot(["engineering"]))[0];
    expect(
      active.responses.find((row) => row.question.id === "q7")?.state
    ).toBe("NOT_EXPECTED");
    expect(
      active.responses.find((row) => row.question.id === "q5")?.state
    ).toBe("MISSING");
    const withdrawn = buildParticipantViewModels(
      snapshot(["product"], { status: "withdrawn", withdrawn_at: now })
    )[0];
    expect(withdrawn.expectedCount).toBe(0);
    expect(withdrawn.responses.every((row) => row.state === "WITHDRAWN")).toBe(
      true
    );
  });

  it("keeps pilot and main sessions in one dataset", () => {
    const main = buildParticipantViewModels(snapshot(["product"]))[0];
    const pilot = buildParticipantViewModels(
      snapshot(["product"], { id: "s2", study_stage: "pilot" })
    )[0];
    // The dashboard exposes no stage control, so both must survive as data.
    expect(pilot.studyStage).toBe("pilot");
    expect(
      buildQuestionSummaries(buildQuestionViewModels([main, pilot])).find(
        (question) => question.questionId === "q1"
      )?.expectedParticipantCount
    ).toBe(2);
  });

  it("reads merged questions from the newest version that asks them", () => {
    const participant = buildParticipantViewModels(snapshot(["product"]))[0];
    const summaries = buildQuestionSummaries(
      buildQuestionViewModels([participant])
    );
    const q5 = summaries.find((question) => question.questionId === "q5");

    // The detail page takes its metadata from questionnaireVersions[0], so
    // the current questionnaire has to come first.
    expect(q5?.questionnaireVersions[0]).toBe("1.5.0");
    expect(q5?.retired).toBe(false);
  });

  it("marks questions the current questionnaire has dropped as retired", () => {
    const participant = buildParticipantViewModels(snapshot(["product"]))[0];
    const summaries = buildQuestionSummaries(
      buildQuestionViewModels([participant])
    );

    expect(
      summaries.find((question) => question.questionId === "q11")?.retired
    ).toBe(true);
    expect(
      summaries.find((question) => question.questionId === "q16")?.retired
    ).toBe(true);
  });

  it("merges a question across questionnaire versions into one row", () => {
    const older = buildParticipantViewModels(snapshot(["product"]))[0];
    const summaries = buildQuestionSummaries(buildQuestionViewModels([older]));
    const q1 = summaries.filter((question) => question.questionId === "q1");

    expect(q1).toHaveLength(1);
    expect(q1[0].questionnaireVersions.length).toBeGreaterThan(1);
    // Only the 1.3.0 session contributes a real participant.
    expect(q1[0].expectedParticipantCount).toBe(1);
  });
});

describe("one question set across questionnaire versions", () => {
  const withRetiredAnswer = () => {
    const base = snapshot(["product"]);
    return {
      ...base,
      responses: [
        ...base.responses,
        {
          id: "r2",
          session_id: "s1",
          participant_id: "p1",
          question_id: "q11",
          question_version: "1",
          construct: "organisational-response",
          response_type: "voice_or_text",
          response_value: {
            kind: "text",
            text: "Answer to a retired question.",
          },
          created_at: now,
          updated_at: now,
        },
      ],
    };
  };

  it("reports a 1.3.0 participant against the current question set", () => {
    const participant = buildParticipantViewModels(withRetiredAnswer())[0];

    expect(participant.questionnaireVersion).toBe("1.3.0");
    const canonicalIds = participant.canonicalResponses.map(
      (response) => response.question.id
    );
    expect(canonicalIds).not.toContain("q11");
    expect(canonicalIds).not.toContain("q16");
    expect(canonicalIds).toContain("q10");
    expect(canonicalIds).toContain("q17");
  });

  it("keeps a retired question's answer instead of dropping or folding it", () => {
    const participant = buildParticipantViewModels(withRetiredAnswer())[0];
    const retired = participant.supplementaryResponses;

    expect(retired.map((response) => response.question.id)).toEqual(["q11"]);
    expect(retired[0].readableAnswer).toBe("Answer to a retired question.");
    // Q11 repeated Q10's wording, so folding them together would invent an
    // answer Q10 never received.
    const q10 = participant.canonicalResponses.find(
      (response) => response.question.id === "q10"
    );
    expect(q10?.state).toBe("MISSING");
  });

  it("lists only answered retired questions, not unanswered ones", () => {
    const participant = buildParticipantViewModels(snapshot(["product"]))[0];
    expect(participant.supplementaryResponses).toEqual([]);
  });
});
