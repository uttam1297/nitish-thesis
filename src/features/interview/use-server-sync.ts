"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatAnswer } from "@/domain/interview/summary";
import type { InterviewContextValue } from "@/features/interview/interview-provider";
import {
  createServerSession,
  InterviewApiError,
  submitServerSession,
  syncAnswers,
  type SyncAnswerPayload,
} from "@/features/interview/server-sync-client";
import {
  clearPendingSessionRequestId,
  clearSessionIdentity,
  loadOrCreatePendingSessionRequestId,
  loadSessionIdentity,
  saveSessionIdentity,
  type SessionIdentity,
} from "@/lib/persistence/session-identity-storage";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

/** Every question currently has this fixed version; see README versioning notes. */
const QUESTION_VERSION = "1";
const SYNC_DEBOUNCE_MS = 1200;
const RETRY_INTERVAL_MS = 8000;

function isMissingSession(error: unknown): boolean {
  return error instanceof InterviewApiError && error.status === 404;
}

/**
 * Layers server persistence on top of the interview engine without
 * changing it: it observes `interview.state`, and mirrors changed answers
 * to Postgres (via the API routes), batched and debounced. Local autosave
 * (`InterviewProvider`) remains the source of truth — a failed sync never
 * touches it. No row-ref tracking is needed here: the server's
 * `UNIQUE(session_id, question_id)` upsert means the client only ever
 * needs to send its answers.
 */
