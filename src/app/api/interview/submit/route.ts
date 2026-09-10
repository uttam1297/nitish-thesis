import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError } from "@/lib/supabase/api-errors";
import { submitRequestSchema } from "@/lib/supabase/api-schemas";
import { createRepositories } from "@/lib/supabase/repositories";
import { verifySessionOwnership } from "@/lib/supabase/session-ownership";

export const dynamic = "force-dynamic";

/**
 * Idempotent on purpose: `sessions.markCompleted` only transitions a
 * session whose status isn't already "completed" (an atomic conditional
 * update), so a retried submit (flaky network, a double click) can never
 * create a duplicate completed session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = submitRequestSchema.parse(await request.json());
    const repositories = createRepositories();
    const session = await verifySessionOwnership(repositories, body);

    if (session.status === "withdrawn") {
      return NextResponse.json(
        { error: "This session has been withdrawn and cannot be submitted." },
        { status: 409 }
      );
    }

    const { alreadyCompleted } = await repositories.sessions.markCompleted(
      session.id
    );
    const participant = await repositories.participants.getById(
      session.participantId
    );

    console.info("[interview] submission completed", {
      sessionId: session.id,
      alreadyCompleted,
    });

    return NextResponse.json({
      success: true,
      alreadyCompleted,
      participantCode: participant?.participantCode ?? null,
    });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Could not submit right now. Your answers are safe on this device — please try again."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
