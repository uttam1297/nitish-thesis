"use client";

import { useId, useState } from "react";

import { StatusMessage } from "@/components/feedback/status-message";
import { NavigationControls } from "@/components/interview/navigation-controls";
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
    <Surface className="mx-auto max-w-(--width-reading) p-5 sm:p-8">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {consent.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
            {consent.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {consent.introduction}
          </p>
        </div>

        <ul className="grid gap-3">
          {consent.statements.map((statement) => (
            <li
              key={statement}
              className="rounded-md border bg-surface-subtle px-4 py-3 text-sm leading-relaxed"
            >
              {statement}
            </li>
          ))}
        </ul>

        <StatusMessage variant="info">{consent.caution}</StatusMessage>

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
