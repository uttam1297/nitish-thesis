import type {
  AnswerValue,
  InterviewQuestion,
  QuestionResponse,
  ResponseMap,
} from "@/domain/interview/types";

export const OTHER_OPTION_VALUE = "__other__";

/** Empty answer for a question, used when a field first mounts. */
export function emptyAnswer(question: InterviewQuestion): AnswerValue {
  switch (question.responseType) {
    case "single_select":
      return { kind: "choice", value: "" };
    case "multi_select":
      return { kind: "choices", values: [] };
    case "likert_scale":
      return { kind: "scale", value: Number.NaN };
    case "ranking":
      return { kind: "ranking", order: [] };
    default:
      return { kind: "text", text: "" };
  }
}

export function answerFor(
  responses: ResponseMap,
  question: InterviewQuestion
): AnswerValue {
  const stored = responses[question.id]?.value;
  return stored ?? emptyAnswer(question);
}

export function isAnswered(response: QuestionResponse | undefined): boolean {
  if (!response || response.skipped || !response.value) return false;
  const value = response.value;
  switch (value.kind) {
    case "choice":
      return value.value.length > 0;
    case "choices":
      return value.values.length > 0;
    case "ranking":
      return value.order.length > 0;
    case "scale":
      return Number.isFinite(value.value);
    case "text":
      return value.text.trim().length > 0;
  }
}

/** True when the participant has either answered or deliberately skipped. */
export function isResolved(response: QuestionResponse | undefined): boolean {
  return Boolean(response?.skipped) || isAnswered(response);
}

/**
 * Validates one answer against its question configuration.
 * Returns a participant-facing message, or null when the answer may be kept.
 */
export function validateAnswer(
  question: InterviewQuestion,
  value: AnswerValue | null
): string | null {
  const answered = isAnswered({
    questionId: question.id,
    value,
    method: null,
    skipped: false,
    updatedAt: "",
  });

  if (!answered) {
    return question.required ? "Please answer before continuing." : null;
  }
  if (!value) return null;

  switch (question.responseType) {
    case "single_select": {
      if (value.kind !== "choice") return null;
      if (
        question.allowOther &&
        value.value === OTHER_OPTION_VALUE &&
        !value.otherText?.trim()
      ) {
        return "Please describe your answer in the “Other” field.";
      }
      return null;
    }

    case "multi_select": {
      if (value.kind !== "choices") return null;
      const { minSelections, maxSelections } = question.validation ?? {};
      if (minSelections !== undefined && value.values.length < minSelections) {
        return `Please select at least ${minSelections} option${minSelections === 1 ? "" : "s"}.`;
      }
      if (maxSelections !== undefined && value.values.length > maxSelections) {
        return `Please select no more than ${maxSelections} options.`;
      }
      if (
        question.allowOther &&
        value.values.includes(OTHER_OPTION_VALUE) &&
        !value.otherText?.trim()
      ) {
        return "Please describe your answer in the “Other” field.";
      }
      return null;
    }

    case "likert_scale": {
      if (value.kind !== "scale") return null;
      if (value.value < question.min || value.value > question.max) {
        return "Please choose a point on the scale.";
      }
      return null;
    }

    case "ranking": {
      if (value.kind !== "ranking") return null;
      const { minSelections, maxSelections } = question.validation ?? {};
      if (minSelections !== undefined && value.order.length < minSelections) {
        return `Please rank at least ${minSelections} option${minSelections === 1 ? "" : "s"}.`;
      }
      if (maxSelections !== undefined && value.order.length > maxSelections) {
        return `Please rank no more than ${maxSelections} options.`;
      }
      return null;
    }

    default: {
      if (value.kind !== "text") return null;
      const { minLength, maxLength } = question.validation ?? {};
      const length = value.text.trim().length;
      if (minLength !== undefined && length < minLength) {
        return `Please write at least ${minLength} characters.`;
      }
      if (maxLength !== undefined && length > maxLength) {
        return `Please keep your answer under ${maxLength} characters.`;
      }
      return null;
    }
  }
}
