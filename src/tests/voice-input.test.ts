import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { VoiceTranscriptionAdapter } from "@/features/voice/speech-recognition-adapter";
import { useVoiceInput } from "@/features/voice/use-voice-input";

function fakeAdapter(
  overrides: Partial<VoiceTranscriptionAdapter> = {}
): VoiceTranscriptionAdapter {
  return {
    isSupported: () => true,
    start: () => undefined,
    stop: () => undefined,
    ...overrides,
  };
}

describe("useVoiceInput", () => {
  it("stays unsupported and never blocks completion when speech recognition is absent", () => {
    const onCapture = vi.fn();
    const adapter = fakeAdapter({ isSupported: () => false });
    const { result } = renderHook(() => useVoiceInput({ onCapture, adapter }));

    expect(result.current.state).toBe("unsupported");
    act(() => result.current.start());
    expect(onCapture).not.toHaveBeenCalled();
    expect(result.current.state).toBe("unsupported");
  });

  it("captures an editable transcript on success", async () => {
    const onCapture = vi.fn();
    const adapter = fakeAdapter({
      start: ({ onResult }) => onResult("hello from voice"),
    });
    const { result } = renderHook(() => useVoiceInput({ onCapture, adapter }));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state).toBe("completed"));
    expect(onCapture).toHaveBeenCalledWith("hello from voice");
  });

  it("falls back to an error state without throwing when the adapter fails", async () => {
    const onCapture = vi.fn();
    const adapter = fakeAdapter({
      start: ({ onError }) => onError("not-allowed"),
    });
    const { result } = renderHook(() => useVoiceInput({ onCapture, adapter }));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.errorMessage).toMatch(/denied/i);
    expect(onCapture).not.toHaveBeenCalled();
  });
});
