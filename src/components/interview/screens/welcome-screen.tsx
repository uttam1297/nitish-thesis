"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { studyContent } from "@/config/interview/study-content";
import { useInterview } from "@/features/interview/interview-provider";
import { motionTransitions } from "@/lib/motion";

export function WelcomeScreen() {
  const interview = useInterview();
  const reduceMotion = useReducedMotion();
  const { welcome } = studyContent;

  return (
    <div className="mx-auto flex w-full max-w-(--width-reading) flex-col justify-center gap-5 px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTransitions.emphasized}
        className="flex flex-col gap-3"
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {welcome.eyebrow}
        </p>

        <h1 className="text-2xl leading-[1.15] font-medium tracking-[-0.02em] text-balance sm:text-3xl">
          {welcome.title}
        </h1>

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {welcome.introduction}
        </p>
      </motion.div>

      {interview.hasResumableDraft ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTransitions.base,
            delay: reduceMotion ? 0 : 0.1,
          }}
          className="rounded-lg border bg-surface-subtle p-4"
        >
          <h2 className="text-sm font-medium">{welcome.resume.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {welcome.resume.description}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-3">
            <Button onClick={interview.resumeDraft}>
              {welcome.resume.continueLabel}
            </Button>
            <Button variant="secondary" onClick={interview.startOver}>
              {welcome.resume.startOverLabel}
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTransitions.base,
            delay: reduceMotion ? 0 : 0.1,
          }}
        >
          <Button size="large" onClick={interview.goNext}>
            {welcome.startLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </motion.div>
      )}

      <motion.ul
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          ...motionTransitions.base,
          delay: reduceMotion ? 0 : 0.18,
        }}
        className="flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:gap-5"
      >
        {welcome.highlights.map((highlight) => (
          <li key={highlight} className="flex items-center gap-1.5">
            <span className="size-1 shrink-0 rounded-full bg-primary/40" />
            {highlight}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
