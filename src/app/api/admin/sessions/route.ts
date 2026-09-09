import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/google-sheets/admin-guard";
import { toSafeApiError } from "@/lib/google-sheets/api-errors";
import { createRepositories } from "@/lib/google-sheets/repositories";

export const dynamic = "force-dynamic";

/** Overview + session list. Full-sheet reads: admin-only, infrequent. */
export async function GET() {
  try {
    await requireAdminSession();
    const repositories = createRepositories();
    const [sessions, participants] = await Promise.all([
      repositories.sessions.listAll(),
      repositories.participants.listAll(),
    ]);
    const participantsById = new Map(
      participants.map((participant) => [
        participant.participantId,
        participant,
      ])
    );

    const rows = sessions.map(({ record, rowRef }) => ({
      ...record,
      rowRef,
      participant: participantsById.get(record.participantId) ?? null,
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
