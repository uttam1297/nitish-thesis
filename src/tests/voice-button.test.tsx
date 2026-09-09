import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VoiceButton } from "@/components/interview/voice-button";

describe("VoiceButton", () => {
  it("starts, stops and shows elapsed time", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      <VoiceButton state="idle" onStart={onStart} onStop={onStop} />
    );

    await user.click(screen.getByRole("button", { name: "Speak answer" }));
    expect(onStart).toHaveBeenCalledOnce();

    rerender(
      <VoiceButton
        state="listening"
        elapsedSeconds={12}
        onStart={onStart}
        onStop={onStop}
      />
    );
    const stopButton = screen.getByRole("button", { name: /listening/i });
    expect(stopButton).toHaveTextContent("00:12");
    expect(stopButton).toHaveAttribute("aria-pressed", "true");
    await user.click(stopButton);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("shows when the mock answer is captured", () => {
    render(
      <VoiceButton state="completed" onStart={vi.fn()} onStop={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: "Answer captured" })
    ).toBeEnabled();
  });

  it("announces the listening state to assistive technology", () => {
    render(
      <VoiceButton state="listening" onStart={vi.fn()} onStop={vi.fn()} />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/listening/i);
  });
});
