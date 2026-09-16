import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VoiceButton } from "@/components/interview/voice-button";
import type { VoiceStatus } from "@/features/voice/use-voice-input";

function renderButton(
  status: VoiceStatus,
  overrides: Partial<{
    level: number;
    elapsedSeconds: number;
    isPreparing: boolean;
    onStart: () => void;
    onStop: () => void;
  }> = {}
) {
  return render(
    <VoiceButton
      status={status}
      level={overrides.level ?? 0}
      elapsedSeconds={overrides.elapsedSeconds ?? 0}
      isPreparing={overrides.isPreparing ?? false}
      onStart={overrides.onStart ?? vi.fn()}
      onStop={overrides.onStop ?? vi.fn()}
    />
  );
}

describe("VoiceButton", () => {
  it("starts, stops and shows elapsed time", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { rerender } = renderButton("ready", { onStart, onStop });

    await user.click(screen.getByRole("button", { name: "Start voice input" }));
    expect(onStart).toHaveBeenCalledOnce();

    rerender(
      <VoiceButton
        status="recording"
        level={0.2}
        elapsedSeconds={12}
        isPreparing={false}
        onStart={onStart}
        onStop={onStop}
      />
    );
    const stopButton = screen.getByRole("button", { name: "Stop voice input" });
    expect(stopButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("00:12")).toBeInTheDocument();
    await user.click(stopButton);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("announces recording and processing without naming the technology", () => {
    const { rerender } = renderButton("recording");
    expect(screen.getByRole("status")).toHaveTextContent(/listening/i);

    rerender(
      <VoiceButton
        status="processing"
        level={0}
        elapsedSeconds={0}
        isPreparing={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/processing/i);
    expect(document.body.textContent).not.toMatch(/whisper|model|AI/i);
  });

  it("renders nothing when voice input is unavailable", () => {
    const { container } = renderButton("unavailable");
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps recording usable while the model is still loading", () => {
    renderButton("recording", { isPreparing: true });
    expect(
      screen.getByRole("button", { name: "Stop voice input" })
    ).toBeEnabled();
    expect(screen.getByText(/preparing voice input/i)).toBeInTheDocument();
  });

  it("offers to try again after a voice error", () => {
    renderButton("error");
    expect(
      screen.getByRole("button", { name: "Start voice input" })
    ).toHaveTextContent("Try voice again");
  });
});
