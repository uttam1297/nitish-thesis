"use client";

import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/domain/interview/types";

interface SingleSelectGroupProps {
  name: string;
  options: QuestionOption[];
  value: string;
  onValueChange: (value: string) => void;
  labelledBy: string;
}

export function SingleSelectGroup({
  name,
  options,
  value,
  onValueChange,
  labelledBy,
}: SingleSelectGroupProps) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-3 text-sm transition-[background-color,border-color,transform] duration-(--duration-fast) hover:bg-surface-subtle focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/35 active:scale-[0.995]",
              checked && "border-primary bg-accent text-accent-foreground"
            )}
          >
            <input
              className="size-4 accent-primary"
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
            />
            <span className="font-medium">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
