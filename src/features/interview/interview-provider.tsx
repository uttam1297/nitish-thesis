"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
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
import {
  draftStorage as defaultDraftStorage,
  type DraftStorage,
} from "@/lib/persistence/draft-storage";
import {
  interviewRepository as defaultInterviewRepository,
  type InterviewRepository,
} from "@/lib/persistence/interview-repository";

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
  /** True once, right after mount, when a resumable draft was found. */
  hasResumableDraft: boolean;
  resumeDraft: () => void;
  startOver: () => void;
}

const InterviewContext = createContext<InterviewContextValue | null>(null);

interface InterviewProviderProps {
  children: ReactNode;
  questionnaire?: Questionnaire;
  draftStorage?: DraftStorage;
  interviewRepository?: InterviewRepository;
  /** Milliseconds to wait after a change before writing the draft. */
  autosaveDelayMs?: number;
}

/**
 * Owns interview state and layers local autosave/resume and submission on
 * top of the pure reducer. Swapping `draftStorage`/`interviewRepository`
 * (Phase 3) does not require any change to the reducer or screens.
 */
export function InterviewProvider({
  children,
  questionnaire = defaultQuestionnaire,
  draftStorage = defaultDraftStorage,
  interviewRepository = defaultInterviewRepository,
  autosaveDelayMs = 400,
}: InterviewProviderProps) {
  const [state, dispatch] = useReducer(
    (current: InterviewState, action: Parameters<typeof interviewReducer>[1]) =>
      interviewReducer(current, action, questionnaire),
    questionnaire,
    createInitialState
  );

  // Read once at mount time (not in an effect) so there is a single source
  // of truth for the pending draft, rather than syncing it into its own
  // piece of state. A stale-version draft is discarded immediately.
  const [pendingDraft] = useState<InterviewState | null>(() => {
    const draft = draftStorage.load();
    if (!draft) return null;
    if (draft.questionnaireVersion !== questionnaire.version) {
      draftStorage.clear();
      return null;
    }
    return draft.state;
  });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const hasResumableDraft = pendingDraft !== null && !draftDismissed;

  // Autosave: skip until the participant has moved past the welcome screen,
  // and stop once submitted, so a finished interview has nothing left to resume.
  useEffect(() => {
    if (state.currentStepId === "welcome") return;
    if (state.status === "submitted") {
      draftStorage.clear();
      return;
    }
    const timer = window.setTimeout(() => {
      draftStorage.save({
        questionnaireVersion: questionnaire.version,
        state,
        savedAt: new Date().toISOString(),
      });
    }, autosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [state, questionnaire.version, draftStorage, autosaveDelayMs]);

  const resumeDraft = useCallback(() => {
    if (!pendingDraft) return;
    dispatch({ type: "restore", state: pendingDraft });
    setDraftDismissed(true);
  }, [pendingDraft]);

  const startOver = useCallback(() => {
    draftStorage.clear();
    setDraftDismissed(true);
  }, [draftStorage]);

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
      submit: () => {
        const submittedAt = new Date().toISOString();
        dispatch({ type: "submit" });
        void interviewRepository.submit({
          questionnaireVersion: questionnaire.version,
          state: { ...state, status: "submitted", submittedAt },
          submittedAt,
        });
      },
      hasResumableDraft,
      resumeDraft,
      startOver,
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
      hasResumableDraft,
      resumeDraft,
      startOver,
      interviewRepository,
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
