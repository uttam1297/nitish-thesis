import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/google-sheets/admin-guard";
import { KnownApiError, toSafeApiError } from "@/lib/google-sheets/api-errors";
import { createRepositories } from "@/lib/google-sheets/repositories";

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

    const found = await repositories.sessions.findBySessionId(sessionId);
    if (!found) throw new KnownApiError(404, "Session not found.");

    const [participants, responses, consent] = await Promise.all([
      repositories.participants.listAll(),
      repositories.responses.listBySession(sessionId),
      repositories.consent.listBySession(sessionId),
    ]);
    const participant =
      participants.find(
        (p) => p.participantId === found.record.participantId
      ) ?? null;

    return NextResponse.json({
      session: found.record,
      rowRef: found.rowRef,
      participant,
      consent: consent.at(-1) ?? null,
      responses,
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not load this session.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
