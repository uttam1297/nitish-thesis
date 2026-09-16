import {
  getExpectedQuestionIds,
  getQuestion,
  getQuestionnaire,
  type ChoicesAnswer,
  type CurrentQuestionId,
  type QuestionMetadata,
} from "../research-metadata";
import type { ConsentRow, ResearchDataSnapshot, ResponseRow, SessionRow } from "../supabase/rows";

import { answerToReadable, validateResponseValue, type ValidAnswer } from "./answers";

export type AnswerState = "ANSWERED" | "MISSING" | "NOT_EXPECTED" | "WITHDRAWN" | "UNEXPECTED";

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
  questionId: string;
  wording: string;
  hint?: string;
  construct: string;
  responseType: string;
  conditional: boolean;
  expectedParticipantCount: number;
  responseCount: number;
  missingCount: number;
  coverage: number;
  responses: readonly Readonly<{ participantCode: string; response: ResponseViewModel }>[];
}>;

function q1Answer(rows: readonly ResponseRow[], version: string): ChoicesAnswer | undefined {
  const row = rows.find((response) => response.question_id === "q1");
  const question = getQuestion(version, "q1");
  if (!row || !question) return undefined;
  const validation = validateResponseValue(row.response_value, question);
  return validation.valid && validation.answer.kind === "choices"
    ? validation.answer
    : undefined;
}

export function buildParticipantViewModels(snapshot: ResearchDataSnapshot): ParticipantViewModel[] {
  const participants = new Map(snapshot.participants.map((row) => [row.id, row]));
  const responsesBySession = new Map<string, ResponseRow[]>();
  for (const row of snapshot.responses) {
    const rows = responsesBySession.get(row.session_id) ?? [];
    rows.push(row);
    responsesBySession.set(row.session_id, rows);
  }
  const consentsBySession = new Map(snapshot.consents.map((row) => [row.session_id, row]));

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
      }),
    );
    const byQuestion = new Map(storedRows.map((row) => [row.question_id, row]));
    const responseModels = questionnaire.questions.map((question): ResponseViewModel => {
      if (session.status === "withdrawn") {
        return { question, state: "WITHDRAWN", readableAnswer: null, answer: null };
      }
      if (!expectedIds.has(question.id)) {
        return { question, state: "NOT_EXPECTED", readableAnswer: null, answer: null };
      }
      const row = byQuestion.get(question.id);
      if (!row) return { question, state: "MISSING", readableAnswer: null, answer: null };
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
        state: "ANSWERED",
        readableAnswer: answerToReadable(validation.answer, question),
        answer: validation.answer,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
    const answered = responseModels.filter((response) => response.state === "ANSWERED" && expectedIds.has(response.question.id));
    const q1 = responseModels.find((response) => response.question.id === "q1")?.answer;
    const readableProfile = (questionId: "q2" | "q3" | "q4", fallback: string) =>
      responseModels.find((response) => response.question.id === questionId)?.readableAnswer ?? fallback;
    const roles = q1?.kind === "choices" ? q1.values : [];
    const expectedCount = session.status === "withdrawn" ? 0 : expectedIds.size;

    return [{
      participantCode: participant.participant_code,
      roles,
      industry: readableProfile("q2", participant.industry),
      experience: readableProfile("q3", participant.experience),
      discoveryCloseness: readableProfile("q4", participant.closeness_to_discovery),
      status: session.status,
      studyStage: session.study_stage,
      responseMode: session.response_mode,
      questionnaireVersion: session.questionnaire_version,
      startedAt: session.started_at,
      lastActivityAt: session.last_activity_at,
      completedAt: session.completed_at,
      withdrawnAt: session.withdrawn_at,
      answeredCount: session.status === "withdrawn" ? 0 : answered.length,
      expectedCount,
      missingQuestionIds: responseModels.filter((response) => response.state === "MISSING" || response.state === "UNEXPECTED").map((response) => response.question.id),
      hiddenQuestionIds: responseModels.filter((response) => response.state === "NOT_EXPECTED").map((response) => response.question.id),
      coverage: expectedCount ? answered.length / expectedCount : 0,
      responses: responseModels,
      consent: consentsBySession.get(session.id) ?? null,
    }];
  });
}

export function buildQuestionViewModels(participants: readonly ParticipantViewModel[]): QuestionViewModel[] {
  const questionnaire = getQuestionnaire("1.3.0");
  return questionnaire.questions.map((question) => {
    const eligible = participants.filter((participant) => participant.status !== "withdrawn");
    const entries = eligible.flatMap((participant) => {
      const response = participant.responses.find((item) => item.question.id === question.id);
      return response && response.state !== "NOT_EXPECTED" ? [{ participantCode: participant.participantCode, response }] : [];
    });
    const expectedParticipantCount = entries.length;
    const responses = entries.filter((entry) => entry.response.state === "ANSWERED");
    return {
      questionId: question.id,
      wording: question.wording,
      ...(question.hint ? { hint: question.hint } : {}),
      construct: question.construct,
      responseType: question.responseType,
      conditional: Boolean(question.visibility),
      expectedParticipantCount,
      responseCount: responses.length,
      missingCount: expectedParticipantCount - responses.length,
      coverage: expectedParticipantCount ? responses.length / expectedParticipantCount : 0,
      responses,
    };
  });
}

export function filterParticipantsByStage(
  participants: readonly ParticipantViewModel[],
  stage: "main" | "pilot" | "all" = "main",
): ParticipantViewModel[] {
  return stage === "all" ? [...participants] : participants.filter((participant) => participant.studyStage === stage);
}

export function expectedQuestionCount(roles: readonly string[]): 15 | 16 {
  return roles.length === 1 && roles[0] === "engineering" ? 15 : 16;
}

export function isKnownQuestionId(value: string): value is CurrentQuestionId {
  return getQuestionnaire("1.3.0").questionIds.includes(value as CurrentQuestionId);
}
