import { questionnaireV130 } from "./questionnaire-v1-3-0";
import type { CurrentQuestionId, QuestionnaireMetadata } from "./types";

/**
 * Questions retired in 1.5.0. Q11 repeated Q10's wording verbatim in the
 * source question document, so answers to the two could not be told apart;
 * Q16 was dropped from the study. Responses collected under 1.3.0 and 1.4.0
 * keep their own catalogue, so this only scopes what 1.5.0 participants were
 * asked.
 */
const removedQuestionIds: readonly CurrentQuestionId[] = ["q11", "q16"];

/**
 * 1.5.0 keeps every surviving 1.4.0 question verbatim and retires Q11 and
 * Q16. Narrative questions keep browser speech input alongside typing.
 */
export const questionnaireV150 = {
  ...questionnaireV130,
  version: "1.5.0",
  questionIds: questionnaireV130.questionIds.filter(
    (questionId) => !removedQuestionIds.includes(questionId)
  ),
  questions: questionnaireV130.questions
    .filter((question) => !removedQuestionIds.includes(question.id))
    .map((question) => ({
      ...question,
      questionnaireVersion: "1.5.0" as const,
      ...(question.responseType === "voice_or_text"
        ? {
            allowNotApplicable: true as const,
            input: { voice: true as const, text: true as const },
          }
        : {}),
    })),
} as const satisfies QuestionnaireMetadata;
