import "server-only";

import type { ResearchRepositories } from "@/lib/supabase/repositories";

/**
 * Marks a session withdrawn and scrubs its response content. Deliberately
 * does not delete the consent row: that is the audit trail of what the
 * participant agreed to and when, which the withdrawal itself may need as
 * evidence, not personal research content. Admin-only, auditable by the
 * caller (log the admin email and timestamp at the call site).
 */
export async function withdrawSession(
  repositories: ResearchRepositories,
  sessionId: string
): Promise<{ sessionId: string; scrubbedResponseCount: number }> {
  const session = await repositories.sessions.getById(sessionId);
  if (!session) throw new Error("Session not found.");

  await repositories.sessions.markWithdrawn(sessionId);
  const scrubbedResponseCount =
    await repositories.responses.withdrawSession(sessionId);

  return { sessionId, scrubbedResponseCount };
}
