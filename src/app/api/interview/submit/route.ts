import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError } from "@/lib/google-sheets/api-errors";
import { submitRequestSchema } from "@/lib/google-sheets/api-schemas";
import { createRepositories } from "@/lib/google-sheets/repositories";
import { verifySessionOwnership } from "@/lib/google-sheets/session-ownership";

export const dynamic = "force-dynamic";

/**
 * Idempotent on purpose: `sessions.markCompleted` is a no-op when the
 * session is already completed, so a retried submit (flaky network, a
 * double click) can never create a duplicate completed session.
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
      body.sessionRowRef
    );

    console.info("[interview] submission completed", {
      sessionId: body.sessionId,
      alreadyCompleted,
    });

    return NextResponse.json({ success: true, alreadyCompleted });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Could not submit right now. Your answers are safe on this device — please try again."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
