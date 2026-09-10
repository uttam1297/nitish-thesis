import type { ReactNode } from "react";

import { SectionHeading } from "@/components/interview/section-heading";
import { Surface } from "@/components/ui/surface";

interface QuestionContainerProps {
  headingId: string;
  section: string;
  prompt: string;
  supportingText?: string;
  supportingTextId?: string;
  /** Navigation controls, pinned below the scrollable body so Continue is
   * always reachable without scrolling the page. */
  footer: ReactNode;
  children: ReactNode;
}

export function QuestionContainer({
  headingId,
  section,
  prompt,
  supportingText,
  supportingTextId,
  footer,
  children,
}: QuestionContainerProps) {
  return (
    <Surface className="mx-auto flex w-full max-w-(--width-reading) flex-col overflow-hidden p-0 max-h-[min(42rem,calc(100dvh-10rem))]">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-7">
        <div className="flex flex-col gap-2.5">
          <SectionHeading>{section}</SectionHeading>
          <h1
            id={headingId}
            className="text-xl leading-snug font-medium tracking-[-0.015em] text-balance sm:text-2xl"
          >
            {prompt}
          </h1>
          {supportingText && (
            <p
              id={supportingTextId}
              className="max-w-prose text-sm leading-relaxed text-muted-foreground"
            >
              {supportingText}
            </p>
          )}
        </div>
        {children}
      </div>
      <div className="shrink-0 border-t bg-surface px-5 py-4 sm:px-7">
        {footer}
      </div>
    </Surface>
  );
}
