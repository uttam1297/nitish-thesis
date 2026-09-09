import type { ReactNode } from "react";

import { SectionHeading } from "@/components/interview/section-heading";
import { Surface } from "@/components/ui/surface";

interface QuestionContainerProps {
  headingId: string;
  section: string;
  prompt: string;
  supportingText?: string;
  supportingTextId?: string;
  children: ReactNode;
}

export function QuestionContainer({
  headingId,
  section,
  prompt,
  supportingText,
  supportingTextId,
  children,
}: QuestionContainerProps) {
  return (
    <Surface className="mx-auto w-full max-w-(--width-reading) p-5 sm:p-8">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <SectionHeading>{section}</SectionHeading>
          <h1
            id={headingId}
            className="text-2xl leading-tight font-semibold tracking-[-0.025em] text-balance sm:text-3xl"
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
    </Surface>
  );
}
