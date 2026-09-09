import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface shadow-(--shadow-surface)",
        className
      )}
      {...props}
    />
  );
}
