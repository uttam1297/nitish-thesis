"use client";

import { useEffect } from "react";

import { isVoiceCaptureSupported } from "@/features/voice/microphone-session";
import { getSpeechEngine } from "@/features/voice/speech-engine";

const PRELOAD_DELAY_MS = 1_500;

interface ConnectionLike {
  saveData?: boolean;
  effectiveType?: string;
}

function shouldPreload(): boolean {
  if (!isVoiceCaptureSupported()) return false;
  const connection = (navigator as Navigator & { connection?: ConnectionLike })
    .connection;
  if (connection?.saveData) return false;
  return !/(^|-)2g$/.test(connection?.effectiveType ?? "");
}

/**
 * Warms the speech model once the interview is on screen and idle, so the
 * first microphone click does not pay for the download. Nothing here touches
 * the microphone, and a failure only means voice stays hidden.
 */
export function useVoicePreload(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !shouldPreload()) return;

    const engine = getSpeechEngine();
    const idle = window.requestIdleCallback;
    let handle: number;
    const begin = () => {
      void engine.prepare();
    };

    if (idle) {
      handle = idle(begin, { timeout: 10_000 });
      return () => window.cancelIdleCallback(handle);
    }
    // Safari has no requestIdleCallback; a short delay keeps the download off
    // the critical path for first paint and first interaction.
    handle = window.setTimeout(begin, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [enabled]);
}
