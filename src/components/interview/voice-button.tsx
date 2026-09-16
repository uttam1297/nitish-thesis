"use client";

import { Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { RecordingIndicator } from "@/components/interview/recording-indicator";
import { Button } from "@/components/ui/button";
import type { VoiceStatus } from "@/features/voice/use-voice-input";
import { motionTransitions } from "@/lib/motion";

interface VoiceButtonProps {
  status: VoiceStatus;
  level: number;
  elapsedSeconds: number;
  /** The model is still loading behind an already-running recording. */
  isPreparing: boolean;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<VoiceStatus, string> = {
  unavailable: "",
  preparing: "Preparing voice input…",
  ready: "Answer with voice",
  "requesting-permission": "Starting…",
  recording: "Stop",
  processing: "Processing voice…",
  error: "Try voice again",
};

const ANNOUNCEMENTS: Partial<Record<VoiceStatus, string>> = {
  recording: "Listening. Select stop when you have finished speaking.",
  processing: "Processing your voice answer.",
};

export function VoiceButton({
  status,
  level,
  elapsedSeconds,
  isPreparing,
  onStart,
  onStop,
}: VoiceButtonProps) {
  const reduceMotion = useReducedMotion();
  const recording = status === "recording";
  const busy = status === "requesting-permission" || status === "processing";

  if (status === "unavailable") return null;

  const label = recording && isPreparing ? "Stop" : LABELS[status];

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={recording ? onStop : onStart}
          disabled={busy}
          aria-pressed={recording}
          aria-label={recording ? "Stop voice input" : "Start voice input"}
        >
          <span className="relative flex size-4 items-center justify-center">
            {recording && !reduceMotion && (
              <motion.span
                aria-hidden="true"
                className="absolute size-4 rounded-full bg-danger/30"
                animate={{ scale: [1, 1.75], opacity: [0.45, 0] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}
            {recording && reduceMotion && (
              <motion.span
                aria-hidden="true"
                className="absolute size-4 rounded-full bg-danger/30"
                animate={{ opacity: 0.4 }}
                transition={motionTransitions.fast}
              />
            )}
            {recording ? (
              <Square
                aria-hidden="true"
                className="relative size-3 fill-danger text-danger"
              />
            ) : busy ? (
              <Loader2
                aria-hidden="true"
                className={
                  reduceMotion
                    ? "relative size-4"
                    : "relative size-4 animate-spin"
                }
              />
            ) : status === "error" ? (
              <RotateCcw aria-hidden="true" className="relative size-4" />
            ) : (
              <Mic aria-hidden="true" className="relative size-4" />
            )}
          </span>
          {label}
        </Button>

        {recording && (
          <RecordingIndicator level={level} elapsedSeconds={elapsedSeconds} />
        )}
      </div>

      {recording && isPreparing && (
        <span className="text-xs text-muted-foreground">
          Preparing voice input… keep speaking, your words will appear shortly.
        </span>
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {ANNOUNCEMENTS[status] ?? ""}
      </span>
    </div>
  );
}
