import { describe, expect, it } from "vitest";

import { getQuestion } from "../research-metadata";
import type { ResearchDataSnapshot } from "../supabase/rows";

import { answerToReadable, validateResponseValue } from "./answers";
import { buildParticipantViewModels, expectedQuestionCount, filterParticipantsByStage } from "./view-models";

const now = "2026-09-16T08:00:00.000Z";

function snapshot(roleValues: string[], overrides: Record<string, unknown> = {}): ResearchDataSnapshot {
  const session = {
    id: "s1", participant_id: "p1", questionnaire_version_id: "v1", questionnaire_version: "1.3.0",
    response_mode: "asynchronous_form" as const, status: "in_progress" as const, current_question_id: "q5",
    progress_percentage: 25, study_stage: "main" as const, started_at: now, last_activity_at: now,
    completed_at: null, withdrawn_at: null, ...overrides,
  };
  return {
    studies: [], questionnaireVersions: [],
    participants: [{ id: "p1", participant_code: "P002", role: "formatted", industry: "Retail", experience: "3-6 years", closeness_to_discovery: "4", created_at: now }],
    sessions: [session],
    responses: [{ id: "r1", session_id: "s1", participant_id: "p1", question_id: "q1", question_version: "1", construct: "discovery-behaviour", response_type: "multi_select", response_value: { kind: "choices", values: roleValues }, optional_elaboration: null, created_at: now, updated_at: now }],
    consents: [], refreshedAt: now,
  };
}

describe("response transformations", () => {
  it("validates every current response shape and renders option labels", () => {
    const q1 = getQuestion("1.3.0", "q1")!;
    const q2 = getQuestion("1.3.0", "q2")!;
    const q4 = getQuestion("1.3.0", "q4")!;
    const q5 = getQuestion("1.3.0", "q5")!;
    const multi = validateResponseValue({ kind: "choices", values: ["product", "engineering"] }, q1);
    expect(multi.valid && answerToReadable(multi.answer, q1)).toBe("Product / Product Management, Engineering / Technology");
    const choice = validateResponseValue({ kind: "choice", value: "retail-ecommerce" }, q2);
    expect(choice.valid && answerToReadable(choice.answer, q2)).toBe("Retail / E-commerce");
    expect(validateResponseValue({ kind: "scale", value: 4 }, q4)).toMatchObject({ valid: true });
    expect(validateResponseValue({ kind: "text", text: "Detailed interview evidence from the participant." }, q5)).toMatchObject({ valid: true });
  });

  it("supports Other without trusting malformed values", () => {
    const q2 = getQuestion("1.3.0", "q2")!;
    const other = validateResponseValue({ kind: "choice", value: "__other__", otherText: "Energy" }, q2);
    expect(other.valid && answerToReadable(other.answer, q2)).toBe("Other — Energy");
    expect(validateResponseValue({ kind: "scale", value: 99 }, getQuestion("1.3.0", "q4")!)).toMatchObject({ valid: false });
  });
});

describe("participant view models", () => {
  it("uses the exact engineering-only Q7 denominator", () => {
    expect(expectedQuestionCount(["engineering"])).toBe(15);
    expect(expectedQuestionCount(["engineering", "product"])).toBe(16);
    const engineeringOnly = buildParticipantViewModels(snapshot(["engineering"]))[0];
    expect(engineeringOnly.expectedCount).toBe(15);
    expect(engineeringOnly.hiddenQuestionIds).toEqual(["q7"]);
    const multiRole = buildParticipantViewModels(snapshot(["engineering", "product"]))[0];
    expect(multiRole.expectedCount).toBe(16);
  });

  it("distinguishes missing, conditional and withdrawn records", () => {
    const active = buildParticipantViewModels(snapshot(["engineering"]))[0];
    expect(active.responses.find((row) => row.question.id === "q7")?.state).toBe("NOT_EXPECTED");
    expect(active.responses.find((row) => row.question.id === "q5")?.state).toBe("MISSING");
    const withdrawn = buildParticipantViewModels(snapshot(["product"], { status: "withdrawn", withdrawn_at: now }))[0];
    expect(withdrawn.expectedCount).toBe(0);
    expect(withdrawn.responses.every((row) => row.state === "WITHDRAWN")).toBe(true);
  });

  it("defaults analytical filtering to main while preserving pilot", () => {
    const main = buildParticipantViewModels(snapshot(["product"]))[0];
    const pilot = buildParticipantViewModels(snapshot(["product"], { id: "s2", study_stage: "pilot" }))[0];
    expect(filterParticipantsByStage([main, pilot])).toEqual([main]);
    expect(filterParticipantsByStage([main, pilot], "pilot")).toEqual([pilot]);
  });
});
