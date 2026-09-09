"use client";

import { useId } from "react";

import { MultiSelectGroup } from "@/components/interview/multi-select-group";
import { SingleSelectGroup } from "@/components/interview/single-select-group";
import type { ResponseFieldProps } from "@/components/interview/response/types";
import { Label } from "@/components/ui/label";
import { TextInput } from "@/components/ui/input";
import { OTHER_OPTION_VALUE } from "@/domain/interview/answers";
import type { QuestionOption } from "@/domain/interview/types";

const otherOption: QuestionOption = {
  value: OTHER_OPTION_VALUE,
  label: "Other",
};

function withOther(
  options: QuestionOption[],
  allowOther: boolean | undefined
): QuestionOption[] {
  return allowOther ? [...options, otherOption] : options;
}

export function SingleSelectField({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
}: ResponseFieldProps<"single_select">) {
  const otherId = useId();
  const showOther = question.allowOther && value.value === OTHER_OPTION_VALUE;

  return (
    <div className="grid gap-3" aria-describedby={describedBy}>
      <SingleSelectGroup
        name={question.id}
        options={withOther(question.options, question.allowOther)}
        value={value.value}
        labelledBy={labelledBy}
        onValueChange={(next) =>
          onChange(
            { kind: "choice", value: next, otherText: value.otherText },
            "selected"
          )
        }
      />
      {showOther && (
        <div className="grid gap-2">
          <Label htmlFor={otherId}>Please describe</Label>
          <TextInput
            id={otherId}
            value={value.otherText ?? ""}
            onChange={(event) =>
              onChange({ ...value, otherText: event.target.value }, "typed")
            }
          />
        </div>
      )}
    </div>
  );
}

export function MultiSelectField({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
}: ResponseFieldProps<"multi_select">) {
  const otherId = useId();
  const showOther =
    question.allowOther && value.values.includes(OTHER_OPTION_VALUE);

  return (
    <div className="grid gap-3" aria-describedby={describedBy}>
      <MultiSelectGroup
        name={question.id}
        options={withOther(question.options, question.allowOther)}
        values={value.values}
        labelledBy={labelledBy}
        onValuesChange={(next) =>
          onChange(
            { kind: "choices", values: next, otherText: value.otherText },
            "selected"
          )
        }
      />
      {showOther && (
        <div className="grid gap-2">
          <Label htmlFor={otherId}>Please describe</Label>
          <TextInput
            id={otherId}
            value={value.otherText ?? ""}
            onChange={(event) =>
              onChange({ ...value, otherText: event.target.value }, "typed")
            }
          />
        </div>
      )}
    </div>
  );
}
