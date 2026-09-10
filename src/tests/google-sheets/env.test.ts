import { describe, expect, it } from "vitest";

import { normalizePrivateKey } from "@/lib/google-sheets/env";

const REAL_KEY_BODY =
  "-----BEGIN PRIVATE KEY-----\nMIIExampleOnlyNotARealKey\n-----END PRIVATE KEY-----\n";

describe("normalizePrivateKey", () => {
  it("leaves a key with real newlines untouched", () => {
    expect(normalizePrivateKey(REAL_KEY_BODY)).toBe(REAL_KEY_BODY.trim());
  });

  it("un-escapes literal \\n sequences (the Vercel env-var UI case)", () => {
    const escaped = REAL_KEY_BODY.replace(/\n/g, "\\n");
    expect(normalizePrivateKey(escaped)).toBe(REAL_KEY_BODY.trim());
  });

  it("strips wrapping double quotes copied straight from the JSON key file", () => {
    const withQuotes = `"${REAL_KEY_BODY.replace(/\n/g, "\\n")}"`;
    expect(normalizePrivateKey(withQuotes)).toBe(REAL_KEY_BODY.trim());
  });

  it("strips wrapping single quotes too", () => {
    const withQuotes = `'${REAL_KEY_BODY.replace(/\n/g, "\\n")}'`;
    expect(normalizePrivateKey(withQuotes)).toBe(REAL_KEY_BODY.trim());
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePrivateKey(`  ${REAL_KEY_BODY}  `)).toBe(
      REAL_KEY_BODY.trim()
    );
  });
});
