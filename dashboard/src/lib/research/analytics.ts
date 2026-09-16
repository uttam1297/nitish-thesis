import { getQuestion, getResearchConstruct } from "../research-metadata";
import type { ResearchDataSnapshot } from "../supabase/rows";
import type { ParticipantViewModel, QuestionViewModel } from "./view-models";

export type DistributionItem = Readonly<{
  label: string;
  count: number;
  percentage: number;
}>;

export type DatasetMetrics = Readonly<{
  totalParticipants: number;
  completedSessions: number;
  inProgressSessions: number;
  withdrawnSessions: number;
  mainSessions: number;
  pilotSessions: number;
  storedResponses: number;
  expectedResponses: number;
  datasetCoverage: number;
  statusDistribution: readonly DistributionItem[];
  stageDistribution: readonly DistributionItem[];
  modeDistribution: readonly DistributionItem[];
  versionDistribution: readonly DistributionItem[];
  roleDistribution: readonly DistributionItem[];
  industryDistribution: readonly DistributionItem[];
  experienceDistribution: readonly DistributionItem[];
  closenessDistribution: readonly DistributionItem[];
  timeline: readonly Readonly<{ date: string; count: number }>[];
  latestActivity: string | null;
}>;

export type IntegrityObservation = Readonly<{
  code: string;
  severity: "info" | "warning";
  count: number;
  message: string;
}>;

function distribution(
  values: readonly string[],
  denominator = values.length
): DistributionItem[] {
  const counts = new Map<string, number>();
  for (const value of values)
    counts.set(
      value || "Not recorded",
      (counts.get(value || "Not recorded") ?? 0) + 1
    );
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percentage: denominator ? count / denominator : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function roleLabels(participant: ParticipantViewModel): string[] {
  const question = getQuestion(participant.questionnaireVersion, "q1");
  if (!question || question.responseType !== "multi_select")
    return [...participant.roles];
  const response = participant.responses.find(
    (item) => item.question.id === "q1"
  );
  const otherText =
    response?.answer?.kind === "choices"
      ? response.answer.otherText
      : undefined;
  return participant.roles.map((role) =>
    role === "__other__"
      ? otherText
        ? `Other — ${otherText}`
        : "Other"
      : (question.options.find((option) => option.value === role)?.label ??
        role)
  );
}

export function calculateDatasetMetrics(
  participants: readonly ParticipantViewModel[]
): DatasetMetrics {
  const eligible = participants.filter(
    (participant) => participant.status !== "withdrawn"
  );
  const expectedResponses = eligible.reduce(
    (sum, participant) => sum + participant.expectedCount,
    0
  );
  const storedResponses = eligible.reduce(
    (sum, participant) => sum + participant.answeredCount,
    0
  );
  const values = (selector: (participant: ParticipantViewModel) => string) =>
    eligible.map(selector);
  const timelineCounts = new Map<string, number>();
  for (const participant of participants) {
    const date = participant.startedAt.slice(0, 10);
    timelineCounts.set(date, (timelineCounts.get(date) ?? 0) + 1);
  }

  return {
    totalParticipants: participants.length,
    completedSessions: participants.filter(
      (participant) => participant.status === "completed"
    ).length,
    inProgressSessions: participants.filter(
      (participant) =>
        participant.status === "started" || participant.status === "in_progress"
    ).length,
    withdrawnSessions: participants.filter(
      (participant) => participant.status === "withdrawn"
    ).length,
    mainSessions: participants.filter(
      (participant) => participant.studyStage === "main"
    ).length,
    pilotSessions: participants.filter(
      (participant) => participant.studyStage === "pilot"
    ).length,
    storedResponses,
    expectedResponses,
    datasetCoverage: expectedResponses
      ? storedResponses / expectedResponses
      : 0,
    statusDistribution: distribution(
      participants.map((participant) => participant.status)
    ),
    stageDistribution: distribution(
      participants.map((participant) => participant.studyStage)
    ),
    modeDistribution: distribution(
      participants.map((participant) => participant.responseMode)
    ),
    versionDistribution: distribution(
      participants.map((participant) => participant.questionnaireVersion)
    ),
    roleDistribution: distribution(
      eligible.flatMap(roleLabels),
      eligible.length
    ),
    industryDistribution: distribution(
      values((participant) => participant.industry)
    ),
    experienceDistribution: distribution(
      values((participant) => participant.experience)
    ),
    closenessDistribution: distribution(
      values((participant) => participant.discoveryCloseness)
    ),
    timeline: [...timelineCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    latestActivity:
      participants
        .map((participant) => participant.lastActivityAt)
        .sort()
        .at(-1) ?? null,
  };
}

export function categoricalDistribution(
  question: QuestionViewModel
): DistributionItem[] {
  const values = question.responses.flatMap(({ response }) => {
    if (response.answer?.kind === "choice")
      return [response.readableAnswer ?? response.answer.value];
    if (response.answer?.kind === "choices") {
      const metadata = response.question;
      return response.answer.values.map((value) => {
        if (metadata.responseType !== "multi_select") return value;
        if (value === "__other__")
          return response.answer?.kind === "choices" &&
            response.answer.otherText
            ? `Other — ${response.answer.otherText}`
            : "Other";
        return (
          metadata.options.find((option) => option.value === value)?.label ??
          value
        );
      });
    }
    if (response.answer?.kind === "scale")
      return [String(response.answer.value)];
    return [];
  });
  return distribution(values, question.responseCount);
}

export function runIntegrityChecks(
  snapshot: ResearchDataSnapshot,
  participants: readonly ParticipantViewModel[]
): IntegrityObservation[] {
  const duplicateCount = (values: readonly string[]) =>
    values.length - new Set(values).size;
  const sessionIds = new Set(snapshot.sessions.map((row) => row.id));
  const participantIds = new Set(snapshot.participants.map((row) => row.id));
  const responsePairs = snapshot.responses.map(
    (row) => `${row.session_id}:${row.question_id}`
  );
  const unknownQuestions = snapshot.responses.filter(
    (row) => !getQuestion("1.3.0", row.question_id)
  ).length;
  const unexpectedConstructs = snapshot.responses.filter(
    (row) => !getResearchConstruct("1.3.0", row.construct)
  ).length;
  const orphaned = snapshot.responses.filter(
    (row) =>
      !sessionIds.has(row.session_id) || !participantIds.has(row.participant_id)
  ).length;
  const malformed = participants
    .flatMap((participant) => participant.responses)
    .filter((response) => response.state === "UNEXPECTED").length;

  const checks = [
    [
      "duplicate-participant-code",
      duplicateCount(snapshot.participants.map((row) => row.participant_code)),
      "Duplicate participant codes",
    ],
    [
      "duplicate-response",
      duplicateCount(responsePairs),
      "Duplicate session/question response pairs",
    ],
    [
      "orphaned-response",
      orphaned,
      "Orphaned or mismatched response relationships",
    ],
    ["unknown-question", unknownQuestions, "Unknown question IDs"],
    [
      "unexpected-construct",
      unexpectedConstructs,
      "Unexpected research constructs",
    ],
    ["unexpected-response", malformed, "Unexpected response values"],
  ] as const;
  return checks.map(([code, count, message]) => ({
    code,
    count,
    message,
    severity: count ? "warning" : "info",
  }));
}
