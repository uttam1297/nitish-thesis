import {
  getQuestion,
  isConstructKnownToAnyVersion,
  isQuestionKnownToAnyVersion,
  isRetiredQuestion,
  supportedQuestionnaireVersions,
} from "../research-metadata";
import type { ResearchDataSnapshot } from "../supabase/rows";
import {
  questionDisplayOrder,
  type ParticipantViewModel,
  type QuestionViewModel,
} from "./view-models";

export type DistributionItem = Readonly<{
  label: string;
  count: number;
  percentage: number;
}>;

/** One day of collection, with running totals for trend charts. */
export type TrajectoryPoint = Readonly<{
  date: string;
  participants: number;
  responses: number;
  completions: number;
  cumulativeParticipants: number;
  cumulativeResponses: number;
  cumulativeCompletions: number;
}>;

/** How many of the people who were asked a question have resolved it. */
export type QuestionCompletion = Readonly<{
  questionId: string;
  label: string;
  wording: string;
  resolved: number;
  expected: number;
  conditional: boolean;
  /** True when the questionnaire in use today no longer asks this. */
  retired: boolean;
}>;

/** How far one participant has got through the questions asked of them. */
export type ParticipantCompletion = Readonly<{
  participantCode: string;
  answered: number;
  expected: number;
  status: ParticipantViewModel["status"];
}>;

export type DatasetMetrics = Readonly<{
  totalParticipants: number;
  completedSessions: number;
  inProgressSessions: number;
  withdrawnSessions: number;
  storedResponses: number;
  expectedResponses: number;
  missingResponses: number;
  statusDistribution: readonly DistributionItem[];
  roleDistribution: readonly DistributionItem[];
  industryDistribution: readonly DistributionItem[];
  experienceDistribution: readonly DistributionItem[];
  closenessDistribution: readonly DistributionItem[];
  trajectory: readonly TrajectoryPoint[];
  questionCompletion: readonly QuestionCompletion[];
  participantCompletion: readonly ParticipantCompletion[];
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

/**
 * Distribution in a fixed, meaningful order rather than by frequency. Bands
 * such as experience ("Under 1 year" … "10+ years") and the 1-5 discovery
 * scale only read correctly along their own axis.
 */
function orderedDistribution(
  values: readonly string[],
  order: readonly string[]
): DistributionItem[] {
  const items = distribution(values);
  const rank = (label: string) => {
    const index = order.indexOf(label);
    return index === -1 ? order.length : index;
  };
  return [...items].sort(
    (a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label)
  );
}

/** The newest questionnaire a version of this question appears in. */
function latestQuestion(questionId: "q3" | "q4") {
  for (const version of [...supportedQuestionnaireVersions].reverse()) {
    const question = getQuestion(version, questionId);
    if (question) return question;
  }
  return undefined;
}

function experienceOrder(): string[] {
  const question = latestQuestion("q3");
  return question?.responseType === "single_select"
    ? question.options.map((option) => option.label)
    : [];
}

/** Scale answers read as "4 of 5", so the axis is built the same way. */
function closenessOrder(): string[] {
  const question = latestQuestion("q4");
  if (question?.responseType !== "likert_scale") return [];
  const { minimum, maximum } = question.scale;
  return Array.from(
    { length: maximum - minimum + 1 },
    (_, index) => `${minimum + index} of ${maximum}`
  );
}

function buildTrajectory(
  participants: readonly ParticipantViewModel[]
): TrajectoryPoint[] {
  const days = new Map<
    string,
    { participants: number; responses: number; completions: number }
  >();
  const day = (date: string) => {
    const key = date.slice(0, 10);
    const entry = days.get(key) ?? {
      participants: 0,
      responses: 0,
      completions: 0,
    };
    days.set(key, entry);
    return entry;
  };

  for (const participant of participants) {
    day(participant.startedAt).participants += 1;
    if (participant.completedAt) day(participant.completedAt).completions += 1;
    for (const response of participant.responses) {
      // Only stored rows carry a timestamp; missing and not-expected
      // questions have nothing to place on the timeline.
      if (response.createdAt) day(response.createdAt).responses += 1;
    }
  }

  let cumulativeParticipants = 0;
  let cumulativeResponses = 0;
  let cumulativeCompletions = 0;
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => {
      cumulativeParticipants += counts.participants;
      cumulativeResponses += counts.responses;
      cumulativeCompletions += counts.completions;
      return {
        date,
        ...counts,
        cumulativeParticipants,
        cumulativeResponses,
        cumulativeCompletions,
      };
    });
}

