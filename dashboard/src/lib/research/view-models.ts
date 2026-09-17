import {
  currentQuestionnaireVersion,
  getExpectedQuestionIds,
  getQuestion,
  getQuestionnaire,
  isRetiredQuestion,
  supportedQuestionnaireVersions,
  type ChoicesAnswer,
  type CurrentQuestionId,
  type QuestionMetadata,
} from "../research-metadata";
import type {
  ConsentRow,
  ResearchDataSnapshot,
  ResponseRow,
  SessionRow,
} from "../supabase/rows";

import {
  answerToReadable,
  validateResponseValue,
  type ValidAnswer,
} from "./answers";

export type AnswerState =
  | "ANSWERED"
  | "NOT_APPLICABLE"
  | "MISSING"
  | "NOT_EXPECTED"
  | "WITHDRAWN"
  | "UNEXPECTED";

export type ResponseViewModel = Readonly<{
  question: QuestionMetadata;
  state: AnswerState;
  readableAnswer: string | null;
  answer: ValidAnswer | null;
  diagnostic?: string;
  createdAt?: string;
  updatedAt?: string;
}>;

export type ParticipantViewModel = Readonly<{
  /**
   * Every participant against the same question set, whatever version they
   * answered: the shared questions are worded identically across 1.3.0-1.5.0,
   * so one canonical list reads as a single dataset rather than as three.
   */
  canonicalResponses: readonly ResponseViewModel[];
  /**
   * Answers to questions the current questionnaire has retired (Q11, Q16).
   * Kept, and kept separate, so nothing collected is lost or silently folded
   * into a question it was not asked under.
   */
  supplementaryResponses: readonly ResponseViewModel[];
  participantCode: string;
  roles: readonly string[];
  industry: string;
  experience: string;
  discoveryCloseness: string;
  status: SessionRow["status"];
  studyStage: SessionRow["study_stage"];
  responseMode: SessionRow["response_mode"];
  questionnaireVersion: string;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  withdrawnAt: string | null;
  answeredCount: number;
  expectedCount: number;
  missingQuestionIds: readonly string[];
  hiddenQuestionIds: readonly string[];
  coverage: number;
  responses: readonly ResponseViewModel[];
  consent: ConsentRow | null;
}>;

export type QuestionViewModel = Readonly<{
  questionnaireVersion: string;
  questionId: string;
  wording: string;
  hint?: string;
  construct: string;
  responseType: string;
  conditional: boolean;
  expectedParticipantCount: number;
  responseCount: number;
  notApplicableCount: number;
  missingCount: number;
  coverage: number;
  responses: readonly Readonly<{
    participantCode: string;
    response: ResponseViewModel;
  }>[];
}>;

function q1Answer(
  rows: readonly ResponseRow[],
  version: string
): ChoicesAnswer | undefined {
  const row = rows.find((response) => response.question_id === "q1");
  const question = getQuestion(version, "q1");
  if (!row || !question) return undefined;
  const validation = validateResponseValue(row.response_value, question);
  return validation.valid && validation.answer.kind === "choices"
    ? validation.answer
    : undefined;
}

