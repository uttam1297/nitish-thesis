"use client";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useInterview } from "@/features/interview/interview-provider";
import type { InterviewSection } from "@/domain/interview/types";

interface SectionTransitionScreenProps {
  section: InterviewSection;
}

export function SectionTransitionScreen({
  section,
}: SectionTransitionScreenProps) {
  const interview = useInterview();
  const index = interview.questionnaire.sections.findIndex(
    (item) => item.id === section.id
  );
  const previous =
    index > 0 ? interview.questionnaire.sections[index - 1] : null;

  return (
    <Surface className="mx-auto max-w-lg p-6 text-center sm:p-10">
      <div className="flex flex-col items-center gap-7">
        <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </div>
        <div className="flex flex-col gap-2">
          {previous && (
            <p className="text-sm text-muted-foreground">
              Completed: {previous.title}
            </p>
          )}
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Next section
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance">
            {section.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {section.summary}
          </p>
        </div>
        <Button onClick={interview.goNext}>Continue</Button>
      </div>
    </Surface>
  );
}
