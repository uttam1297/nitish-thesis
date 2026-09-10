import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { toSafeApiError } from "@/lib/supabase/api-errors";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

/**
 * Full-structure JSON export: sessions nested with their participant,
 * consent, and responses — preserves the richer shapes (arrays, ranking
 * order, etc.) that a flat CSV would lose.
 */
export async function GET() {
  try {
    await requireAdminSession();
    const repositories = createRepositories();
    const [sessions, participants] = await Promise.all([
      repositories.sessions.listAll(),
      repositories.participants.listAll(),
    ]);
    const participantsById = new Map(participants.map((p) => [p.id, p]));

    const data = await Promise.all(
      sessions.map(async (session) => {
        const [responses, consent] = await Promise.all([
          repositories.responses.listBySession(session.id),
          repositories.consent.listBySession(session.id),
        ]);
        return {
          session,
          participant: participantsById.get(session.participantId) ?? null,
          consent: consent.at(-1) ?? null,
          responses,
        };
      })
    );

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="responses.json"`,
      },
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not generate the export.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
