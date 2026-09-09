"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/domain/interview/types";

interface MultiSelectGroupProps {
  name: string;
  options: QuestionOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  labelledBy: string;
}

export function MultiSelectGroup({
  name,
  options,
  values,
  onValuesChange,
  labelledBy,
}: MultiSelectGroupProps) {
  function toggle(optionValue: string, checked: boolean) {
    onValuesChange(
      checked
        ? [...values, optionValue]
        : values.filter((value) => value !== optionValue)
    );
  }

  return (
    <fieldset aria-labelledby={labelledBy} className="grid gap-2">
      <legend className="sr-only">Select all that apply</legend>
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm transition-[background-color,border-color,transform] duration-(--duration-fast) hover:bg-surface-subtle focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/35 active:scale-[0.995]",
              checked && "border-primary bg-accent text-accent-foreground"
            )}
          >
            <input
              className="size-4 rounded accent-primary"
              type="checkbox"
              name={name}
              value={option.value}
              checked={checked}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            <span className="font-medium">{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
