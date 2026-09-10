"use client";

/**
 * Thin fetch wrappers for `/api/interview/*`. Deliberately has no
 * dependency on anything under `src/lib/supabase/` — those modules are
 * `server-only` and must never end up in the client bundle. Types here
 * are a minimal, independent mirror of the API's JSON shape.
 *
 * No row-ref tracking here (unlike the earlier Google Sheets backend):
 * Postgres's own `UNIQUE(session_id, question_id)` + upsert means the
 * server always knows which row a question's answer belongs to.
 */

export interface CreateSessionPayload {
  questionnaireVersion: string;
  responseMode: "asynchronous_form" | "live_interview";
  firstQuestionId: string;
  /** Idempotency key — see the comment on the schema field server-side. */
  clientRequestId: string;
  profile: {
    role: string;
    industry: string;
    experience: string;
    closenessToDiscovery: string;
  };
  consent: {
    consentVersion: string;
    participationConsent: true;
    voiceInputConsent: boolean;
    recordingConsent: boolean;
  };
}

export interface CreateSessionResult {
  participantId: string;
  sessionId: string;
  resumeToken: string;
  startedAt: string;
}

export interface SyncAnswerPayload {
  questionId: string;
  questionVersion: string;
  construct: string;
  responseType: string;
  responseValue: string;
  optionalElaboration?: string;
}

export interface SyncPayload {
  sessionId: string;
  resumeToken: string;
  currentQuestionId: string;
  progressPercentage: number;
  answers: SyncAnswerPayload[];
}

export interface SyncResult {
  savedAt: string;
}

export interface SubmitPayload {
  sessionId: string;
  resumeToken: string;
}

export interface SubmitResult {
  success: true;
  alreadyCompleted: boolean;
  /** Pseudonymous research code (e.g. "P007"), shown on the thank-you screen. */
  participantCode: string | null;
}

async function postJson<TResult>(url: string, body: unknown): Promise<TResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      (payload && typeof payload.error === "string" && payload.error) ||
        `Request to ${url} failed with status ${response.status}.`
    );
  }
  return response.json() as Promise<TResult>;
}

export function createServerSession(
  payload: CreateSessionPayload
): Promise<CreateSessionResult> {
  return postJson<CreateSessionResult>("/api/interview/session", payload);
}

export function syncAnswers(payload: SyncPayload): Promise<SyncResult> {
  return postJson<SyncResult>("/api/interview/sync", payload);
}

export function submitServerSession(
  payload: SubmitPayload
): Promise<SubmitResult> {
  return postJson<SubmitResult>("/api/interview/submit", payload);
}

export interface ResumeResult {
  session: {
    sessionId: string;
    participantId: string;
    status: string;
    currentQuestionId: string;
    responseMode: string;
    questionnaireVersion: string;
  };
  responses: {
    questionId: string;
    construct: string;
    responseType: string;
    responseValue: string;
    updatedAt: string;
  }[];
  consent: {
    consentVersion: string;
    consentedAt: string;
  } | null;
}

export async function resumeServerSession(
  token: string
): Promise<ResumeResult> {
  const response = await fetch(
    `/api/interview/session?token=${encodeURIComponent(token)}`
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      (payload && typeof payload.error === "string" && payload.error) ||
        "Could not resume this session."
    );
  }
  return response.json() as Promise<ResumeResult>;
}
