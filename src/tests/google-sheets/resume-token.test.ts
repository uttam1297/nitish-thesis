import { describe, expect, it } from "vitest";

import {
  generateResumeToken,
  hashResumeToken,
  resumeTokenHashesMatch,
} from "@/lib/google-sheets/resume-token";

describe("resume tokens", () => {
  it("generates high-entropy, distinct tokens", () => {
    const a = generateResumeToken();
    const b = generateResumeToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(32);
  });

  it("hashes deterministically and matches only the same token", () => {
    const token = generateResumeToken();
    const hash = hashResumeToken(token);
    expect(hashResumeToken(token)).toBe(hash);
    expect(resumeTokenHashesMatch(hash, hash)).toBe(true);
    expect(
      resumeTokenHashesMatch(hash, hashResumeToken("something-else"))
    ).toBe(false);
  });

  it("never stores the raw token as its own hash", () => {
    const token = generateResumeToken();
    expect(hashResumeToken(token)).not.toBe(token);
  });
});
