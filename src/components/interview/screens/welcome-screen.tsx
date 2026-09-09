"use client";

import {
  ArrowRight,
  Clock3,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { studyContent } from "@/config/interview/study-content";
import { useInterview } from "@/features/interview/interview-provider";

const icons = [Clock3, MessageSquareText, ShieldCheck];

export function WelcomeScreen() {
  const interview = useInterview();
  const { welcome } = studyContent;

  return (
    <section className="mx-auto max-w-(--width-reading) py-4 sm:py-8">
      <div className="flex flex-col gap-8">
        {interview.hasResumableDraft && (
          <Surface className="grid gap-3 p-5">
            <h2 className="text-sm font-semibold">{welcome.resume.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {welcome.resume.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={interview.resumeDraft}>
                {welcome.resume.continueLabel}
              </Button>
              <Button variant="secondary" onClick={interview.startOver}>
                {welcome.resume.startOverLabel}
              </Button>
            </div>
          </Surface>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {welcome.eyebrow}
          </p>
          <h1 className="text-3xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            {welcome.title}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            {welcome.introduction}
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {welcome.highlights.map((highlight, index) => {
            const Icon = icons[index];
            return (
              <li
                key={highlight}
                className="flex items-start gap-3 rounded-lg border bg-surface px-4 py-4 text-sm shadow-sm"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                {highlight}
              </li>
            );
          })}
        </ul>

        <div className="grid gap-4">
          {welcome.body.map((paragraph) => (
            <p
              key={paragraph}
              className="max-w-prose text-sm leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <Surface className="p-5">
          <h2 className="text-sm font-semibold">{welcome.aims.title}</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted-foreground">
            {welcome.aims.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Surface>

        {!interview.hasResumableDraft && (
          <div>
            <Button size="large" onClick={interview.goNext}>
              {welcome.startLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
