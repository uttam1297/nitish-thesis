import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { KnownApiError, toSafeApiError } from "@/lib/supabase/api-errors";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/** Session detail: profile, consent, and responses grouped by construct. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireAdminSession();
    const { sessionId } = await params;
    const repositories = createRepositories();

    const session = await repositories.sessions.getById(sessionId);
    if (!session) throw new KnownApiError(404, "Session not found.");

    const [participant, responses, consent] = await Promise.all([
      repositories.participants.getById(session.participantId),
      repositories.responses.listBySession(sessionId),
      repositories.consent.listBySession(sessionId),
    ]);

    return NextResponse.json({
      session,
      participant,
      consent: consent.at(-1) ?? null,
      responses,
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not load this session.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
