import "server-only";

import type { ResearchRepositories } from "@/lib/google-sheets/repositories";

/**
 * Marks a session withdrawn and scrubs its response content. Deliberately
 * does not delete the Consent row: that row is the audit trail of what the
 * participant agreed to and when, which is evidence the withdrawal itself
 * may need, not personal research content. Admin-only, auditable by the
 * caller (log the admin email and timestamp at the call site).
 */
export async function withdrawSession(
  repositories: ResearchRepositories,
  sessionRowRef: number
): Promise<{ sessionId: string; scrubbedResponseCount: number }> {
  const session = await repositories.sessions.getByRowRef(sessionRowRef);
  if (!session) throw new Error("Session not found.");

  await repositories.sessions.markWithdrawn(sessionRowRef);
  const scrubbedResponseCount = await repositories.responses.withdrawSession(
    session.sessionId
  );

  return { sessionId: session.sessionId, scrubbedResponseCount };
}
