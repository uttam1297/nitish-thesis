import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { toSafeApiError, KnownApiError } from "@/lib/google-sheets/api-errors";
import {
  createSessionRequestSchema,
  resumeQuerySchema,
} from "@/lib/google-sheets/api-schemas";
import { CONSENT_VERSION } from "@/config/study";
import { QUESTIONNAIRE_VERSION } from "@/config/interview";
import { createRepositories } from "@/lib/google-sheets/repositories";

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

    // Never trust a client-supplied questionnaire version: it must match
    // what this server actually serves, or historical/incoming data could
    // end up mislabeled.
    if (body.questionnaireVersion !== QUESTIONNAIRE_VERSION) {
      throw new KnownApiError(
        409,
        "Your session was started under an outdated version of this study. Please reload the page."
      );
    }

    const repositories = createRepositories();

    // Idempotency: a retried "start a session" request (network blip,
    // double-fire) must not create a second participant/session/consent
    // row set. If this exact client request already succeeded, reattach
    // to that session instead — see SessionRepository.rotateResumeToken
    // for why the returned token differs from the original attempt's.
    const existing = await repositories.sessions.findByClientRequestId(
      body.clientRequestId
    );
    if (existing) {
      const resumeToken = await repositories.sessions.rotateResumeToken(
        existing.rowRef
      );
      await setResumeCookie(resumeToken);
      console.info("[interview] session creation retried (idempotent)", {
        sessionId: existing.record.sessionId,
      });
      return NextResponse.json({
        participantId: existing.record.participantId,
        sessionId: existing.record.sessionId,
        sessionRowRef: existing.rowRef,
        resumeToken,
        startedAt: existing.record.startedAt,
      });
    }

    const participant = await repositories.participants.create(body.profile);
    const { session, resumeToken } = await repositories.sessions.create({
      participantId: participant.participantId,
      questionnaireVersion: body.questionnaireVersion,
      responseMode: body.responseMode,
      firstQuestionId: body.firstQuestionId,
      clientRequestId: body.clientRequestId,
    });
    await repositories.consent.record({
      participantId: participant.participantId,
      sessionId: session.record.sessionId,
      consentVersion: body.consent.consentVersion || CONSENT_VERSION,
      participationConsent: body.consent.participationConsent,
      voiceInputConsent: body.consent.voiceInputConsent,
      recordingConsent: body.consent.recordingConsent,
    });

    await setResumeCookie(resumeToken);

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
