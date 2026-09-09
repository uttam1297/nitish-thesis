import "server-only";

import { KnownApiError } from "@/lib/google-sheets/api-errors";
import {
  hashResumeToken,
  resumeTokenHashesMatch,
} from "@/lib/google-sheets/resume-token";
import type { ResearchRepositories } from "@/lib/google-sheets/repositories";
import type { SessionRecord } from "@/lib/google-sheets/records";

/**
 * Confirms the caller actually owns `sessionRowRef` before any write:
 * one cheap single-row read, no sheet-wide scan. This is the check that
 * stops a participant from reading or overwriting another participant's
 * session by guessing a row number or session id.
 */
export async function verifySessionOwnership(
  repositories: ResearchRepositories,
  input: { sessionId: string; sessionRowRef: number; resumeToken: string }
): Promise<SessionRecord> {
  const session = await repositories.sessions.getByRowRef(input.sessionRowRef);
  if (!session || session.sessionId !== input.sessionId) {
    throw new KnownApiError(404, "Session not found.");
  }

  const suppliedHash = hashResumeToken(input.resumeToken);
  if (!resumeTokenHashesMatch(session.resumeTokenHash, suppliedHash)) {
    throw new KnownApiError(403, "Invalid resume token.");
  }

  return session;
}
