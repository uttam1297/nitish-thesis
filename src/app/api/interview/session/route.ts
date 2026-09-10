import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError, KnownApiError } from "@/lib/supabase/api-errors";
import {
  createSessionRequestSchema,
  resumeQuerySchema,
} from "@/lib/supabase/api-schemas";
import { CONSENT_VERSION } from "@/config/study";
import { createRepositories } from "@/lib/supabase/repositories";

export const dynamic = "force-dynamic";

const RESUME_COOKIE = "interview_resume_token";
const RESUME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

async function setResumeCookie(resumeToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(RESUME_COOKIE, resumeToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: RESUME_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Starts a new session: one participant row, one session row, one consent row. */
export async function POST(request: NextRequest) {
  try {
    const body = createSessionRequestSchema.parse(await request.json());
    const repositories = createRepositories();

    // Never trust a client-supplied questionnaire version: it must match
    // an active version this server actually serves.
    const questionnaireVersion =
      await repositories.study.getActiveQuestionnaireVersion();
    if (body.questionnaireVersion !== questionnaireVersion.version) {
      throw new KnownApiError(
        409,
        "Your session was started under an outdated version of this study. Please reload the page."
      );
    }

    const participant = await repositories.participants.create(body.profile);
    const { session, resumeToken } = await repositories.sessions.create({
      participantId: participant.id,
      questionnaireVersionId: questionnaireVersion.id,
      questionnaireVersion: questionnaireVersion.version,
      responseMode: body.responseMode,
      firstQuestionId: body.firstQuestionId,
      clientRequestId: body.clientRequestId,
    });
    await repositories.consent.record({
      sessionId: session.id,
      participantId: participant.id,
      consentVersion: body.consent.consentVersion || CONSENT_VERSION,
      participationConsent: body.consent.participationConsent,
      voiceInputConsent: body.consent.voiceInputConsent,
      recordingConsent: body.consent.recordingConsent,
    });

    await setResumeCookie(resumeToken);

    console.info("[interview] session created", {
      sessionId: session.id,
      responseMode: body.responseMode,
    });

    return NextResponse.json({
      participantId: participant.id,
      sessionId: session.id,
      resumeToken,
      startedAt: session.startedAt,
    });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Could not start your session right now. Please try again."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}

/** Resumes a session from a resume token (query param, falling back to cookie). */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get(RESUME_COOKIE)?.value;
    const parsed = resumeQuerySchema.safeParse({
      token: request.nextUrl.searchParams.get("token") ?? tokenFromCookie,
    });
    if (!parsed.success) {
      throw new KnownApiError(400, "A resume token is required.");
    }

    const repositories = createRepositories();
    const session = await repositories.sessions.findByResumeToken(
      parsed.data.token
    );
    if (!session) {
      throw new KnownApiError(404, "This resume link is no longer valid.");
    }
    if (session.status === "withdrawn") {
      throw new KnownApiError(410, "This session has been withdrawn.");
    }

    const [responses, consent] = await Promise.all([
      repositories.responses.listBySession(session.id),
      repositories.consent.listBySession(session.id),
    ]);

    return NextResponse.json({
      session: {
        sessionId: session.id,
        participantId: session.participantId,
        status: session.status,
        currentQuestionId: session.currentQuestionId,
        responseMode: session.responseMode,
        questionnaireVersion: session.questionnaireVersion,
      },
      responses: responses.map((r) => ({
        questionId: r.questionId,
        construct: r.construct,
        responseType: r.responseType,
        responseValue: JSON.stringify(r.responseValue),
        updatedAt: r.updatedAt,
      })),
      consent: consent.at(-1)
        ? {
            consentVersion: consent.at(-1)!.consentVersion,
            consentedAt: consent.at(-1)!.consentedAt,
          }
        : null,
    });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Could not resume your session right now."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
