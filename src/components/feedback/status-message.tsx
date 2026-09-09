import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusVariant = "info" | "success" | "warning";

interface StatusMessageProps {
  variant?: StatusVariant;
  children: ReactNode;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
} satisfies Record<StatusVariant, typeof Info>;

export function StatusMessage({
  variant = "info",
  children,
}: StatusMessageProps) {
  const Icon = icons[variant];

  return (
    <div
      role={variant === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
        variant === "success" && "border-success/25 bg-success/5",
        variant === "warning" && "border-danger/25 bg-danger/5",
        variant === "info" && "bg-surface-subtle"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          variant === "success" && "text-success",
          variant === "warning" && "text-danger",
          variant === "info" && "text-muted-foreground"
        )}
      />
      <span>{children}</span>
    </div>
  );
}
