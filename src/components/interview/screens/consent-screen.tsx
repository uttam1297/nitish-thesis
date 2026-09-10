"use client";

import { CheckCircle2 } from "lucide-react";
import { useId, useState } from "react";

import { NavigationControls } from "@/components/interview/navigation-controls";
import { StatusMessage } from "@/components/feedback/status-message";
import { Surface } from "@/components/ui/surface";
import { studyContent } from "@/config/interview/study-content";
import { useInterview } from "@/features/interview/interview-provider";

export function ConsentScreen() {
  const interview = useInterview();
  const consentId = useId();
  const [error, setError] = useState(false);
  const { consent } = studyContent;
  const granted = interview.state.consent.granted;

  return (
    <Surface className="mx-auto flex w-full max-w-(--width-reading) flex-col overflow-hidden p-0 max-h-[min(38rem,calc(100dvh-10rem))]">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-7">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {consent.eyebrow}
          </p>
          <h1 className="text-xl font-medium tracking-[-0.015em] sm:text-2xl">
            {consent.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {consent.introduction}
          </p>
        </div>

        <ul className="grid gap-2 text-sm leading-snug">
          {consent.statements.map((statement) => (
            <li key={statement} className="flex items-start gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>{statement}</span>
            </li>
          ))}
        </ul>

        <p className="rounded-md bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {consent.caution}
        </p>

        <label
          htmlFor={consentId}
          className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border bg-surface px-4 py-3 text-sm font-medium focus-within:border-ring focus-within:outline-3 focus-within:outline-ring/35"
        >
          <input
            id={consentId}
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            checked={granted}
            onChange={(event) => {
              setError(false);
              interview.setConsent(event.target.checked);
            }}
          />
          <span>{consent.agreement}</span>
        </label>

        {error && (
          <StatusMessage variant="warning">{consent.required}</StatusMessage>
        )}
      </div>

      <div className="shrink-0 border-t bg-surface px-5 py-4 sm:px-7">
        <NavigationControls
          onBack={interview.goBack}
          onContinue={() => {
            if (!granted) {
              setError(true);
              return;
            }
            interview.goNext();
          }}
        />
      </div>
    </Surface>
  );
}