export function buildParticipantViewModels(
  snapshot: ResearchDataSnapshot
): ParticipantViewModel[] {
  const participants = new Map(
    snapshot.participants.map((row) => [row.id, row])
  );
  const responsesBySession = new Map<string, ResponseRow[]>();
  for (const row of snapshot.responses) {
    const rows = responsesBySession.get(row.session_id) ?? [];
    rows.push(row);
    responsesBySession.set(row.session_id, rows);
  }
  const consentsBySession = new Map(
    snapshot.consents.map((row) => [row.session_id, row])
  );

  // The questionnaire in use today defines the canonical set every participant
  // is reported against, whichever version they actually answered.
  const canonicalQuestionIds = new Set<string>(
    getQuestionnaire(currentQuestionnaireVersion()).questionIds
  );

  return snapshot.sessions.flatMap((session) => {
    const participant = participants.get(session.participant_id);
    if (!participant) return [];
    let questionnaire;
    try {
      questionnaire = getQuestionnaire(session.questionnaire_version);
    } catch {
      return [];
    }
    const storedRows = responsesBySession.get(session.id) ?? [];
    const expectedIds = new Set(
      getExpectedQuestionIds({
        questionnaireVersion: session.questionnaire_version,
        q1Response: q1Answer(storedRows, session.questionnaire_version),
      })
    );
    const byQuestion = new Map(storedRows.map((row) => [row.question_id, row]));
    const responseModels = questionnaire.questions.map(
      (question): ResponseViewModel => {
        if (session.status === "withdrawn") {
          return {
            question,
            state: "WITHDRAWN",
            readableAnswer: null,
            answer: null,
          };
        }
        if (!expectedIds.has(question.id)) {
          return {
            question,
            state: "NOT_EXPECTED",
            readableAnswer: null,
            answer: null,
          };
        }
        const row = byQuestion.get(question.id);
        if (!row)
          return {
            question,
            state: "MISSING",
            readableAnswer: null,
            answer: null,
          };
        const validation = validateResponseValue(row.response_value, question);
        if (!validation.valid) {
          return {
            question,
            state: "UNEXPECTED",
            readableAnswer: null,
            answer: null,
            diagnostic: validation.diagnostic,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
        return {
          question,
          state:
            validation.answer.kind === "not_applicable"
              ? "NOT_APPLICABLE"
              : "ANSWERED",
          readableAnswer: answerToReadable(validation.answer, question),
          answer: validation.answer,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    );
    const resolved = responseModels.filter(
      (response) =>
        (response.state === "ANSWERED" ||
          response.state === "NOT_APPLICABLE") &&
        expectedIds.has(response.question.id)
    );
    const q1 = responseModels.find(
      (response) => response.question.id === "q1"
    )?.answer;
    const readableProfile = (
      questionId: "q2" | "q3" | "q4",
      fallback: string
    ) =>
      responseModels.find((response) => response.question.id === questionId)
        ?.readableAnswer ?? fallback;
    const roles = q1?.kind === "choices" ? q1.values : [];
    const expectedCount = session.status === "withdrawn" ? 0 : expectedIds.size;

    return [
      {
        participantCode: participant.participant_code,
        roles,
        industry: readableProfile("q2", participant.industry),
        experience: readableProfile("q3", participant.experience),
        discoveryCloseness: readableProfile(
          "q4",
          participant.closeness_to_discovery
        ),
        status: session.status,
        studyStage: session.study_stage,
        responseMode: session.response_mode,
        questionnaireVersion: session.questionnaire_version,
        startedAt: session.started_at,
        lastActivityAt: session.last_activity_at,
        completedAt: session.completed_at,
        withdrawnAt: session.withdrawn_at,
        answeredCount: session.status === "withdrawn" ? 0 : resolved.length,
        expectedCount,
        missingQuestionIds: responseModels
          .filter(
            (response) =>
              response.state === "MISSING" || response.state === "UNEXPECTED"
          )
          .map((response) => response.question.id),
        hiddenQuestionIds: responseModels
          .filter((response) => response.state === "NOT_EXPECTED")
          .map((response) => response.question.id),
        coverage: expectedCount ? resolved.length / expectedCount : 0,
        responses: responseModels,
        canonicalResponses: responseModels.filter((response) =>
          canonicalQuestionIds.has(response.question.id)
        ),
        supplementaryResponses: responseModels.filter(
          (response) =>
            !canonicalQuestionIds.has(response.question.id) &&
            (response.state === "ANSWERED" ||
              response.state === "NOT_APPLICABLE")
        ),
        consent: consentsBySession.get(session.id) ?? null,
      },
    ];
  });
}

export function buildQuestionViewModels(
  participants: readonly ParticipantViewModel[]
): QuestionViewModel[] {
  return supportedQuestionnaireVersions.flatMap((version) => {
    const questionnaire = getQuestionnaire(version);
    return questionnaire.questions.map((question) => {
      const eligible = participants.filter(
        (participant) =>
          participant.status !== "withdrawn" &&
          participant.questionnaireVersion === version
      );
      const entries = eligible.flatMap((participant) => {
        const response = participant.responses.find(
          (item) => item.question.id === question.id
        );
        return response && response.state !== "NOT_EXPECTED"
          ? [{ participantCode: participant.participantCode, response }]
          : [];
      });
      const expectedParticipantCount = entries.length;
      const responses = entries.filter(
        (entry) => entry.response.state === "ANSWERED"
      );
      const notApplicableCount = entries.filter(
        (entry) => entry.response.state === "NOT_APPLICABLE"
      ).length;
      const resolvedCount = responses.length + notApplicableCount;
      return {
        questionnaireVersion: version,
        questionId: question.id,
        wording: question.wording,
        ...(question.hint ? { hint: question.hint } : {}),
        construct: question.construct,
        responseType: question.responseType,
        conditional: Boolean(question.visibility),
        expectedParticipantCount,
        responseCount: responses.length,
        notApplicableCount,
        missingCount: expectedParticipantCount - resolvedCount,
        coverage: expectedParticipantCount
          ? resolvedCount / expectedParticipantCount
          : 0,
        responses,
      };
    });
  });
}

export type QuestionSummary = Readonly<{
  questionId: string;
  wording: string;
  hint?: string;
  construct: string;
  responseType: string;
  conditional: boolean;
  /** True when the questionnaire in use today no longer asks this. */
  retired: boolean;
  expectedParticipantCount: number;
  responseCount: number;
  notApplicableCount: number;
  missingCount: number;
  coverage: number;
  /** Which questionnaire versions asked this question, newest first. */
  questionnaireVersions: readonly string[];
  responses: readonly Readonly<{
    participantCode: string;
    response: ResponseViewModel;
  }>[];
}>;

/**
 * One row per question, merged across questionnaire versions.
 *
 * Internally a question exists once per version, because wording has to stay
 * pinned to what each participant actually saw. A dashboard visitor thinks in
 * terms of "Q5", not "Q5 as asked under 1.3.0", so the versions are summed
 * here and the newest wording is shown. Version detail stays available on the
 * Data Structure page.
 */
export function buildQuestionSummaries(
  questions: readonly QuestionViewModel[]
): QuestionSummary[] {
  const order = questionDisplayOrder();
  const merged = new Map<string, QuestionSummary>();

  for (const question of questions) {
    const existing = merged.get(question.questionId);
    if (!existing) {
      const { questionnaireVersion, ...rest } = question;
      merged.set(question.questionId, {
        ...rest,
        retired: isRetiredQuestion(question.questionId),
        questionnaireVersions: [questionnaireVersion],
      });
      continue;
    }
    const expectedParticipantCount =
      existing.expectedParticipantCount + question.expectedParticipantCount;
    const responseCount = existing.responseCount + question.responseCount;
    const notApplicableCount =
      existing.notApplicableCount + question.notApplicableCount;
    merged.set(question.questionId, {
      ...existing,
      // Versions arrive oldest-first, so the incoming row is always the
      // newer wording — which is the one a visitor should be reading.
      wording: question.wording,
      ...(question.hint ? { hint: question.hint } : {}),
      construct: question.construct,
      responseType: question.responseType,
      conditional: question.conditional,
      expectedParticipantCount,
      responseCount,
      notApplicableCount,
      missingCount: existing.missingCount + question.missingCount,
      coverage: expectedParticipantCount
        ? (responseCount + notApplicableCount) / expectedParticipantCount
        : 0,
      // Newest first: the detail page reads its wording and validation from
      // questionnaireVersions[0], which must be the version in use today.
      questionnaireVersions: [
        question.questionnaireVersion,
        ...existing.questionnaireVersions,
      ],
      responses: [...existing.responses, ...question.responses],
    });
  }

  return [...merged.values()].sort(
    (a, b) =>
      (order.indexOf(a.questionId) + 1 || order.length) -
      (order.indexOf(b.questionId) + 1 || order.length)
  );
}

/** Questionnaire order, newest version first so current questions lead. */
export function questionDisplayOrder(): string[] {
  const ids: string[] = [];
  for (const version of [...supportedQuestionnaireVersions].reverse()) {
    for (const questionId of getQuestionnaire(version).questionIds) {
      if (!ids.includes(questionId)) ids.push(questionId);
    }
  }
  return ids;
}

export function isKnownQuestionId(value: string): value is CurrentQuestionId {
  return supportedQuestionnaireVersions.some((version) =>
    getQuestionnaire(version).questionIds.includes(value as CurrentQuestionId)
  );
}
