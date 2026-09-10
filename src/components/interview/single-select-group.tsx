"use client";

import { motion, useReducedMotion } from "motion/react";

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
  const reduceMotion = useReducedMotion();

  const dense = options.length > 5;

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn("grid gap-2", dense && "sm:grid-cols-2 sm:gap-2.5")}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
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
              className="size-4 accent-primary"
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
            />
            <span className="font-medium">{option.label}</span>
          </motion.label>
        );
      })}
    </div>
  );
}
