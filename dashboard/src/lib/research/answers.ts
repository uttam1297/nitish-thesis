import type { QuestionMetadata } from "../research-metadata";

export type ValidAnswer =
  | Readonly<{ kind: "choice"; value: string; otherText?: string }>
  | Readonly<{ kind: "choices"; values: readonly string[]; otherText?: string }>
  | Readonly<{ kind: "scale"; value: number }>
  | Readonly<{ kind: "text"; text: string }>;

export type AnswerValidation =
  | Readonly<{ valid: true; answer: ValidAnswer }>
  | Readonly<{ valid: false; diagnostic: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalOtherText(value: Record<string, unknown>): string | undefined {
  return typeof value.otherText === "string" && value.otherText.trim()
    ? value.otherText.trim()
    : undefined;
}

export function validateResponseValue(
  value: unknown,
  question: QuestionMetadata
): AnswerValidation {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return {
      valid: false,
      diagnostic: "Expected a response object with a kind.",
    };
  }

  if (question.responseType === "multi_select") {
    if (
      value.kind !== "choices" ||
      !Array.isArray(value.values) ||
      value.values.length < question.validation.minimumSelections ||
      !value.values.every((item) => typeof item === "string")
    ) {
      return {
        valid: false,
        diagnostic: "Expected one or more string choices.",
      };
    }
    return {
      valid: true,
      answer: {
        kind: "choices",
        values: value.values,
        ...(optionalOtherText(value)
          ? { otherText: optionalOtherText(value) }
          : {}),
      },
    };
  }

  if (question.responseType === "single_select") {
    if (value.kind !== "choice" || typeof value.value !== "string") {
      return { valid: false, diagnostic: "Expected one string choice." };
    }
    return {
      valid: true,
      answer: {
        kind: "choice",
        value: value.value,
        ...(optionalOtherText(value)
          ? { otherText: optionalOtherText(value) }
          : {}),
      },
    };
  }

  if (question.responseType === "likert_scale") {
    if (
      value.kind !== "scale" ||
      typeof value.value !== "number" ||
      !Number.isInteger(value.value) ||
      value.value < question.scale.minimum ||
      value.value > question.scale.maximum
    ) {
      return {
        valid: false,
        diagnostic: "Expected an integer inside the configured scale.",
      };
    }
    return { valid: true, answer: { kind: "scale", value: value.value } };
  }

  if (
    value.kind !== "text" ||
    typeof value.text !== "string" ||
    value.text.trim().length <
      question.validation.minimumNonWhitespaceCharacters
  ) {
    return { valid: false, diagnostic: "Expected non-empty narrative text." };
  }
  return { valid: true, answer: { kind: "text", text: value.text.trim() } };
}

function optionLabel(
  question: QuestionMetadata,
  value: string,
  otherText?: string
): string {
  if (value === "__other__")
    return otherText ? `Other — ${otherText}` : "Other";
  if (
    question.responseType !== "multi_select" &&
    question.responseType !== "single_select"
  ) {
    return value;
  }
  return (
    question.options.find((option) => option.value === value)?.label ??
    `Unknown option (${value})`
  );
}

export function answerToReadable(
  answer: ValidAnswer,
  question: QuestionMetadata
): string {
  if (answer.kind === "choice")
    return optionLabel(question, answer.value, answer.otherText);
  if (answer.kind === "choices") {
    return answer.values
      .map((value) => optionLabel(question, value, answer.otherText))
      .join(", ");
  }
  if (answer.kind === "scale") {
    return question.responseType === "likert_scale"
      ? `${answer.value} of ${question.scale.maximum}`
      : String(answer.value);
  }
  return answer.text;
}
