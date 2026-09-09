"use client";

import { useEffect, useMemo, useState } from "react";

import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import {
  WebSpeechAdapter,
  type VoiceTranscriptionAdapter,
} from "@/features/voice/speech-recognition-adapter";

export type VoiceInputState =
  "unsupported" | "idle" | "listening" | "completed" | "error";

interface UseVoiceInputOptions {
  onCapture: (transcript: string) => void;
  /** Swappable for tests or a future transcription provider. */
  adapter?: VoiceTranscriptionAdapter;
}

/**
 * Feature-detects browser speech recognition and exposes a small state
 * machine over it. When unsupported, `state` starts and stays
 * "unsupported" — callers hide the microphone control and fall back to
 * typing, which is always available regardless of this hook's state.
 */
export function useVoiceInput({ onCapture, adapter }: UseVoiceInputOptions) {
  const resolvedAdapter = useMemo(
    () => adapter ?? new WebSpeechAdapter(),
    [adapter]
  );
  // Read once at mount rather than in an effect: feature detection does not
  // change while the component is alive, so there is nothing to resync.
  const [supported] = useState(() => resolvedAdapter.isSupported());
  const [state, setState] = useState<VoiceInputState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, resetElapsed] = useElapsedSeconds(
    state === "listening"
  );

  useEffect(() => {
    return () => resolvedAdapter.stop();
  }, [resolvedAdapter]);

  return {
    state: supported ? state : "unsupported",
    elapsedSeconds,
    errorMessage,
    start: () => {
      if (!supported) return;
      setErrorMessage(null);
      resetElapsed();
      setState("listening");
      resolvedAdapter.start({
        onResult: (transcript) => {
          onCapture(transcript);
          setState("completed");
        },
        onError: (reason) => {
          setErrorMessage(
            reason === "not-allowed" || reason === "permission-denied"
              ? "Microphone access was denied. You can type your answer instead."
              : "Voice capture did not work. You can type your answer instead."
          );
          setState("error");
        },
        onEnd: () => {
          setState((current) => (current === "listening" ? "idle" : current));
        },
      });
    },
    stop: () => {
      resolvedAdapter.stop();
    },
  };
}
