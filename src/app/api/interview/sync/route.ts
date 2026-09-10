import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError, KnownApiError } from "@/lib/supabase/api-errors";
import { syncRequestSchema } from "@/lib/supabase/api-schemas";
import { createRepositories } from "@/lib/supabase/repositories";
import { verifySessionOwnership } from "@/lib/supabase/session-ownership";

export const dynamic = "force-dynamic";

/**
 * Debounced, batched answer sync. The browser calls this on meaningful
 * answer changes and navigation, never per keystroke — see
 * `use-server-sync.ts` on the client for the debounce/batch policy.
 *
 * Unlike the Google Sheets backend, there is no row-ref to track: each
 * answer upserts by the real `UNIQUE(session_id, question_id)`
 * constraint, so the client only ever needs to send its answers, never a
 * cached row position.
 */
export async function POST(request: NextRequest) {
  try {
    const body = syncRequestSchema.parse(await request.json());
    const repositories = createRepositories();
    const session = await verifySessionOwnership(repositories, body);

    if (session.status === "completed" || session.status === "withdrawn") {
      throw new KnownApiError(
        409,
        "This interview has already been finished and can no longer be edited."
      );
    }

    await repositories.responses.upsertMany(
      body.answers.map((answer) => ({
        sessionId: session.id,
        participantId: session.participantId,
        questionId: answer.questionId,
        questionVersion: answer.questionVersion,
        construct: answer.construct,
        responseType: answer.responseType,
        responseValue: JSON.parse(answer.responseValue),
        optionalElaboration: answer.optionalElaboration,
      }))
    );

    await repositories.sessions.updateProgress(session.id, {
      currentQuestionId: body.currentQuestionId,
      progressPercentage: body.progressPercentage,
    });

    return NextResponse.json({ savedAt: new Date().toISOString() });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Your response is saved on this device and will retry automatically."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
