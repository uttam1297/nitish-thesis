"use client";

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
    <section className="relative mx-auto max-w-lg py-8 text-center">
      <CompletionLineArt className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-32 w-full text-primary/15" />
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: [0.72, 1.08, 1] }
          }
          transition={{
            ...motionTransitions.emphasized,
            delay: reduceMotion ? 0 : 0.62,
          }}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="m5 12 4 4L19 6"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : 1.02,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </motion.svg>
        </motion.div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTransitions.emphasized,
            delay: reduceMotion ? 0 : 1.06,
          }}
          className="grid gap-3"
        >
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-balance sm:text-3xl">
            {completion.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {completion.description}
          </p>
        </motion.div>

        {participantCode && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...motionTransitions.base,
              delay: reduceMotion ? 0 : 1.1,
            }}
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

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTransitions.base,
            delay: reduceMotion ? 0 : 1.14,
          }}
          className="text-sm text-muted-foreground"
        >
          {completion.localNotice}
        </motion.p>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTransitions.base,
            delay: reduceMotion ? 0 : 1.2,
          }}
          className="text-sm text-muted-foreground"
        >
          {completion.contactLabel}{" "}
          <a
            href={`mailto:${completion.contactEmail}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {completion.contactEmail}
          </a>
        </motion.p>
      </div>
    </section>
  );
}
