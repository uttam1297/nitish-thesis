import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-md border bg-surface px-3 py-3 text-base leading-relaxed text-foreground transition-colors duration-(--duration-fast) placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none sm:text-sm",
        className
      )}
      {...props}
    />
  );
}
