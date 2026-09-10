import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { toSafeApiError } from "@/lib/supabase/api-errors";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

/** Overview + session list. Admin-only, infrequent. */
export async function GET() {
  try {
    await requireAdminSession();
    const repositories = createRepositories();
    const [sessions, participants] = await Promise.all([
      repositories.sessions.listAll(),
      repositories.participants.listAll(),
    ]);
    const participantsById = new Map(participants.map((p) => [p.id, p]));

    const rows = sessions.map((session) => ({
      ...session,
      participant: participantsById.get(session.participantId) ?? null,
    }));

    const overview = {
      totalSessions: rows.length,
      completedSessions: rows.filter((r) => r.status === "completed").length,
      inProgressSessions: rows.filter(
        (r) => r.status === "started" || r.status === "in_progress"
      ).length,
      liveInterviews: rows.filter((r) => r.responseMode === "live_interview")
        .length,
      asynchronousForms: rows.filter(
        (r) => r.responseMode === "asynchronous_form"
      ).length,
    };

    return NextResponse.json({ overview, sessions: rows });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not load sessions.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
