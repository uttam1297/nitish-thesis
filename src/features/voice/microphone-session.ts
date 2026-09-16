"use client";

import {
  AudioSegmenter,
  type AudioSegment,
} from "@/features/voice/audio-segmenter";
import { TARGET_SAMPLE_RATE } from "@/features/voice/speech-config";
import type { VoiceErrorCode } from "@/features/voice/speech-protocol";

export class VoiceError extends Error {
  constructor(readonly code: VoiceErrorCode) {
    super(code);
    this.name = "VoiceError";
  }
}

export interface MicrophoneHandlers {
  onSegment: (segment: AudioSegment) => void;
  /** Normalised 0-1 level for the recording indicator. */
  onLevel: (level: number) => void;
  /** Fired when the browser ends capture on its own (device unplugged). */
  onInterrupted: (code: VoiceErrorCode) => void;
}

export interface MicrophoneSession {
  /** Flushes the trailing audio as a final segment and releases the device. */
  stop: () => void;
}

const LEVEL_INTERVAL_MS = 100;
const WORKLET_URL = "/audio/pcm-recorder.worklet.js";

/**
 * Only one microphone may be live at a time: starting capture for a question
 * finalises whatever was recording before it, so two questions can never own
 * competing streams.
 */
let activeSession: MicrophoneSession | null = null;

export function isVoiceCaptureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof AudioWorkletNode !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function createAudioContext(): AudioContext {
  try {
    // Capturing directly at Whisper's rate avoids a resampling pass; browsers
    // that reject the constraint fall back to their native rate, which the
    // worker resamples instead.
    return new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
}

function toVoiceError(error: unknown): VoiceError {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new VoiceError("MIC_PERMISSION_DENIED");
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new VoiceError("MIC_NOT_FOUND");
  }
  return new VoiceError("AUDIO_PROCESSING_FAILED");
}

export async function startMicrophone(
  handlers: MicrophoneHandlers
): Promise<MicrophoneSession> {
  activeSession?.stop();

  if (!isVoiceCaptureSupported()) throw new VoiceError("MIC_UNSUPPORTED");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    throw toVoiceError(error);
  }

  const context = createAudioContext();
  let source: MediaStreamAudioSourceNode;
  let recorder: AudioWorkletNode;
  try {
    await context.audioWorklet.addModule(WORKLET_URL);
    // Safari starts contexts suspended even inside a click handler.
    if (context.state === "suspended") await context.resume();
    source = context.createMediaStreamSource(stream);
    recorder = new AudioWorkletNode(context, "pcm-recorder", {
      numberOfOutputs: 0,
    });
    source.connect(recorder);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
    throw toVoiceError(error);
  }

  const segmenter = new AudioSegmenter(context.sampleRate, handlers.onSegment);
  let lastLevelAt = 0;
  let stopped = false;

  recorder.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (stopped) return;
    const level = segmenter.push(event.data);
    const now = performance.now();
    if (now - lastLevelAt >= LEVEL_INTERVAL_MS) {
      lastLevelAt = now;
      handlers.onLevel(level);
    }
  };

  const session: MicrophoneSession = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (activeSession === session) activeSession = null;
      recorder.port.onmessage = null;
      segmenter.flush();
      source.disconnect();
      recorder.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
      handlers.onLevel(0);
    },
  };

  stream.getAudioTracks()[0]?.addEventListener("ended", () => {
    if (stopped) return;
    session.stop();
    handlers.onInterrupted("MIC_NOT_FOUND");
  });

  activeSession = session;
  return session;
}
