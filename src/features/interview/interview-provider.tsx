"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { questionnaire as defaultQuestionnaire } from "@/config/interview";
import { answerFor, validateAnswer } from "@/domain/interview/answers";
import {
  buildTimeline,
  calculateProgress,
  findStep,
  unansweredRequiredQuestions,
  visibleQuestions,
} from "@/domain/interview/flow";
import {
  createInitialState,
  interviewReducer,
} from "@/domain/interview/reducer";
import type {
  AnswerValue,
  InterviewQuestion,
  InterviewState,
  Questionnaire,
  ResponseMethod,
  Step,
} from "@/domain/interview/types";

interface InterviewContextValue {
  questionnaire: Questionnaire;
  state: InterviewState;
  timeline: Step[];
  currentStep: Step;
  progress: ReturnType<typeof calculateProgress>;
  visible: InterviewQuestion[];
  outstandingRequired: InterviewQuestion[];
  answerOf: (question: InterviewQuestion) => AnswerValue;
  validate: (question: InterviewQuestion) => string | null;
  answer: (
    question: InterviewQuestion,
    value: AnswerValue,
    method: ResponseMethod
  ) => void;
  skip: (question: InterviewQuestion) => void;
  setConsent: (granted: boolean) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (stepId: string, fromReview?: boolean) => void;
  submit: () => void;
}

const InterviewContext = createContext<InterviewContextValue | null>(null);

interface InterviewProviderProps {
  children: ReactNode;
  questionnaire?: Questionnaire;
}

/**
 * Phase 1 state lives only in React memory. Refreshing or closing the tab
 * intentionally clears every answer.
 */
export function InterviewProvider({
  children,
  questionnaire = defaultQuestionnaire,
}: InterviewProviderProps) {
  const [state, dispatch] = useReducer(
    (current: InterviewState, action: Parameters<typeof interviewReducer>[1]) =>
      interviewReducer(current, action, questionnaire),
    questionnaire,
    createInitialState
  );

  const timeline = useMemo(
    () => buildTimeline(questionnaire, state.responses),
    [questionnaire, state.responses]
  );
  const currentStep = findStep(timeline, state.currentStepId) ?? timeline[0];
  const progress = useMemo(
    () =>
      calculateProgress(questionnaire, state.responses, state.currentStepId),
    [questionnaire, state.responses, state.currentStepId]
  );
  const visible = useMemo(
    () => visibleQuestions(questionnaire, state.responses),
    [questionnaire, state.responses]
  );
  const outstandingRequired = useMemo(
    () => unansweredRequiredQuestions(questionnaire, state.responses),
    [questionnaire, state.responses]
  );

  const answer = useCallback(
    (
      question: InterviewQuestion,
      value: AnswerValue,
      method: ResponseMethod
    ) => {
      dispatch({ type: "answer", questionId: question.id, value, method });
    },
    []
  );
  const skip = useCallback((question: InterviewQuestion) => {
    dispatch({ type: "skip", questionId: question.id });
    dispatch({ type: "next" });
  }, []);

  const value = useMemo<InterviewContextValue>(
    () => ({
      questionnaire,
      state,
      timeline,
      currentStep,
      progress,
      visible,
      outstandingRequired,
      answerOf: (question) => answerFor(state.responses, question),
      validate: (question) =>
        validateAnswer(question, state.responses[question.id]?.value ?? null),
      answer,
      skip,
      setConsent: (granted) => dispatch({ type: "set_consent", granted }),
      goNext: () => dispatch({ type: "next" }),
      goBack: () => dispatch({ type: "back" }),
      goToStep: (stepId, fromReview) =>
        dispatch({ type: "go_to_step", stepId, fromReview }),
      submit: () => dispatch({ type: "submit" }),
    }),
    [
      questionnaire,
      state,
      timeline,
      currentStep,
      progress,
      visible,
      outstandingRequired,
      answer,
      skip,
    ]
  );

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview(): InterviewContextValue {
  const value = useContext(InterviewContext);
  if (!value) {
    throw new Error("useInterview must be used inside an InterviewProvider.");
  }
  return value;
}
