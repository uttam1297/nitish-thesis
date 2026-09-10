"use client";

import { motion, useReducedMotion } from "motion/react";

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
  const reduceMotion = useReducedMotion();

  function toggle(optionValue: string, checked: boolean) {
    onValuesChange(
      checked
        ? [...values, optionValue]
        : values.filter((value) => value !== optionValue)
    );
  }

  const dense = options.length > 5;

  return (
    <fieldset
      aria-labelledby={labelledBy}
      className={cn("grid gap-2", dense && "sm:grid-cols-2 sm:gap-2.5")}
    >
      <legend className="sr-only">Select all that apply</legend>
      {options.map((option, index) => {
        const checked = values.includes(option.value);
        return (
          <motion.label
            key={option.value}
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.16,
              delay: reduceMotion ? 0 : index * 0.03,
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-2.5 text-sm transition-[background-color,border-color] duration-(--duration-fast) hover:bg-surface-subtle focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/35",
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
          </motion.label>
        );
      })}
    </fieldset>
  );
}
