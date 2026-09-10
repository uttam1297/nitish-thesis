import { createPrivateKey, generateKeyPairSync } from "node:crypto";
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

  it("reconstructs a key an env-var UI flattened to one line with no newlines at all", () => {
    // Regression test: a real key, PEM-formatted normally, then flattened
    // exactly the way some env-var UIs mangle a multi-line paste — no real
    // newlines *and* no literal `\n` left. This is the shape that produced
    // ERR_OSSL_UNSUPPORTED in production even after quote-stripping.
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const realPem = privateKey.export({
      type: "pkcs8",
      format: "pem",
    }) as string;
    const flattened = realPem.replace(/\n/g, "");

    expect(flattened).not.toContain("\n");
    const normalized = normalizePrivateKey(flattened);

    // The real assertion: Node's own PEM decoder must accept it — not just
    // a string-shape check.
    expect(() => createPrivateKey(normalized)).not.toThrow();
  });
});
