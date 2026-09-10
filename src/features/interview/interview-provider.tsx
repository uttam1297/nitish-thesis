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
  DRAFT_STORAGE_KEY,
  draftStorage as defaultDraftStorage,
  type DraftStorage,
} from "@/lib/persistence/draft-storage";
import {
  interviewRepository as defaultInterviewRepository,
  type InterviewRepository,
} from "@/lib/persistence/interview-repository";

export interface InterviewContextValue {
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
  /** True once another browser tab has saved progress on this interview. */
  otherTabHasNewerProgress: boolean;
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

  // Deliberately *not* a lazy useState initializer: that runs during the
  // initial render, which on the server always sees no localStorage and on
  // the client may see a real draft — a guaranteed hydration mismatch on
  // the very first screen. Reading it in an effect means the first client
  // render matches the server (no draft yet), and the banner appears a
  // frame later once the real value is known — see React's hydration
  // mismatch guidance for this exact pattern.
  const [pendingDraft, setPendingDraft] = useState<InterviewState | null>(null);
  useEffect(() => {
    const draft = draftStorage.load();
    if (!draft) return;
    if (draft.questionnaireVersion !== questionnaire.version) {
      draftStorage.clear();
      return;
    }
    // Deliberate exception to the "no setState in an effect" rule: this is
    // exactly the documented case for it — syncing in a value (localStorage)
    // that isn't available during the server render, so it can't be a lazy
    // useState initializer without reintroducing the hydration mismatch
    // this effect exists to avoid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingDraft(draft.state);
    // Runs once per mount to sync in external (localStorage) state; the
    // provider does not remount on questionnaire swaps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // Multi-tab safety, kept deliberately simple: a `storage` event for the
  // draft key only ever fires in a tab that did *not* make the write, so
  // any such event here means another tab has saved progress on the same
  // interview. This just warns rather than merging state automatically —
  // a thesis form doesn't need real-time collaboration.
  const [otherTabHasNewerProgress, setOtherTabHasNewerProgress] =
    useState(false);
  useEffect(() => {
    if (state.status === "submitted") return;
    function handleStorage(event: StorageEvent) {
      if (event.key === DRAFT_STORAGE_KEY && event.newValue) {
        setOtherTabHasNewerProgress(true);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [state.status]);

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
      otherTabHasNewerProgress,
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
      otherTabHasNewerProgress,
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
