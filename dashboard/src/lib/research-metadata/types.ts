export type QuestionnaireVersion = "1.3.0" | "1.4.0" | "1.5.0";

export type CurrentQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q10"
  | "q11"
  | "q12"
  | "q13"
  | "q14"
  | "q15"
  | "q16"
  | "q17";

export type ResearchConstructId =
  | "discovery-behaviour"
  | "journey-evidence"
  | "ai-use-and-channels"
  | "competitive-risk"
  | "exposure-and-consequences"
  | "organisational-response"
  | "prioritisation"
  | "governance"
  | "measurement"
  | "capability-requirements";

export type InterviewSectionId =
  | "about-you"
  | "observed-change"
  | "risk-exposure"
  | "organisational-response"
  | "measurement-outlook";

export type QuestionResponseType =
  "multi_select" | "single_select" | "likert_scale" | "voice_or_text";

export type AnswerShapeMetadata =
  | Readonly<{
      kind: "choices";
      values: "string[]";
      otherText: "string | undefined";
    }>
  | Readonly<{
      kind: "choice";
      value: "string";
      otherText: "string | undefined";
    }>
  | Readonly<{ kind: "scale"; value: "number" }>
  | Readonly<{ kind: "text"; text: "string" }>;

export type QuestionOption = Readonly<{
  value: string;
  label: string;
}>;

export type OtherOptionMetadata = Readonly<{
  enabled: true;
  value: "__other__";
  requiresText: true;
}>;

export type QuestionVisibilityRule = Readonly<{
  questionId: "q1";
  operator: "notEquals";
  value: "engineering";
  semantics: "not-exactly-one-selected-value";
}>;

type QuestionBase = Readonly<{
  id: CurrentQuestionId;
  questionnaireVersion: QuestionnaireVersion;
  questionVersion: "1";
  sourceRef: `Q${number}`;
  section: InterviewSectionId;
  construct: ResearchConstructId;
  wording: string;
  hint?: string;
  required: boolean;
  visibility?: QuestionVisibilityRule;
}>;

export type MultiSelectQuestionMetadata = QuestionBase &
  Readonly<{
    responseType: "multi_select";
    responseShape: Extract<AnswerShapeMetadata, { kind: "choices" }>;
    options: readonly QuestionOption[];
    otherOption: OtherOptionMetadata;
    validation: Readonly<{ minimumSelections: number }>;
  }>;

export type SingleSelectQuestionMetadata = QuestionBase &
  Readonly<{
    responseType: "single_select";
    responseShape: Extract<AnswerShapeMetadata, { kind: "choice" }>;
    options: readonly QuestionOption[];
    otherOption?: OtherOptionMetadata;
  }>;

export type ScaleQuestionMetadata = QuestionBase &
  Readonly<{
    responseType: "likert_scale";
    responseShape: Extract<AnswerShapeMetadata, { kind: "scale" }>;
    scale: Readonly<{
      minimum: number;
      maximum: number;
      minimumLabel: string;
      maximumLabel: string;
    }>;
  }>;

export type NarrativeQuestionMetadata = QuestionBase &
  Readonly<{
    responseType: "voice_or_text";
    responseShape: Extract<AnswerShapeMetadata, { kind: "text" }>;
    input: Readonly<{ voice: boolean; text: true }>;
    allowNotApplicable?: true;
    validation: Readonly<{ minimumNonWhitespaceCharacters: number }>;
  }>;

export type QuestionMetadata =
  | MultiSelectQuestionMetadata
  | SingleSelectQuestionMetadata
  | ScaleQuestionMetadata
  | NarrativeQuestionMetadata;

export type ResearchConstructMetadata = Readonly<{
  id: ResearchConstructId;
  order: number;
  title: string;
  description: string;
}>;

export type QuestionnaireMetadata = Readonly<{
  version: QuestionnaireVersion;
  title: string;
  questionIds: readonly CurrentQuestionId[];
  questions: readonly QuestionMetadata[];
  constructs: readonly ResearchConstructMetadata[];
}>;

export type ChoicesAnswer = Readonly<{
  kind: "choices";
  values: readonly string[];
  otherText?: string;
}>;
