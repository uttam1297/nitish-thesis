import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AudioSegment } from "@/features/voice/audio-segmenter";
import type { MicrophoneHandlers } from "@/features/voice/microphone-session";
import type { SpeechEngine } from "@/features/voice/speech-engine";
import { useVoiceInput } from "@/features/voice/use-voice-input";

const microphone = vi.hoisted(() => ({
  supported: true,
  handlers: null as MicrophoneHandlers | null,
  stop: vi.fn(),
  error: null as Error | null,
}));

vi.mock("@/features/voice/microphone-session", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/voice/microphone-session")
    >();
  return {
    ...actual,
    isVoiceCaptureSupported: () => microphone.supported,
    startMicrophone: async (handlers: MicrophoneHandlers) => {
      if (microphone.error) throw microphone.error;
      microphone.handlers = handlers;
      return { stop: microphone.stop };
    },
  };
});

const { VoiceError } = await import("@/features/voice/microphone-session");

function segment(): AudioSegment {
  return {
    pcm: new Float32Array(16_000),
    sampleRate: 16_000,
    durationSeconds: 1,
  };
}

function fakeEngine(overrides: Partial<SpeechEngine> = {}): SpeechEngine {
  return {
    status: "ready",
    subscribe: () => () => undefined,
    prepare: () => Promise.resolve(true),
    transcribe: () => Promise.resolve("transcribed text"),
    dispose: () => undefined,
    ...overrides,
  };
}

beforeEach(() => {
  microphone.supported = true;
  microphone.handlers = null;
  microphone.error = null;
  microphone.stop.mockReset();
});

describe("useVoiceInput", () => {
  it("stays unavailable and never starts capture on an unsupported browser", async () => {
    microphone.supported = false;
    const onTranscript = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript, engine: fakeEngine() })
    );

    expect(result.current.status).toBe("unavailable");
    await act(() => result.current.start());
    expect(microphone.handlers).toBeNull();
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("moves ready → recording → processing → ready around a segment", async () => {
    const onTranscript = vi.fn();
    let release: ((text: string) => void) | undefined;
    const engine = fakeEngine({
      transcribe: () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    });
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript, engine })
    );

    expect(result.current.status).toBe("ready");
    await act(() => result.current.start());
    expect(result.current.status).toBe("recording");

    act(() => microphone.handlers?.onSegment(segment()));
    await waitFor(() => expect(release).toBeDefined());
    act(() => result.current.stop());
    expect(microphone.stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("processing");

    await act(async () => {
      release?.("a difficult data quality problem");
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(onTranscript).toHaveBeenCalledWith(
      "a difficult data quality problem"
    );
  });

  it("appends segments in the order they were spoken, not the order they finish", async () => {
    const spoken: string[] = [];
    const resolvers: ((text: string) => void)[] = [];
    const engine = fakeEngine({
      transcribe: () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        }),
    });
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: (text) => spoken.push(text), engine })
    );

    await act(() => result.current.start());
    act(() => {
      microphone.handlers?.onSegment(segment());
      microphone.handlers?.onSegment(segment());
    });

    // The queue is serial, so the second request is only issued once the first
    // has resolved — which is exactly what keeps the answer in spoken order.
    await waitFor(() => expect(resolvers).toHaveLength(1));
    await act(async () => resolvers[0]("first sentence."));
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => resolvers[1]("second sentence."));

    await waitFor(() =>
      expect(spoken).toEqual(["first sentence.", "second sentence."])
    );
  });

  it("reports a denied microphone in plain language and stays recoverable", async () => {
    microphone.error = new VoiceError("MIC_PERMISSION_DENIED");
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn(), engine: fakeEngine() })
    );

    await act(() => result.current.start());
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toMatch(
      /microphone access is blocked/i
    );
    expect(result.current.errorMessage).not.toMatch(/error|exception/i);
  });

  it("disables voice without breaking the question when the model never loads", async () => {
    const engine = fakeEngine({ prepare: () => Promise.resolve(false) });
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn(), engine })
    );

    await act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.errorMessage).toMatch(/continue typing/i);
    expect(microphone.stop).toHaveBeenCalled();
  });

  it("releases the microphone when the question unmounts mid-recording", async () => {
    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onTranscript: vi.fn(), engine: fakeEngine() })
    );

    await act(() => result.current.start());
    unmount();
    expect(microphone.stop).toHaveBeenCalledOnce();
  });
});
