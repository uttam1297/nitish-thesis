import type { ParticipantViewModel } from "./view-models";

export type PublicResponseRow = Readonly<{
  participantCode: string;
  questionId: string;
  question: string;
  construct: string;
  responseType: string;
  readableAnswer: string;
  answerState: string;
  sessionStatus: ParticipantViewModel["status"];
  studyStage: ParticipantViewModel["studyStage"];
  mode: ParticipantViewModel["responseMode"];
  questionnaireVersion: string;
  createdAt: string | null;
  updatedAt: string | null;
  rawValue?: unknown;
}>;

export function buildPublicResponseRows(
  participants: readonly ParticipantViewModel[],
  privacy: Readonly<{ showNarratives: boolean; showRawJson: boolean }>,
): PublicResponseRow[] {
  return participants.flatMap((participant) => participant.responses
    .filter((response) => response.state !== "NOT_EXPECTED")
    .map((response) => {
      const isNarrative = response.question.responseType === "voice_or_text";
      const readableAnswer = response.state !== "ANSWERED"
        ? response.state === "MISSING" ? "Missing — no stored response" : response.state === "WITHDRAWN" ? "Withdrawn — response unavailable" : "Unexpected stored response"
        : isNarrative && !privacy.showNarratives ? "Narrative display disabled" : response.readableAnswer ?? "Not available";
      return {
        participantCode: participant.participantCode,
        questionId: response.question.id,
        question: response.question.wording,
        construct: response.question.construct,
        responseType: response.question.responseType,
        readableAnswer,
        answerState: response.state,
        sessionStatus: participant.status,
        studyStage: participant.studyStage,
        mode: participant.responseMode,
        questionnaireVersion: participant.questionnaireVersion,
        createdAt: response.createdAt ?? null,
        updatedAt: response.updatedAt ?? null,
        ...(privacy.showRawJson && response.answer && (!isNarrative || privacy.showNarratives) ? { rawValue: response.answer } : {}),
      };
    }));
}
