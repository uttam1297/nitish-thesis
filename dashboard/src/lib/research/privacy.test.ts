import { describe, expect, it } from "vitest";

import { getQuestion } from "../research-metadata";
import { buildPublicResponseRows } from "./privacy";
import type { ParticipantViewModel } from "./view-models";

const secretNarrative = "private verbatim participant narrative";
const participant: ParticipantViewModel = {
  participantCode: "P002", roles: [], industry: "", experience: "", discoveryCloseness: "", status: "completed", studyStage: "main", responseMode: "asynchronous_form", questionnaireVersion: "1.3.0", startedAt: "2026-09-16T00:00:00Z", lastActivityAt: "2026-09-16T00:00:00Z", completedAt: null, withdrawnAt: null, answeredCount: 1, expectedCount: 16, missingQuestionIds: [], hiddenQuestionIds: [], coverage: 1 / 16, consent: null,
  responses: [{ question: getQuestion("1.3.0", "q5")!, state: "ANSWERED", readableAnswer: secretNarrative, answer: { kind: "text", text: secretNarrative } }],
};

describe("public response projection", () => {
  it("removes narratives and raw JSON by default", () => {
    const rows = buildPublicResponseRows([participant], { showNarratives: false, showRawJson: false });
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain(secretNarrative);
    expect(serialized).not.toContain("rawValue");
    expect(rows[0].readableAnswer).toBe("Narrative display disabled");
  });

  it("only exposes narrative raw data when both switches permit it", () => {
    const rawOnly = JSON.stringify(buildPublicResponseRows([participant], { showNarratives: false, showRawJson: true }));
    expect(rawOnly).not.toContain(secretNarrative);
    const enabled = JSON.stringify(buildPublicResponseRows([participant], { showNarratives: true, showRawJson: true }));
    expect(enabled).toContain(secretNarrative);
    expect(enabled).toContain("rawValue");
  });
});
