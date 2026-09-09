import { coreQuestions } from "@/config/interview/core-questions";
import { profileQuestions } from "@/config/interview/profile-questions";
import { constructs, sections } from "@/config/interview/taxonomy";
import { studyTitle } from "@/config/study";
import { questionnaireSchema } from "@/domain/interview/schema";
import type { Questionnaire } from "@/domain/interview/types";

/**
 * Bump when question wording, options or routing change. Drafts saved against
 * an older version are discarded rather than silently mismatched.
 */
export const QUESTIONNAIRE_VERSION = "1.0.0";

const rawQuestionnaire = {
  version: QUESTIONNAIRE_VERSION,
  title: studyTitle,
  sections,
  constructs,
  questions: [...profileQuestions, ...coreQuestions],
};

/**
 * Configuration is validated at module load, so a malformed questionnaire
 * fails immediately and loudly rather than halfway through an interview.
 */
export const questionnaire: Questionnaire =
  questionnaireSchema.parse(rawQuestionnaire);

export function getQuestion(id: string) {
  return questionnaire.questions.find((question) => question.id === id);
}
