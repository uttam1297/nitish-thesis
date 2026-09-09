import { OTHER_OPTION_VALUE, isAnswered } from "@/domain/interview/answers";
import type {
  InterviewQuestion,
  QuestionResponse,
} from "@/domain/interview/types";

export interface AnswerSummary {
  questionId: string;
  title: string;
  prompt: string;
  section: string;
  /** Participant-readable rendering of the stored answer. */
  text: string;
  state: "answered" | "skipped" | "unanswered";
  required: boolean;
}

function labelFor(question: InterviewQuestion, value: string): string {
  if (value === OTHER_OPTION_VALUE) return "Other";
  if (!("options" in question)) return value;
  return (
    question.options.find((option) => option.value === value)?.label ?? value
  );
}

/** Renders one stored answer as text for the review screen. */
export function formatAnswer(
  question: InterviewQuestion,
  response: QuestionResponse | undefined
): string {
  const value = response?.value;
  if (!value) return "";

  switch (value.kind) {
    case "choice": {
      const label = labelFor(question, value.value);
      return value.value === OTHER_OPTION_VALUE && value.otherText
        ? `Other: ${value.otherText}`
        : label;
    }
    case "choices": {
      const labels = value.values.map((item) =>
        item === OTHER_OPTION_VALUE && value.otherText
          ? `Other: ${value.otherText}`
          : labelFor(question, item)
      );
      return labels.join(", ");
    }
    case "scale": {
      if (!Number.isFinite(value.value)) return "";
      if (question.responseType !== "likert_scale") return String(value.value);
      const anchor =
        value.value === question.min
          ? question.minLabel
          : value.value === question.max
            ? question.maxLabel
            : undefined;
      const range = `${value.value} of ${question.max}`;
      return anchor ? `${range} — ${anchor}` : range;
    }
    case "ranking":
      return value.order
        .map((item, index) => `${index + 1}. ${labelFor(question, item)}`)
        .join("  ");
    case "text":
      return value.text.trim();
  }
}

export function summarise(
  questions: InterviewQuestion[],
  responses: Record<string, QuestionResponse>
): AnswerSummary[] {
  return questions.map((question) => {
    const response = responses[question.id];
    const answered = isAnswered(response);

    return {
      questionId: question.id,
      title: question.title,
      prompt: question.prompt,
      section: question.section,
      text: formatAnswer(question, response),
      state: answered
        ? "answered"
        : response?.skipped
          ? "skipped"
          : "unanswered",
      required: question.required,
    };
  });
}
