"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { studyContent } from "@/config/interview/study-content";
import { motionTransitions } from "@/lib/motion";

export function CompletionScreen() {
  const reduceMotion = useReducedMotion();
  const { completion } = studyContent;

  return (
    <section className="mx-auto max-w-lg py-8 text-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionTransitions.emphasized}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check aria-hidden="true" className="size-6" />
        </motion.div>
        <div className="grid gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance">
            {completion.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {completion.description}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {completion.localNotice}
        </p>
      </div>
    </section>
  );
}
