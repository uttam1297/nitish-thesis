"use client";

import { Check, Mic, RotateCcw, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import type { VoiceInputState } from "@/features/voice/use-voice-input";
import { motionTransitions } from "@/lib/motion";

interface VoiceButtonProps {
  state: VoiceInputState;
  elapsedSeconds?: number;
  onStart: () => void;
  onStop: () => void;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VoiceButton({
  state,
  elapsedSeconds = 0,
  onStart,
  onStop,
}: VoiceButtonProps) {
  const reduceMotion = useReducedMotion();
  const listening = state === "listening";
  const completed = state === "completed";
  const errored = state === "error";

  if (state === "unsupported") return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="secondary"
        onClick={listening ? onStop : onStart}
        aria-pressed={listening}
      >
        <span className="relative flex size-4 items-center justify-center">
          {listening && !reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute size-4 rounded-full bg-danger/30"
              animate={{ scale: [1, 1.75], opacity: [0.45, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {listening && reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute size-4 rounded-full bg-danger/30"
              animate={{ opacity: 0.4 }}
              transition={motionTransitions.fast}
            />
          )}
          {listening ? (
            <Square
              aria-hidden="true"
              className="relative size-3 fill-danger text-danger"
            />
          ) : completed ? (
            <Check
              aria-hidden="true"
              className="relative size-4 text-success"
            />
          ) : errored ? (
            <RotateCcw aria-hidden="true" className="relative size-4" />
          ) : (
            <Mic aria-hidden="true" className="relative size-4" />
          )}
        </span>
        {listening
          ? `Listening… ${formatElapsed(elapsedSeconds)}`
          : completed
            ? "Answer captured"
            : errored
              ? "Try speaking again"
              : "Speak answer"}
      </Button>

      <span role="status" aria-live="polite" className="sr-only">
        {listening
          ? "Listening for your answer"
          : completed
            ? "Voice answer captured and ready to edit"
            : ""}
      </span>
    </div>
  );
}
