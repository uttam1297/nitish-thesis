import type {
  AnswerValueOfType,
  QuestionOfType,
  ResponseMethod,
  ResponseType,
} from "@/domain/interview/types";

export interface ResponseFieldProps<T extends ResponseType = ResponseType> {
  question: QuestionOfType<T>;
  value: AnswerValueOfType<T>;
  onChange: (value: AnswerValueOfType<T>, method: ResponseMethod) => void;
  /** Id of the question heading, so controls inherit the prompt as their label. */
  labelledBy: string;
  describedBy?: string;
  invalid: boolean;
}
