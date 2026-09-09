/**
 * Interview domain types.
 *
 * This module is deliberately free of React and browser APIs so the interview
 * rules can be reasoned about, tested and reused independently of the UI.
 */

export type ResponseType =
  | "single_select"
  | "multi_select"
  | "likert_scale"
  | "ranking"
  | "short_text"
  | "long_text"
  | "voice_or_text"
  | "optional_elaboration";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

/** Research provenance kept next to each question. */
export interface ResearchMetadata {
  /** Identifier from the thesis question set, e.g. "Q6". */
  sourceRef: string;
  /** What the question is trying to elicit. */
  intent: string;
}

export interface TextValidation {
  minLength?: number;
  maxLength?: number;
}

export interface SelectionValidation {
  minSelections?: number;
  maxSelections?: number;
}

/**
 * A single condition evaluated against a previously stored answer.
 * A question with `visibleWhen` is shown only when every rule is true.
 */
export interface ConditionRule {
  /** The question whose stored answer this rule inspects. */
  questionId: string;
  operator:
    | "equals"
    | "notEquals"
    | "includes"
    | "excludes"
    | "gte"
    | "lte"
    | "answered";
  /** Comparison value. Unused by the "answered" operator. */
  value?: string | number;
}

interface QuestionBase {
  id: string;
  construct: string;
  section: string;
  title: string;
  prompt: string;
  description?: string;
  required: boolean;
  researchMetadata: ResearchMetadata;
  /** Config-driven conditional visibility. Absent means always visible. */
  visibleWhen?: ConditionRule[];
}

export interface SingleSelectQuestion extends QuestionBase {
  responseType: "single_select";
  options: QuestionOption[];
  allowOther?: boolean;
}

export interface MultiSelectQuestion extends QuestionBase {
  responseType: "multi_select";
  options: QuestionOption[];
  allowOther?: boolean;
  validation?: SelectionValidation;
}

export interface LikertScaleQuestion extends QuestionBase {
  responseType: "likert_scale";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface RankingQuestion extends QuestionBase {
  responseType: "ranking";
  options: QuestionOption[];
  validation?: SelectionValidation;
}

export interface ShortTextQuestion extends QuestionBase {
  responseType: "short_text";
  placeholder?: string;
  validation?: TextValidation;
}

export interface LongTextQuestion extends QuestionBase {
  responseType: "long_text";
  placeholder?: string;
  validation?: TextValidation;
}

export interface VoiceOrTextQuestion extends QuestionBase {
  responseType: "voice_or_text";
  placeholder?: string;
  allowVoice: boolean;
  allowText: boolean;
  validation?: TextValidation;
}

export interface OptionalElaborationQuestion extends QuestionBase {
  responseType: "optional_elaboration";
  required: false;
  placeholder?: string;
  validation?: TextValidation;
}

export type InterviewQuestion =
  | SingleSelectQuestion
  | MultiSelectQuestion
  | LikertScaleQuestion
  | RankingQuestion
  | ShortTextQuestion
  | LongTextQuestion
  | VoiceOrTextQuestion
  | OptionalElaborationQuestion;

export type QuestionOfType<T extends ResponseType> = Extract<
  InterviewQuestion,
  { responseType: T }
>;

/* ---------------------------------------------------------------- answers */

export type AnswerValue =
  | { kind: "choice"; value: string; otherText?: string }
  | { kind: "choices"; values: string[]; otherText?: string }
  | { kind: "scale"; value: number }
  | { kind: "ranking"; order: string[] }
  | { kind: "text"; text: string };

export type AnswerKind = AnswerValue["kind"];

/** Maps each response type to the single answer shape it may produce. */
export interface AnswerKindByResponseType {
  single_select: "choice";
  multi_select: "choices";
  likert_scale: "scale";
  ranking: "ranking";
  short_text: "text";
  long_text: "text";
  voice_or_text: "text";
  optional_elaboration: "text";
}

export type AnswerValueOfType<T extends ResponseType> = Extract<
  AnswerValue,
  { kind: AnswerKindByResponseType[T] }
>;

/** How the participant produced the answer, recorded for research context. */
export type ResponseMethod = "selected" | "typed" | "voice" | "voice_edited";

export interface QuestionResponse {
  questionId: string;
  value: AnswerValue | null;
  method: ResponseMethod | null;
  /** True when the participant explicitly skipped an optional question. */
  skipped: boolean;
  updatedAt: string;
}

export type ResponseMap = Record<string, QuestionResponse>;

/* ------------------------------------------------------------------ flow */

export interface InterviewSection {
  id: string;
  title: string;
  /** Shown on the transition screen introducing the section. */
  summary: string;
  layer: "profile" | "core";
}

export interface Questionnaire {
  version: string;
  title: string;
  sections: InterviewSection[];
  constructs: ResearchConstruct[];
  questions: InterviewQuestion[];
}

export interface ResearchConstruct {
  id: string;
  /** Position in the thesis construct list, 1-10. */
  order: number;
  title: string;
  description: string;
}

/** A single addressable stop in the participant journey. */
export type Step =
  | { kind: "welcome"; id: "welcome" }
  | { kind: "consent"; id: "consent" }
  | { kind: "section"; id: string; section: InterviewSection }
  | { kind: "question"; id: string; question: InterviewQuestion }
  | { kind: "review"; id: "review" }
  | { kind: "complete"; id: "complete" };

/* ----------------------------------------------------------------- state */

export interface ConsentState {
  granted: boolean;
  grantedAt: string | null;
  /** Version of the consent text the participant agreed to. */
  consentVersion: string;
}

export type InterviewStatus = "in_progress" | "submitted";

export interface InterviewState {
  questionnaireVersion: string;
  status: InterviewStatus;
  currentStepId: string;
  responses: ResponseMap;
  consent: ConsentState;
  /** Set while the participant is amending one answer from the review screen. */
  returningToReview: boolean;
  startedAt: string;
  submittedAt: string | null;
}
