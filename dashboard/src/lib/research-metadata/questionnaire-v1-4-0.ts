import { questionnaireV130 } from "./questionnaire-v1-3-0";
import type { QuestionnaireMetadata } from "./types";

/**
 * Version 1.4 preserves every 1.3 question verbatim and adds only the
 * structured not-applicable option to narrative questions.
 */
export const questionnaireV140 = {
  ...questionnaireV130,
  version: "1.4.0",
  questions: questionnaireV130.questions.map((question) => ({
    ...question,
    questionnaireVersion: "1.4.0" as const,
    ...(question.responseType === "voice_or_text"
      ? { allowNotApplicable: true as const }
      : {}),
  })),
} as const satisfies QuestionnaireMetadata;