/**
 * Per question, how many of the participants who were actually asked it have
 * resolved it. A question hidden by routing (Q7 for engineering-only
 * participants) is not in that participant's denominator, so it is never
 * counted as missing. Questions are merged across questionnaire versions:
 * the audience cares about "Q5", not about Q5-under-1.3.0.
 */
function buildQuestionCompletion(
  participants: readonly ParticipantViewModel[]
): QuestionCompletion[] {
  const totals = new Map<
    string,
    {
      resolved: number;
      expected: number;
      conditional: boolean;
      wording: string;
    }
  >();

  for (const participant of participants) {
    if (participant.status === "withdrawn") continue;
    for (const response of participant.responses) {
      if (response.state === "NOT_EXPECTED" || response.state === "WITHDRAWN") {
        continue;
      }
      const entry = totals.get(response.question.id) ?? {
        resolved: 0,
        expected: 0,
        conditional: Boolean(response.question.visibility),
        wording: response.question.wording,
      };
      entry.expected += 1;
      if (
        response.state === "ANSWERED" ||
        response.state === "NOT_APPLICABLE"
      ) {
        entry.resolved += 1;
      }
      totals.set(response.question.id, entry);
    }
  }

  const order = questionDisplayOrder();
  return [...totals.entries()]
    .map(([questionId, entry]) => ({
      questionId,
      label: questionId.toUpperCase(),
      wording: entry.wording,
      resolved: entry.resolved,
      expected: entry.expected,
      conditional: entry.conditional,
      retired: isRetiredQuestion(questionId),
    }))
    .sort(
      (a, b) =>
        (order.indexOf(a.questionId) + 1 || order.length) -
        (order.indexOf(b.questionId) + 1 || order.length)
    );
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
    storedResponses,
    expectedResponses,
    missingResponses: Math.max(expectedResponses - storedResponses, 0),
    statusDistribution: distribution(
      participants.map((participant) => participant.status)
    ),
    roleDistribution: distribution(
      eligible.flatMap(roleLabels),
      eligible.length
    ),
    industryDistribution: distribution(
      values((participant) => participant.industry)
    ),
    experienceDistribution: orderedDistribution(
      values((participant) => participant.experience),
      experienceOrder()
    ),
    closenessDistribution: orderedDistribution(
      values((participant) => participant.discoveryCloseness),
      closenessOrder()
    ),
    trajectory: buildTrajectory(participants),
    questionCompletion: buildQuestionCompletion(participants),
    participantCompletion: eligible
      .map((participant) => ({
        participantCode: participant.participantCode,
        answered: participant.answeredCount,
        expected: participant.expectedCount,
        status: participant.status,
      }))
      .sort((a, b) => a.participantCode.localeCompare(b.participantCode)),
    latestActivity:
      participants
        .map((participant) => participant.lastActivityAt)
        .sort()
        .at(-1) ?? null,
  };
}

/**
 * Works on a single-version question or on one merged across versions: it
 * only needs the responses and the answered count.
 */
export function categoricalDistribution(
  question: Pick<QuestionViewModel, "responses" | "responseCount">
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
  const items = distribution(values, question.responseCount);
  // A rating scale reads along its own axis: 1, 2, 3 … not most-popular first.
  const isScale = question.responses.some(
    ({ response }) => response.answer?.kind === "scale"
  );
  return isScale
    ? [...items].sort((a, b) => Number(a.label) - Number(b.label))
    : items;
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
  // Checked against every supported questionnaire, not one pinned version:
  // a response is only genuinely unknown when no version ever defined it.
  // Pinning this to 1.3.0 would report a question introduced later as
  // "unknown", and would stop recognising one retired since.
  const unknownQuestions = snapshot.responses.filter(
    (row) => !isQuestionKnownToAnyVersion(row.question_id)
  ).length;
  const unexpectedConstructs = snapshot.responses.filter(
    (row) => !isConstructKnownToAnyVersion(row.construct)
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
