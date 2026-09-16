import { describe, expect, it } from "vitest";

import { appendTranscript } from "@/features/voice/transcript";

describe("appendTranscript", () => {
  it("appends to typed text without rewriting it", () => {
    expect(
      appendTranscript(
        "I worked on an analytics project.",
        "The main problem was inconsistent data across markets."
      )
    ).toBe(
      "I worked on an analytics project. The main problem was inconsistent data across markets."
    );
  });

  it("returns the segment alone for an empty answer", () => {
    expect(appendTranscript("", " Hello there. ")).toBe("Hello there.");
  });

  it("keeps a deliberate line break instead of joining with a space", () => {
    expect(appendTranscript("First point.\n", "Second point.")).toBe(
      "First point.\nSecond point."
    );
  });

  it("leaves the answer untouched when a segment transcribes to nothing", () => {
    expect(appendTranscript("Typed answer.", "   ")).toBe("Typed answer.");
  });

  it("never drops a correction made while transcription was running", () => {
    const corrected = "I worked on an analytics project in Berlin.";
    expect(appendTranscript(corrected, "It ran for six months.")).toBe(
      `${corrected} It ran for six months.`
    );
  });
});
