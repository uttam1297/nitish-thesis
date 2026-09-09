"use client";

import { ScaleInput } from "@/components/interview/scale-input";
import type { ResponseFieldProps } from "@/components/interview/response/types";

export function LikertScaleField({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
}: ResponseFieldProps<"likert_scale">) {
  return (
    <div aria-describedby={describedBy}>
      <ScaleInput
        name={question.id}
        min={question.min}
        max={question.max}
        minLabel={question.minLabel}
        maxLabel={question.maxLabel}
        labelledBy={labelledBy}
        value={Number.isFinite(value.value) ? value.value : undefined}
        onValueChange={(next) =>
          onChange({ kind: "scale", value: next }, "selected")
        }
      />
    </div>
  );
}
