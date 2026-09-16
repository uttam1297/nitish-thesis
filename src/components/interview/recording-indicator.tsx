"use client";

import { useReducedMotion } from "motion/react";

const BARS = [0.35, 0.6, 0.85, 1, 0.8, 0.5, 0.3];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

interface RecordingIndicatorProps {
  /** Microphone level, 0-1. */
  level: number;
  elapsedSeconds: number;
}

/**
 * Confirms the microphone is picking audio up. Bar heights are driven by
 * inline styles rather than an animation loop, so the only work per frame is
 * the level update the audio callback already throttles to ~10 Hz.
 */
export function RecordingIndicator({
  level,
  elapsedSeconds,
}: RecordingIndicatorProps) {
  const reduceMotion = useReducedMotion();
  // Speech sits well below full scale, so the raw RMS is amplified into a
  // range where quiet speakers still move the meter.
  const normalised = Math.min(1, level * 8);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="tabular-nums">{formatElapsed(elapsedSeconds)}</span>
      <span aria-hidden="true" className="flex h-4 items-center gap-0.5">
        {BARS.map((weight, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-danger/70 transition-[height] duration-150"
            style={{
              height: `${Math.max(
                2,
                (reduceMotion ? 0.35 : normalised) * weight * 16
              )}px`,
            }}
          />
        ))}
      </span>
    </div>
  );
}
