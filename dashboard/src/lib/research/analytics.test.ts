import { describe, expect, it } from "vitest";

import type { ParticipantViewModel } from "./view-models";
import { calculateDatasetMetrics } from "./analytics";
import { buildQuestionViewModels } from "./view-models";

function participant(
  overrides: Partial<ParticipantViewModel> = {}
): ParticipantViewModel {
  return {
    participantCode: "P002",
    roles: ["product"],
    industry: "Retail / E-commerce",
    experience: "3-6 years",
    discoveryCloseness: "4 of 5",
    status: "completed",
    studyStage: "main",
    responseMode: "asynchronous_form",
    questionnaireVersion: "1.3.0",
    startedAt: "2026-09-15T10:00:00Z",
    lastActivityAt: "2026-09-15T11:00:00Z",
    completedAt: "2026-09-15T11:00:00Z",
    withdrawnAt: null,
    answeredCount: 16,
    expectedCount: 16,
    missingQuestionIds: [],
    hiddenQuestionIds: [],
    coverage: 1,
    responses: [],
    consent: null,
    ...overrides,
  };
}

describe("deterministic dataset analytics", () => {
  it("uses expected answers as the dataset coverage denominator", () => {
    const metrics = calculateDatasetMetrics([
      participant(),
      participant({
        participantCode: "P003",
        answeredCount: 8,
        expectedCount: 16,
        status: "in_progress",
      }),
    ]);
    expect(metrics.storedResponses).toBe(24);
    expect(metrics.expectedResponses).toBe(32);
    expect(metrics.datasetCoverage).toBe(0.75);
    expect(metrics.completedSessions).toBe(1);
    expect(metrics.inProgressSessions).toBe(1);
  });

  it("excludes withdrawn sessions from response metrics", () => {
    const metrics = calculateDatasetMetrics([
      participant(),
      participant({
        participantCode: "P004",
        status: "withdrawn",
        answeredCount: 16,
        expectedCount: 16,
      }),
    ]);
    expect(metrics.totalParticipants).toBe(2);
    expect(metrics.withdrawnSessions).toBe(1);
    expect(metrics.storedResponses).toBe(16);
    expect(metrics.expectedResponses).toBe(16);
  });

  it("counts a multi-role participant once in every role", () => {
    const metrics = calculateDatasetMetrics([
      participant({ roles: ["product", "engineering"] }),
    ]);
    expect(metrics.roleDistribution.map((item) => item.count)).toEqual([1, 1]);
    expect(
      metrics.roleDistribution.reduce((sum, item) => sum + item.percentage, 0)
    ).toBe(2);
  });

  it("uses the expected-participant denominator for conditional question coverage", () => {
    const q7 = {
      ...participant(),
      participantCode: "P003",
      roles: ["product"],
      responses: [{ question: { id: "q7" }, state: "ANSWERED" }],
    } as unknown as ParticipantViewModel;
    const engineeringOnly = {
      ...participant(),
      participantCode: "P004",
      roles: ["engineering"],
      hiddenQuestionIds: ["q7"],
      responses: [{ question: { id: "q7" }, state: "NOT_EXPECTED" }],
    } as unknown as ParticipantViewModel;
    const question = buildQuestionViewModels([q7, engineeringOnly]).find(
      (item) => item.questionId === "q7"
    );
    expect(question).toMatchObject({
      expectedParticipantCount: 1,
      responseCount: 1,
      missingCount: 0,
      coverage: 1,
    });
  });
});
