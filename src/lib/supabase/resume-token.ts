import "server-only";

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Resume tokens are the *only* thing that lets a browser prove it owns a
 * session. The participant code (P001...) is a research label, not a
 * credential, and must never be treated as one.
 */

/** A fresh, high-entropy token to hand to the participant's browser. */
export function generateResumeToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash — never the raw token — is stored in the database. */
export function hashResumeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison so a lookup can't leak timing info. */
export function resumeTokenHashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
