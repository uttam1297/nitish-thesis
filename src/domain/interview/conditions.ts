import { isAnswered } from "@/domain/interview/answers";
import type { ConditionRule, ResponseMap } from "@/domain/interview/types";

/** Every value selected/entered for a stored answer, as strings. */
function valuesOf(response: ResponseMap[string] | undefined): string[] {
  const value = response?.value;
  if (!value) return [];
  switch (value.kind) {
    case "choice":
      return [value.value];
    case "choices":
      return value.values;
    case "scale":
      return [String(value.value)];
    case "ranking":
      return value.order;
    case "text":
      return [value.text];
  }
}

function numberOf(response: ResponseMap[string] | undefined): number | null {
  const value = response?.value;
  if (value?.kind !== "scale") return null;
  return Number.isFinite(value.value) ? value.value : null;
}

function evaluateRule(rule: ConditionRule, responses: ResponseMap): boolean {
  const response = responses[rule.questionId];

  if (rule.operator === "answered") return isAnswered(response);

  const values = valuesOf(response);

  switch (rule.operator) {
    case "equals":
      return values.length === 1 && values[0] === String(rule.value);
    case "notEquals":
      return !(values.length === 1 && values[0] === String(rule.value));
    case "includes":
      return values.includes(String(rule.value));
    case "excludes":
      return !values.includes(String(rule.value));
    case "gte": {
      const numeric = numberOf(response);
      return numeric !== null && typeof rule.value === "number"
        ? numeric >= rule.value
        : false;
    }
    case "lte": {
      const numeric = numberOf(response);
      return numeric !== null && typeof rule.value === "number"
        ? numeric <= rule.value
        : false;
    }
  }
}

/** A question with no rules is always visible; otherwise every rule must hold. */
export function isQuestionVisible(
  rules: ConditionRule[] | undefined,
  responses: ResponseMap
): boolean {
  if (!rules || rules.length === 0) return true;
  return rules.every((rule) => evaluateRule(rule, responses));
}
