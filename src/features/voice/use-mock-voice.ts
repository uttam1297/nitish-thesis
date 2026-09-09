"use client";

import { useState } from "react";

import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";

export type MockVoiceState = "idle" | "listening" | "completed";

const MOCK_TRANSCRIPT =
  "This is a sample transcript for the Phase 1 prototype. You can edit or replace it before continuing.";

interface UseMockVoiceOptions {
  onCapture: (transcript: string) => void;
}

/** Visual-only voice interaction. It never requests microphone access. */
export function useMockVoice({ onCapture }: UseMockVoiceOptions) {
  const [state, setState] = useState<MockVoiceState>("idle");
  const [elapsedSeconds, resetElapsed] = useElapsedSeconds(
    state === "listening"
  );

  return {
    state,
    elapsedSeconds,
    start: () => {
      resetElapsed();
      setState("listening");
    },
    stop: () => {
      setState("completed");
      onCapture(MOCK_TRANSCRIPT);
    },
  };
}
