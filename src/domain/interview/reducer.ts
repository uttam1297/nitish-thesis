import {
  buildTimeline,
  nextStepId,
  previousStepId,
  REVIEW_STEP_ID,
  WELCOME_STEP_ID,
} from "@/domain/interview/flow";
import type {
  AnswerValue,
  InterviewState,
  Questionnaire,
  ResponseMethod,
} from "@/domain/interview/types";

export type InterviewAction =
  | { type: "set_consent"; granted: boolean }
  | {
      type: "answer";
      questionId: string;
      value: AnswerValue;
      method: ResponseMethod;
    }
  | { type: "skip"; questionId: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "go_to_step"; stepId: string; fromReview?: boolean }
  | { type: "go_to_review" }
  | { type: "submit" };

export function createInitialState(
  questionnaire: Questionnaire
): InterviewState {
  return {
    questionnaireVersion: questionnaire.version,
    status: "in_progress",
    currentStepId: WELCOME_STEP_ID,
    responses: {},
    consent: {
      granted: false,
      grantedAt: null,
      consentVersion: questionnaire.version,
    },
    returningToReview: false,
  };
}

/** Pure, in-memory state for the Phase 1 prototype. */
export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
  questionnaire: Questionnaire
): InterviewState {
  switch (action.type) {
    case "set_consent":
      return {
        ...state,
        consent: {
          ...state.consent,
          granted: action.granted,
          grantedAt: action.granted ? new Date().toISOString() : null,
        },
      };
    case "answer":
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.questionId]: {
            questionId: action.questionId,
            value: action.value,
            method: action.method,
            skipped: false,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    case "skip": {
      const existing = state.responses[action.questionId];
      return {
        ...state,
        responses: {
          ...state.responses,
          [action.questionId]: {
            questionId: action.questionId,
            value: existing?.value ?? null,
            method: existing?.method ?? null,
            skipped: true,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
    case "next": {
      if (state.returningToReview) {
        return {
          ...state,
          currentStepId: REVIEW_STEP_ID,
          returningToReview: false,
        };
      }
      return {
        ...state,
        currentStepId: nextStepId(
          buildTimeline(questionnaire, state.responses),
          state.currentStepId
        ),
      };
    }
    case "back":
      return {
        ...state,
        currentStepId: previousStepId(
          buildTimeline(questionnaire, state.responses),
          state.currentStepId
        ),
        returningToReview: false,
      };
    case "go_to_step":
      return {
        ...state,
        currentStepId: action.stepId,
        returningToReview: action.fromReview ?? false,
      };
    case "go_to_review":
      return {
        ...state,
        currentStepId: REVIEW_STEP_ID,
        returningToReview: false,
      };
    case "submit":
      return {
        ...state,
        status: "submitted",
        currentStepId: "complete",
      };
  }
}
