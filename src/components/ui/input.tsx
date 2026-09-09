import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border bg-surface px-3 text-base text-foreground transition-colors duration-(--duration-fast) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
