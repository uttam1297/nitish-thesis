import { describe, expect, it } from "vitest";

import { getQuestion } from "../research-metadata";
import { validateResponseValue } from "./answers";

describe("structured not-applicable answers", () => {
  it("accepts them for 1.4 narratives and rejects them for 1.3", () => {
    const value = { kind: "not_applicable", reason: "not_applicable" };
    const previous = getQuestion("1.3.0", "q5")!;
    const current = getQuestion("1.4.0", "q5")!;

    expect(validateResponseValue(value, previous).valid).toBe(false);
    expect(validateResponseValue(value, current)).toEqual({
      valid: true,
      answer: value,
    });
  });
});
