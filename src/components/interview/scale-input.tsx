"use client";

import { cn } from "@/lib/utils";

interface ScaleInputProps {
  name: string;
  min: number;
  max: number;
  value?: number;
  minLabel?: string;
  maxLabel?: string;
  labelledBy: string;
  onValueChange?: (value: number) => void;
}

export function ScaleInput({
  name,
  min,
  max,
  value,
  minLabel,
  maxLabel,
  labelledBy,
  onValueChange,
}: ScaleInputProps) {
  const points = Array.from(
    { length: max - min + 1 },
    (_, index) => min + index
  );

  return (
    <div>
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="flex items-center justify-between gap-2"
      >
        {points.map((point) => (
          <label
            key={point}
            className={cn(
              "relative flex size-11 cursor-pointer items-center justify-center rounded-full border bg-surface text-sm font-semibold transition-colors duration-(--duration-fast) hover:bg-surface-subtle focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/35",
              value === point &&
                "border-primary bg-primary text-primary-foreground"
            )}
          >
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={point}
              checked={value === point}
              onChange={() => onValueChange?.(point)}
            />
            {point}
          </label>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{minLabel}</span>
          <span className="text-right">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
