"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { CompletionLineArt } from "@/components/illustration/line-art";
import { studyContent } from "@/config/interview/study-content";
import { motionTransitions } from "@/lib/motion";

interface CompletionScreenProps {
  participantCode: string | null;
}

export function CompletionScreen({ participantCode }: CompletionScreenProps) {
  const reduceMotion = useReducedMotion();
  const { completion } = studyContent;

  return (
    <section className="relative mx-auto max-w-lg overflow-hidden py-8 text-center">
      <CompletionLineArt className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-full text-primary/10" />
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionTransitions.emphasized}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check aria-hidden="true" className="size-6" />
        </motion.div>
        <div className="grid gap-3">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-balance sm:text-3xl">
            {completion.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {completion.description}
          </p>
        </div>

        {participantCode && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTransitions.base, delay: 0.15 }}
            className="grid gap-1 rounded-lg border bg-surface-subtle px-5 py-3"
          >
            <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {completion.codeLabel}
            </p>
            <p className="font-mono text-lg font-medium tracking-wide">
              {participantCode}
            </p>
          </motion.div>
        )}

        <p className="text-sm text-muted-foreground">
          {completion.localNotice}
        </p>

        <p className="text-sm text-muted-foreground">
          {completion.contactLabel}{" "}
          <a
            href={`mailto:${completion.contactEmail}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {completion.contactEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
