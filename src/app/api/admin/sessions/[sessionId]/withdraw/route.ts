import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/google-sheets/admin-guard";
import { KnownApiError, toSafeApiError } from "@/lib/google-sheets/api-errors";
import { createRepositories } from "@/lib/google-sheets/repositories";
import { withdrawSession } from "@/lib/google-sheets/withdrawal";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * Admin-only, auditable withdrawal. Never exposed to participants — there
 * is no public delete endpoint. See `withdrawal.ts` for why this scrubs
 * response content rather than deleting rows.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const admin = await requireAdminSession();
    const { sessionId } = await params;
    const repositories = createRepositories();

    const found = await repositories.sessions.findBySessionId(sessionId);
    if (!found) throw new KnownApiError(404, "Session not found.");

    const result = await withdrawSession(repositories, found.rowRef);

    console.info("[admin] session withdrawn", {
      sessionId: result.sessionId,
      byAdmin: admin.user?.email,
      scrubbedResponseCount: result.scrubbedResponseCount,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not withdraw this session.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
