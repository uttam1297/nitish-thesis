import { NextResponse, type NextRequest } from "next/server";

import { requireAdminSession } from "@/lib/supabase/admin-guard";
import { toSafeApiError } from "@/lib/supabase/api-errors";
import { liveSessionRequestSchema } from "@/lib/supabase/api-schemas";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

/**
 * Researcher-initiated session for a live interview. `responseMode` is
 * fixed to `"live_interview"` — the same participant/session/response
 * schema as the async form, kept distinguishable so analysis can separate
 * rich live-interview responses from structured self-serve ones.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = liveSessionRequestSchema.parse(await request.json());
    const repositories = createRepositories();

    const questionnaireVersion =
      await repositories.study.getActiveQuestionnaireVersion();

    const participant = await repositories.participants.create(body.profile);
    const { session, resumeToken } = await repositories.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: questionnaireVersion.id,
      questionnaireVersion: questionnaireVersion.version,
      responseMode: "live_interview",
      firstQuestionId: body.firstQuestionId,
    });
    await repositories.consent.record({
      sessionId: session.id,
      participantId: participant.id,
      consentVersion: body.consent.consentVersion,
      participationConsent: body.consent.participationConsent,
      voiceInputConsent: body.consent.voiceInputConsent,
      recordingConsent: body.consent.recordingConsent,
    });

    return NextResponse.json({
      participantId: participant.id,
      sessionId: session.id,
      resumeToken,
      resumeLinkPath: `/interview/resume?token=${resumeToken}`,
    });
  } catch (error) {
    const safe = toSafeApiError(error, "Could not create the live session.");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
