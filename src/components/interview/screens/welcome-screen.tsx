"use client";

import {
  ArrowRight,
  Clock3,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import htwLogo from "@/assets/htw-logo.png";
import { DiscoveryLineArt } from "@/components/illustration/line-art";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { studyContent } from "@/config/interview/study-content";
import { useInterview } from "@/features/interview/interview-provider";
import { motionTransitions } from "@/lib/motion";

const icons = [Clock3, MessageSquareText, ShieldCheck];

export function WelcomeScreen() {
  const interview = useInterview();
  const reduceMotion = useReducedMotion();
  const { welcome } = studyContent;

  return (
    <Surface className="mx-auto w-full max-w-(--width-interview) overflow-hidden border-none shadow-none">
      <div className="relative mx-auto max-w-(--width-reading) overflow-hidden px-2 pt-6 sm:pt-8">
        <DiscoveryLineArt className="pointer-events-none absolute -top-6 -right-10 size-48 text-primary/10 sm:size-64" />
        <div className="relative flex flex-col gap-3">
          <div className="flex items-start justify-between gap-6">
            <p className="pt-1 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {welcome.eyebrow}
            </p>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTransitions.emphasized}
              className="relative z-10 -mt-2 w-24 shrink-0 sm:w-28"
            >
              <Image
                src={htwLogo}
                alt="HTW Berlin University of Applied Sciences"
                priority
                sizes="(min-width: 640px) 112px, 96px"
                className="h-auto w-full"
              />
            </motion.div>
          </div>
          <h1 className="max-w-md text-2xl leading-[1.15] font-medium tracking-[-0.02em] text-balance sm:text-3xl">
            {welcome.title}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {welcome.introduction}
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-(--width-reading) flex-col gap-5 px-2 pt-5 pb-6">
        {interview.hasResumableDraft && (
          <div className="grid gap-3 rounded-lg border bg-surface-subtle p-4">
            <h2 className="text-sm font-medium">{welcome.resume.title}</h2>
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
          </div>
        )}

        <ul className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {welcome.highlights.map((highlight, index) => {
            const Icon = icons[index];
            return (
              <motion.li
                key={highlight}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...motionTransitions.base,
                  delay: reduceMotion ? 0 : index * 0.06,
                }}
                className="flex items-center gap-2.5 rounded-lg bg-surface-subtle px-3 py-2.5 text-sm"
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {highlight}
              </motion.li>
            );
          })}
        </ul>

        <details className="group rounded-lg border bg-surface open:bg-surface-subtle">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium select-none focus-visible:outline-3 focus-visible:outline-ring/35">
            {welcome.moreLabel}
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-transform duration-(--duration-fast) group-open:rotate-180"
            >
              ⌄
            </span>
          </summary>
          <div className="grid gap-3 border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {welcome.more.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="text-xs font-medium tracking-[0.08em] text-foreground/70 uppercase">
              The study aims to understand
            </p>
            <ul className="grid gap-1.5">
              {welcome.more.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        {!interview.hasResumableDraft && (
          <div>
            <Button size="large" onClick={interview.goNext}>
              {welcome.startLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </Surface>
  );
}
