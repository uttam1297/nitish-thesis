"use client";

import { cn } from "@/lib/utils";
import type { ResponseFieldProps } from "@/components/interview/response/types";
import { Button } from "@/components/ui/button";

/**
 * Ranking without drag and drop.
 *
 * Selecting an option appends it to the ranking and shows its position, so the
 * control works identically with a mouse, a keyboard and a screen reader.
 */
export function RankingField({
  question,
  value,
  onChange,
  labelledBy,
  describedBy,
}: ResponseFieldProps<"ranking">) {
  const order = value.order;
  const limit = question.validation?.maxSelections ?? question.options.length;

  function toggle(optionValue: string) {
    const existing = order.indexOf(optionValue);
    const next =
      existing >= 0
        ? order.filter((item) => item !== optionValue)
        : order.length >= limit
          ? order
          : [...order, optionValue];
    if (next !== order) onChange({ kind: "ranking", order: next }, "selected");
  }

  return (
    <div className="grid gap-3">
      <ul
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="grid gap-2"
      >
        {question.options.map((option) => {
          const rank = order.indexOf(option.value);
          const selected = rank >= 0;
          const atLimit = !selected && order.length >= limit;

          return (
            <li key={option.value}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={atLimit}
                onClick={() => toggle(option.value)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-md border bg-surface px-4 py-3 text-left text-sm font-medium transition-[background-color,border-color] duration-(--duration-fast) hover:bg-surface-subtle focus-visible:border-ring focus-visible:outline-3 focus-visible:outline-ring/35 disabled:opacity-45",
                  selected && "border-primary bg-accent text-accent-foreground"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {selected ? rank + 1 : ""}
                </span>
                <span>{option.label}</span>
                <span className="sr-only">
                  {selected
                    ? `Ranked number ${rank + 1}. Select to remove.`
                    : atLimit
                      ? `Not ranked. Remove another option first, up to ${limit} allowed.`
                      : "Not ranked. Select to add to your ranking."}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-xs text-muted-foreground">
          {order.length === 0
            ? `Choose up to ${limit}, most important first.`
            : `${order.length} of ${limit} ranked.`}
        </p>
        {order.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => onChange({ kind: "ranking", order: [] }, "selected")}
          >
            Clear ranking
          </Button>
        )}
      </div>
    </div>
  );
}
