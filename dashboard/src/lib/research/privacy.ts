import type {
  AnswerState,
  ParticipantViewModel,
  ResponseViewModel,
} from "./view-models";

const UNRESOLVED_ANSWER_TEXT = {
  MISSING: "Missing — no stored response",
  NOT_EXPECTED: "Not expected — questionnaire condition",
  WITHDRAWN: "Withdrawn — response content unavailable",
  UNEXPECTED: "Unexpected stored response",
} as const satisfies Record<
  Exclude<AnswerState, "ANSWERED" | "NOT_APPLICABLE">,
  string
>;

/**
 * The one place that decides what a reader sees for a stored response, so the
 * participant page and the response explorer cannot drift apart — they did,
 * and a participant who marked a question "not applicable" was reported as an
 * "Unexpected stored response" on both.
 */
export function displayAnswer(
  response: ResponseViewModel,
  privacy: Readonly<{ showNarratives: boolean }>
): string {
  if (response.state === "ANSWERED") {
    const isNarrative = response.question.responseType === "voice_or_text";
    return isNarrative && !privacy.showNarratives
      ? "Narrative display disabled"
      : (response.readableAnswer ?? "Not available");
  }
  // "Not applicable" is a structured value the participant chose from the
  // form, not narrative text, so hiding narratives does not hide it.
  if (response.state === "NOT_APPLICABLE") {
    return (
      response.readableAnswer ?? "Not applicable to participant experience"
    );
  }
  return UNRESOLVED_ANSWER_TEXT[response.state];
}

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
  privacy: Readonly<{ showNarratives: boolean; showRawJson: boolean }>
): PublicResponseRow[] {
  return participants.flatMap((participant) =>
    participant.responses
      .filter((response) => response.state !== "NOT_EXPECTED")
      .map((response) => {
        const isNarrative = response.question.responseType === "voice_or_text";
        const readableAnswer = displayAnswer(response, privacy);
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
          ...(privacy.showRawJson &&
          response.answer &&
          (!isNarrative || privacy.showNarratives)
            ? { rawValue: response.answer }
            : {}),
        };
      })
  );
}
