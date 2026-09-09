import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  "aria-labelledby": string;
}

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}
