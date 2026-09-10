import "server-only";

import { KnownApiError } from "@/lib/supabase/api-errors";
import {
  hashResumeToken,
  resumeTokenHashesMatch,
} from "@/lib/supabase/resume-token";
import type { ResearchRepositories } from "@/lib/supabase/repositories";
import type { SessionRecord } from "@/lib/supabase/records";

/**
 * Confirms the caller actually owns `sessionId` before any write — one
 * indexed row lookup, never a table scan. This is the check that stops a
 * participant from reading or overwriting another participant's session
 * by guessing an id.
 */
export async function verifySessionOwnership(
  repositories: ResearchRepositories,
  input: { sessionId: string; resumeToken: string }
): Promise<SessionRecord> {
  const session = await repositories.sessions.getById(input.sessionId);
  if (!session) {
    throw new KnownApiError(404, "Session not found.");
  }

  const suppliedHash = hashResumeToken(input.resumeToken);
  if (!resumeTokenHashesMatch(session.resumeTokenHash, suppliedHash)) {
    throw new KnownApiError(403, "Invalid resume token.");
  }

  return session;
}
