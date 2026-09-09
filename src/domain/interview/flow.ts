import { isAnswered, isResolved } from "@/domain/interview/answers";
import { isQuestionVisible } from "@/domain/interview/conditions";
import type {
  InterviewQuestion,
  Questionnaire,
  ResponseMap,
  Step,
} from "@/domain/interview/types";

export const WELCOME_STEP_ID = "welcome";
export const CONSENT_STEP_ID = "consent";
export const REVIEW_STEP_ID = "review";
export const COMPLETE_STEP_ID = "complete";

export function sectionStepId(sectionId: string): string {
  return `section:${sectionId}`;
}

/**
 * Questions in configuration order, minus any whose `visibleWhen` rules do
 * not currently hold. Visibility is config-driven: no screen branches on it.
 */
export function visibleQuestions(
  questionnaire: Questionnaire,
  responses: ResponseMap
): InterviewQuestion[] {
  return questionnaire.questions.filter((question) =>
    isQuestionVisible(question.visibleWhen, responses)
  );
}

/**
 * Builds the linear Phase 1 participant journey from configuration.
 */
export function buildTimeline(
  questionnaire: Questionnaire,
  responses: ResponseMap
): Step[] {
  const steps: Step[] = [
    { kind: "welcome", id: WELCOME_STEP_ID },
    { kind: "consent", id: CONSENT_STEP_ID },
  ];

  const sectionsById = new Map(
    questionnaire.sections.map((section) => [section.id, section])
  );
  let lastSectionId: string | null = null;

  for (const question of visibleQuestions(questionnaire, responses)) {
    if (question.section !== lastSectionId) {
      const section = sectionsById.get(question.section);
      if (section) {
        steps.push({
          kind: "section",
          id: sectionStepId(section.id),
          section,
        });
      }
      lastSectionId = question.section;
    }
    steps.push({ kind: "question", id: question.id, question });
  }

  steps.push({ kind: "review", id: REVIEW_STEP_ID });
  steps.push({ kind: "complete", id: COMPLETE_STEP_ID });
  return steps;
}

export function findStep(timeline: Step[], stepId: string): Step | undefined {
  return timeline.find((step) => step.id === stepId);
}

/**
 * Resolves a step id that may have disappeared (its question became hidden)
 * back onto a step that still exists, preferring the nearest earlier step.
 */
export function nextStepId(timeline: Step[], stepId: string): string {
  const index = timeline.findIndex((step) => step.id === stepId);
  if (index < 0) return stepId;
  return timeline[Math.min(index + 1, timeline.length - 1)].id;
}

export function previousStepId(timeline: Step[], stepId: string): string {
  const index = timeline.findIndex((step) => step.id === stepId);
  if (index <= 0) return stepId;
  return timeline[index - 1].id;
}

export interface InterviewProgress {
  /** Questions answered or explicitly skipped. */
  resolved: number;
  /** Questions currently in the participant's path. */
  total: number;
  percent: number;
  /** 1-based position of the current question, 0 outside the question flow. */
  position: number;
  sectionTitle: string | null;
}

export function calculateProgress(
  questionnaire: Questionnaire,
  responses: ResponseMap,
  currentStepId: string
): InterviewProgress {
  const questions = visibleQuestions(questionnaire, responses);
  const total = questions.length;
  const resolved = questions.filter((question) =>
    isResolved(responses[question.id])
  ).length;

  const position = questions.findIndex(
    (question) => question.id === currentStepId
  );

  const finished =
    currentStepId === REVIEW_STEP_ID || currentStepId === COMPLETE_STEP_ID;
  const percent =
    finished || total === 0 ? 100 : Math.round((resolved / total) * 100);

  const currentQuestion = position >= 0 ? questions[position] : undefined;
  const section = currentQuestion
    ? questionnaire.sections.find((item) => item.id === currentQuestion.section)
    : undefined;

  return {
    resolved,
    total,
    percent,
    position: position + 1,
    sectionTitle: section?.title ?? null,
  };
}

/** Questions that must be answered before the interview may be submitted. */
export function unansweredRequiredQuestions(
  questionnaire: Questionnaire,
  responses: ResponseMap
): InterviewQuestion[] {
  return visibleQuestions(questionnaire, responses).filter(
    (question) => question.required && !isAnswered(responses[question.id])
  );
}
