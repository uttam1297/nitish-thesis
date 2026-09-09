import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError, KnownApiError } from "@/lib/google-sheets/api-errors";
import { syncRequestSchema } from "@/lib/google-sheets/api-schemas";
import { createRepositories } from "@/lib/google-sheets/repositories";
import { verifySessionOwnership } from "@/lib/google-sheets/session-ownership";

export const dynamic = "force-dynamic";

/**
 * Debounced, batched answer sync. The browser calls this on meaningful
 * answer changes and navigation, never per keystroke — see
 * `use-server-sync.ts` on the client for the debounce/batch policy.
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

    const results = await repositories.responses.upsertMany(
      body.answers.map((answer) => ({
        input: {
          participantId: session.participantId,
          sessionId: session.sessionId,
          questionId: answer.questionId,
          questionVersion: answer.questionVersion,
          construct: answer.construct,
          responseType: answer.responseType,
          responseValue: answer.responseValue,
          optionalElaboration: answer.optionalElaboration,
        },
        existingRowRef: answer.rowRef,
      }))
    );

    await repositories.sessions.updateProgress(body.sessionRowRef, {
      currentQuestionId: body.currentQuestionId,
      progressPercentage: body.progressPercentage,
    });

    return NextResponse.json({
      savedAt: new Date().toISOString(),
      rowRefs: results.map((result) => ({
        questionId: result.record.questionId,
        rowRef: result.rowRef,
      })),
    });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Your response is saved on this device and will retry automatically."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
