import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError, KnownApiError } from "@/lib/google-sheets/api-errors";
import {
  createSessionRequestSchema,
  resumeQuerySchema,
} from "@/lib/google-sheets/api-schemas";
import { CONSENT_VERSION } from "@/config/study";
import { createRepositories } from "@/lib/google-sheets/repositories";

export const dynamic = "force-dynamic";

const RESUME_COOKIE = "interview_resume_token";
const RESUME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days

/** Starts a new session: one participant row, one session row, one consent row. */
export async function POST(request: NextRequest) {
  try {
    const body = createSessionRequestSchema.parse(await request.json());
    const repositories = createRepositories();

    const participant = await repositories.participants.create(body.profile);
    const { session, resumeToken } = await repositories.sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: body.questionnaireVersion,
      responseMode: body.responseMode,
      firstQuestionId: body.firstQuestionId,
    });
    await repositories.consent.record({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      consentVersion: body.consent.consentVersion || CONSENT_VERSION,
      participationConsent: body.consent.participationConsent,
      voiceInputConsent: body.consent.voiceInputConsent,
      recordingConsent: body.consent.recordingConsent,
    });

    const cookieStore = await cookies();
    cookieStore.set(RESUME_COOKIE, resumeToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: RESUME_COOKIE_MAX_AGE_SECONDS,
    });

    console.info("[interview] session created", {
      sessionId: session.record.sessionId,
      responseMode: body.responseMode,
    });

    return NextResponse.json({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      sessionRowRef: session.rowRef,
      resumeToken,
      startedAt: session.record.startedAt,
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
    const found = await repositories.sessions.findByResumeToken(
      parsed.data.token
    );
    if (!found) {
      throw new KnownApiError(404, "This resume link is no longer valid.");
    }
    if (found.record.status === "withdrawn") {
      throw new KnownApiError(410, "This session has been withdrawn.");
    }

    const [responses, consent] = await Promise.all([
      repositories.responses.listBySession(found.record.sessionId),
      repositories.consent.listBySession(found.record.sessionId),
    ]);

    return NextResponse.json({
      session: found.record,
      sessionRowRef: found.rowRef,
      responses,
      consent: consent.at(-1) ?? null,
    });
  } catch (error) {
    const safe = toSafeApiError(
      error,
      "Could not resume your session right now."
    );
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }
}
