"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import type { AudioSegment } from "@/features/voice/audio-segmenter";
import {
  isVoiceCaptureSupported,
  startMicrophone,
  VoiceError,
  type MicrophoneSession,
} from "@/features/voice/microphone-session";
import {
  getSpeechEngine,
  type SpeechEngine,
} from "@/features/voice/speech-engine";
import type { VoiceErrorCode } from "@/features/voice/speech-protocol";

export type VoiceStatus =
  | "unavailable"
  | "preparing"
  | "ready"
  | "requesting-permission"
  | "recording"
  | "processing"
  | "error";

interface UseVoiceInputOptions {
  /** Called once per transcribed segment, in the order they were spoken. */
  onTranscript: (text: string) => void;
  /** Swappable in tests; production always uses the shared worker engine. */
  engine?: SpeechEngine;
}

const UNAVAILABLE_MESSAGE =
  "Voice input is unavailable on this device. You can continue typing your answer.";

const MESSAGES: Record<VoiceErrorCode, string> = {
  MIC_PERMISSION_DENIED:
    "Microphone access is blocked. Allow it in your browser settings, or type your answer instead.",
  MIC_NOT_FOUND:
    "No microphone was found. Connect one and try again, or type your answer instead.",
  MIC_UNSUPPORTED: UNAVAILABLE_MESSAGE,
  AUDIO_PROCESSING_FAILED:
    "Voice input stopped unexpectedly. You can try again or type your answer.",
  MODEL_LOAD_FAILED: UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_FAILED:
    "That part could not be transcribed. You can try again or type your answer.",
};

/**
 * Drives one question's voice control: microphone capture on the main thread,
 * transcription in the shared worker, and a status a participant can act on.
 *
 * Recording never waits for the model. Capture starts on the click that
 * granted permission and segments queue up until the model is ready, so a
 * slow first load costs waiting time, not speech.
 */
export function useVoiceInput({ onTranscript, engine }: UseVoiceInputOptions) {
  const speechEngine = engine ?? getSpeechEngine();
  const [supported] = useState(isVoiceCaptureSupported);
  const [status, setStatus] = useState<VoiceStatus>(
    supported ? "ready" : "unavailable"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsedSeconds, resetElapsed] = useElapsedSeconds(
    status === "recording"
  );

  const [engineStatus, setEngineStatus] = useState(speechEngine.status);
  useEffect(() => speechEngine.subscribe(setEngineStatus), [speechEngine]);

  const statusRef = useRef(status);
  // Guards against a permission prompt that resolves after the participant
  // already stopped, navigated away, or started another question.
  const startTokenRef = useRef(0);
  const sessionRef = useRef<MicrophoneSession | null>(null);
  const pendingRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Transcriptions can land after the participant has edited the textarea or
  // left the question, so the callback is always read at resolution time.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  const moveTo = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const fail = useCallback(
    (code: VoiceErrorCode) => {
      setErrorMessage(MESSAGES[code]);
      moveTo(
        code === "MIC_UNSUPPORTED" || code === "MODEL_LOAD_FAILED"
          ? "unavailable"
          : "error"
      );
    },
    [moveTo]
  );

  const settle = useCallback(() => {
    if (pendingRef.current > 0) {
      moveTo("processing");
      return;
    }
    if (statusRef.current !== "error" && statusRef.current !== "unavailable") {
      moveTo("ready");
    }
  }, [moveTo]);

  const transcribe = useCallback(
    (segment: AudioSegment) => {
      pendingRef.current += 1;
      // Chained rather than parallel: segments must reach the answer in the
      // order they were spoken, whatever order inference finishes in.
      queueRef.current = queueRef.current
        .then(() => speechEngine.transcribe(segment.pcm, segment.sampleRate))
        .then(
          (text) => {
            const trimmed = text.trim();
            if (trimmed) onTranscriptRef.current(trimmed);
          },
          (error: unknown) => {
            const code =
              error instanceof Error && error.message === "TRANSCRIPTION_FAILED"
                ? "TRANSCRIPTION_FAILED"
                : "MODEL_LOAD_FAILED";
            setErrorMessage(MESSAGES[code]);
          }
        )
        .finally(() => {
          pendingRef.current -= 1;
          if (statusRef.current === "processing") settle();
        });
    },
    [settle, speechEngine]
  );

  const stop = useCallback(() => {
    startTokenRef.current += 1;
    if (!sessionRef.current) return;
    // `stop` flushes the trailing audio as a final segment, so the last thing
    // the participant said is transcribed rather than discarded.
    sessionRef.current.stop();
    sessionRef.current = null;
    setLevel(0);
    settle();
  }, [settle]);

  const start = useCallback(async () => {
    if (!supported || statusRef.current === "unavailable") return;
    if (
      statusRef.current === "recording" ||
      statusRef.current === "requesting-permission"
    ) {
      return;
    }

    setErrorMessage(null);
    const token = ++startTokenRef.current;
    moveTo("requesting-permission");
    // Kicked off in parallel: the participant can speak while the model loads.
    void speechEngine.prepare().then((ready) => {
      if (!ready) {
        stop();
        fail("MODEL_LOAD_FAILED");
      }
    });

    try {
      const session = await startMicrophone({
        onSegment: transcribe,
        onLevel: setLevel,
        onInterrupted: (code) => {
          sessionRef.current = null;
          fail(code);
        },
      });
      if (token !== startTokenRef.current) {
        session.stop();
        return;
      }
      sessionRef.current = session;
      resetElapsed();
      moveTo("recording");
    } catch (error) {
      fail(
        error instanceof VoiceError ? error.code : "AUDIO_PROCESSING_FAILED"
      );
    }
  }, [fail, moveTo, resetElapsed, speechEngine, stop, supported, transcribe]);

  useEffect(() => {
    return () => {
      // Navigating away mid-sentence still transcribes what was captured: the
      // answer lives in interview state, not in this component.
      startTokenRef.current += 1;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, []);

  return {
    // A model that will never load hides the control entirely, but not while
    // the participant is mid-recording — that audio is still worth flushing.
    status:
      engineStatus === "unavailable" && status !== "recording"
        ? ("unavailable" as VoiceStatus)
        : status,
    level,
    elapsedSeconds,
    errorMessage,
    /** True while segments spoken earlier are still being transcribed. */
    isTranscribing: status === "processing",
    /** True while the participant is recording but the model is still loading. */
    isPreparing: engineStatus === "preparing" && status !== "ready",
    start,
    stop,
  };
}
