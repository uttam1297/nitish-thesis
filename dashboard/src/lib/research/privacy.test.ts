import { describe, expect, it } from "vitest";

import { getQuestion } from "../research-metadata";
import { buildPublicResponseRows, displayAnswer } from "./privacy";
import type { ParticipantViewModel } from "./view-models";

const secretNarrative = "private verbatim participant narrative";
const participant: ParticipantViewModel = {
  canonicalResponses: [],
  supplementaryResponses: [],
  participantCode: "P002",
  roles: [],
  industry: "",
  experience: "",
  discoveryCloseness: "",
  status: "completed",
  studyStage: "main",
  responseMode: "asynchronous_form",
  questionnaireVersion: "1.3.0",
  startedAt: "2026-09-16T00:00:00Z",
  lastActivityAt: "2026-09-16T00:00:00Z",
  completedAt: null,
  withdrawnAt: null,
  answeredCount: 1,
  expectedCount: 16,
  missingQuestionIds: [],
  hiddenQuestionIds: [],
  coverage: 1 / 16,
  consent: null,
  responses: [
    {
      question: getQuestion("1.3.0", "q5")!,
      state: "ANSWERED",
      readableAnswer: secretNarrative,
      answer: { kind: "text", text: secretNarrative },
    },
  ],
};

describe("public response projection", () => {
  it("removes narratives and raw JSON by default", () => {
    const rows = buildPublicResponseRows([participant], {
      showNarratives: false,
      showRawJson: false,
    });
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain(secretNarrative);
    expect(serialized).not.toContain("rawValue");
    expect(rows[0].readableAnswer).toBe("Narrative display disabled");
  });

  it("only exposes narrative raw data when both switches permit it", () => {
    const rawOnly = JSON.stringify(
      buildPublicResponseRows([participant], {
        showNarratives: false,
        showRawJson: true,
      })
    );
    expect(rawOnly).not.toContain(secretNarrative);
    const enabled = JSON.stringify(
      buildPublicResponseRows([participant], {
        showNarratives: true,
        showRawJson: true,
      })
    );
    expect(enabled).toContain(secretNarrative);
    expect(enabled).toContain("rawValue");
  });
});

describe("displayAnswer", () => {
  const withResponse = (
    response: ParticipantViewModel["responses"][number]
  ): ParticipantViewModel => ({ ...participant, responses: [response] });

  const notApplicable = {
    question: getQuestion("1.5.0", "q14")!,
    state: "NOT_APPLICABLE",
    readableAnswer: "Not applicable to participant experience",
    answer: { kind: "not_applicable", reason: "not_applicable" },
  } as const;

  it("reports a not-applicable answer as the choice the participant made", () => {
    expect(displayAnswer(notApplicable, { showNarratives: true })).toBe(
      "Not applicable to participant experience"
    );
  });

  it("keeps showing it when narratives are hidden — it carries no free text", () => {
    expect(displayAnswer(notApplicable, { showNarratives: false })).toBe(
      "Not applicable to participant experience"
    );
    const [row] = buildPublicResponseRows([withResponse(notApplicable)], {
      showNarratives: false,
      showRawJson: false,
    });
    expect(row.readableAnswer).toBe("Not applicable to participant experience");
    expect(row.readableAnswer).not.toBe("Unexpected stored response");
  });

  it("names each unresolved state instead of calling it unexpected", () => {
    const states = ["MISSING", "NOT_EXPECTED", "WITHDRAWN"] as const;
    for (const state of states) {
      const text = displayAnswer(
        { ...notApplicable, state, readableAnswer: null, answer: null },
        { showNarratives: true }
      );
      expect(text).not.toBe("Unexpected stored response");
    }
  });
});
