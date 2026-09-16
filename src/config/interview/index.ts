import {
  buildCoreQuestions,
  REMOVED_IN_V150,
  type CoreQuestionOptions,
} from "@/config/interview/core-questions";
import { profileQuestions } from "@/config/interview/profile-questions";
import { constructs, sections } from "@/config/interview/taxonomy";
import { studyTitle } from "@/config/study";
import { questionnaireSchema } from "@/domain/interview/schema";
import type { Questionnaire } from "@/domain/interview/types";

/**
 * Bump when question wording, options or routing change. Drafts saved against
 * an older version are discarded rather than silently mismatched.
 */
export const QUESTIONNAIRE_VERSION = "1.5.0";

function buildQuestionnaire(
  version: string,
  options: CoreQuestionOptions
): Questionnaire {
  return questionnaireSchema.parse({
    version,
    title: studyTitle,
    sections,
    constructs,
    questions: [...profileQuestions, ...buildCoreQuestions(options)],
  });
}

/**
 * Configuration is validated at module load, so a malformed questionnaire
 * fails immediately and loudly rather than halfway through an interview.
 */
export const questionnaireV130 = buildQuestionnaire("1.3.0", {});
export const questionnaireV140 = buildQuestionnaire("1.4.0", {
  allowNotApplicable: true,
});
/**
 * 1.5.0 drops Q11 and Q16 and retires voice input: answers are typed. Older
 * versions keep their own question set and controls so a session in flight
 * finishes the interview it started.
 */
export const questionnaireV150 = buildQuestionnaire("1.5.0", {
  allowNotApplicable: true,
  allowVoice: false,
  removedIds: REMOVED_IN_V150,
});
export const questionnaire = questionnaireV150;

const questionnairesByVersion = new Map(
  [questionnaireV130, questionnaireV140, questionnaireV150].map((item) => [
    item.version,
    item,
  ])
);

export function getQuestionnaire(version: string): Questionnaire | undefined {
  return questionnairesByVersion.get(version);
}

export function getQuestion(id: string) {
  return questionnaire.questions.find((question) => question.id === id);
}
