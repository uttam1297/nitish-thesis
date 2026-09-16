import { questionnaireV130 } from "./questionnaire-v1-3-0";
import { questionnaireV140 } from "./questionnaire-v1-4-0";
import { questionnaireV150 } from "./questionnaire-v1-5-0";
import type {
  ChoicesAnswer,
  CurrentQuestionId,
  QuestionMetadata,
  QuestionnaireMetadata,
  QuestionnaireVersion,
  ResearchConstructMetadata,
} from "./types";

export const questionnaireRegistry = {
  "1.3.0": questionnaireV130,
  "1.4.0": questionnaireV140,
  "1.5.0": questionnaireV150,
} as const satisfies Record<QuestionnaireVersion, QuestionnaireMetadata>;

export const supportedQuestionnaireVersions = Object.freeze(
  Object.keys(questionnaireRegistry) as QuestionnaireVersion[]
);

export function isSupportedQuestionnaireVersion(
  version: string
): version is QuestionnaireVersion {
  return Object.hasOwn(questionnaireRegistry, version);
}

export function getQuestionnaire(version: string): QuestionnaireMetadata {
  if (!isSupportedQuestionnaireVersion(version)) {
    throw new Error(`Unsupported questionnaire version: ${version}`);
  }

  return questionnaireRegistry[version];
}

export function getQuestion(
  version: string,
  questionId: string
): QuestionMetadata | undefined {
  return getQuestionnaire(version).questions.find(
    (question) => question.id === questionId
  );
}

export function getQuestionIds(version: string): readonly CurrentQuestionId[] {
  return getQuestionnaire(version).questionIds;
}

export function getResearchConstruct(
  version: string,
  constructId: string
): ResearchConstructMetadata | undefined {
  return getQuestionnaire(version).constructs.find(
    (construct) => construct.id === constructId
  );
}

export type ExpectedQuestionContext = Readonly<{
  questionnaireVersion: string;
  q1Response?: ChoicesAnswer;
}>;

export function isQuestionExpected(
  questionId: string,
  context: ExpectedQuestionContext
): boolean {
  const question = getQuestion(context.questionnaireVersion, questionId);

  if (!question) {
    throw new Error(
      `Unknown question "${questionId}" for questionnaire version ${context.questionnaireVersion}.`
    );
  }

  if (!question.visibility) {
    return true;
  }

  const selectedRoles = context.q1Response?.values ?? [];
  const equalsEngineeringOnly =
    selectedRoles.length === 1 && selectedRoles[0] === "engineering";

  return !equalsEngineeringOnly;
}

export function getExpectedQuestionIds(
  context: ExpectedQuestionContext
): readonly CurrentQuestionId[] {
  return getQuestionIds(context.questionnaireVersion).filter((questionId) =>
    isQuestionExpected(questionId, context)
  );
}