export function useServerSync(interview: InterviewContextValue) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [participantCode, setParticipantCode] = useState<string | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);
  const identityRef = useRef<SessionIdentity | null>(null);
  const hasSubmittedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    identityRef.current = loadSessionIdentity();
  }, []);

  // Starting over means these answers belong to someone else — or to a
  // deliberately fresh attempt. Without this the next answers would upsert
  // straight into the abandoned draft's session and overwrite that
  // participant's rows, because the identity outlives the draft.
  const startOverCount = interview.startOverCount;
  const seenStartOverCount = useRef(startOverCount);
  useEffect(() => {
    if (startOverCount === seenStartOverCount.current) return;
    seenStartOverCount.current = startOverCount;
    identityRef.current = null;
    hasSubmittedRef.current = false;
    clearSessionIdentity();
    clearPendingSessionRequestId();
    setParticipantCode(null);
    setSubmitFailed(false);
    setStatus("idle");
  }, [startOverCount]);

  const performSync = useCallback(async () => {
    const { state, questionnaire } = interview;

    // The Participants sheet needs the profile fields, so server sync only
    // starts once the participant has moved past the profile ("about-you")
    // layer. Before that, local autosave alone covers resume-on-refresh.
    const currentQuestion =
      interview.currentStep.kind === "question"
        ? interview.currentStep.question
        : null;
    const currentSection = currentQuestion
      ? questionnaire.sections.find((s) => s.id === currentQuestion.section)
      : questionnaire.sections.find((s) =>
          interview.currentStep.kind === "section"
            ? interview.currentStep.section.id === s.id
            : false
        );
    const pastProfileLayer =
      currentSection?.layer === "core" ||
      questionnaire.sections
        .filter((s) => s.layer === "profile")
        .every((s) =>
          questionnaire.questions
            .filter((q) => q.section === s.id)
            .every((q) => Boolean(state.responses[q.id]))
        );

    if (!state.consent.granted || !pastProfileLayer) return;

    const syncCurrentState = async () => {
      if (!identityRef.current) {
        const profileQuestions = questionnaire.questions.filter(
          (q) =>
            questionnaire.sections.find((s) => s.id === q.section)?.layer ===
            "profile"
        );
        const findAnswerText = (id: string) => {
          const question = profileQuestions.find((q) => q.id === id);
          if (!question) return "";
          return formatAnswer(question, state.responses[id]);
        };

        // Persisted before the request fires: if the response never
        // arrives (closed tab, dropped connection), the retry on next
        // load reuses this id and the server reattaches to the session
        // the first attempt actually created, instead of duplicating it.
        const clientRequestId = loadOrCreatePendingSessionRequestId();

        const created = await createServerSession({
          questionnaireVersion: questionnaire.version,
          responseMode: "asynchronous_form",
          firstQuestionId: state.currentStepId,
          clientRequestId,
          profile: {
            role: findAnswerText("q1"),
            industry: findAnswerText("q2"),
            experience: findAnswerText("q3"),
            closenessToDiscovery: findAnswerText("q4"),
          },
          consent: {
            consentVersion: state.consent.consentVersion,
            participationConsent: true,
            // 1.5.0 removed voice input, so there is no voice capture to
            // consent to on the asynchronous form.
            voiceInputConsent: false,
            recordingConsent: false,
          },
        });
        identityRef.current = {
          participantId: created.participantId,
          sessionId: created.sessionId,
          resumeToken: created.resumeToken,
          syncedUpdatedAt: {},
        };
        saveSessionIdentity(identityRef.current);
        clearPendingSessionRequestId();
      }

      const identity = identityRef.current;
      const changed: SyncAnswerPayload[] = [];
      for (const question of questionnaire.questions) {
        const response = state.responses[question.id];
        if (!response?.value) continue;
        if (identity.syncedUpdatedAt[question.id] === response.updatedAt) {
          continue;
        }
        changed.push({
          questionId: question.id,
          questionVersion: QUESTION_VERSION,
          construct: question.construct,
          responseType: question.responseType,
          responseValue: JSON.stringify(response.value),
        });
      }

      await syncAnswers({
        sessionId: identity.sessionId,
        resumeToken: identity.resumeToken,
        currentQuestionId: state.currentStepId,
        progressPercentage: interview.progress.percent,
        answers: changed,
      });

      for (const { questionId } of changed) {
        const response = state.responses[questionId];
        if (response) identity.syncedUpdatedAt[questionId] = response.updatedAt;
      }
      saveSessionIdentity(identity);
      setStatus("saved");
    };

    setStatus("saving");
    try {
      await syncCurrentState();
    } catch (error) {
      if (identityRef.current && isMissingSession(error)) {
        // A database reset or administrative deletion can invalidate the
        // browser's cached session while its local answers are still valid.
        // Drop only the stale protocol identity, create a fresh server
        // session, and resend the current answers once.
        identityRef.current = null;
        clearSessionIdentity();
        clearPendingSessionRequestId();
        try {
          await syncCurrentState();
          return;
        } catch {
          // Fall through to the normal retry state. Local answers remain safe.
        }
      }

      // The participant-safe message already logged server-side; here we
      // just mark the sync as failed so the UI can show a subtle retry
      // state. The local draft (Phase 2) still has every answer.
      setStatus("error");
    }
  }, [interview]);

  const runSync = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const operation = performSync();
    inFlightRef.current = operation;
    void operation.then(
      () => {
        if (inFlightRef.current === operation) inFlightRef.current = null;
      },
      () => {
        if (inFlightRef.current === operation) inFlightRef.current = null;
      }
    );
    return operation;
  }, [performSync]);

  // Debounced sync on meaningful state changes (answers, navigation).
  useEffect(() => {
    if (interview.state.status === "submitted") return;
    const timer = window.setTimeout(runSync, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    interview.state.responses,
    interview.state.currentStepId,
    interview.state.status,
  ]);

  // Silent retry while a sync attempt is failing.
  useEffect(() => {
    if (status !== "error") return;
    const timer = window.setInterval(runSync, RETRY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [status, runSync]);

  /**
   * Marks the session completed server-side. Idempotent: `markCompleted`
   * only transitions a session that is not already completed, so a retry
   * can never produce a second completion.
   *
   * Returns false when the attempt failed and is worth retrying.
   */
  const runSubmit = useCallback(async (): Promise<boolean> => {
    const pendingSync = inFlightRef.current;
    if (pendingSync) await pendingSync;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await runSync();

      const identity = identityRef.current;
      // Nothing was ever persisted, so there is no session to complete.
      // The sync retry loop is what recovers this case.
      if (!identity) return false;

      try {
        const result = await submitServerSession({
          sessionId: identity.sessionId,
          resumeToken: identity.resumeToken,
        });
        setParticipantCode(result.participantCode);
        identityRef.current = null;
        clearSessionIdentity();
        clearPendingSessionRequestId();
        return true;
      } catch (error) {
        if (attempt === 0 && isMissingSession(error)) {
          identityRef.current = null;
          clearSessionIdentity();
          clearPendingSessionRequestId();
          continue;
        }
        return false;
      }
    }
    return false;
  }, [runSync]);

  // Final submit, fired once when the participant finishes. Runs a sync
  // first: a participant can click "Finish" before the debounced sync has
  // ever fired, and the session (created lazily on first sync) must exist
  // before there is anything to mark completed.
  useEffect(() => {
    if (interview.state.status !== "submitted") return;
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    void (async () => {
      const submitted = await runSubmit();
      setSubmitFailed(!submitted);
    })();
  }, [interview.state.status, runSubmit]);

  /**
   * Keeps retrying a failed final submit.
   *
   * This used to be left to the sync retry loop, which only ever resent
   * answers — it never called submit again. A submit that failed while
   * syncing still worked therefore stranded the session as "in progress"
   * for good: nothing re-rendered afterwards, so the effect above never
   * re-fired, and reloading did not help because the draft is cleared at
   * submission. The answers were safe; the completion was lost.
   */
  useEffect(() => {
    if (!submitFailed) return;
    if (participantCode) return;

    const timer = window.setInterval(() => {
      void (async () => {
        if (await runSubmit()) setSubmitFailed(false);
      })();
    }, RETRY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [submitFailed, participantCode, runSubmit]);

  const [resumeLink, setResumeLink] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "saved" && status !== "saving") return;
    const token = identityRef.current?.resumeToken;
    if (!token || typeof window === "undefined") return;
    setResumeLink(`${window.location.origin}/interview/resume?token=${token}`);
  }, [status]);

  return { status, resumeLink, participantCode };
}
