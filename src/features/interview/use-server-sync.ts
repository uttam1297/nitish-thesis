"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatAnswer } from "@/domain/interview/summary";
import type { InterviewContextValue } from "@/features/interview/interview-provider";
import {
  createServerSession,
  submitServerSession,
  syncAnswers,
  type SyncAnswerPayload,
} from "@/features/interview/server-sync-client";
import {
  clearPendingSessionRequestId,
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

/**
 * Layers server persistence on top of the Phase 2 interview engine without
 * changing it: it observes `interview.state`, and mirrors changed answers
 * to Google Sheets (via the API routes) using the batching/row-ref
 * strategy documented in `src/lib/google-sheets/response-repository.ts`.
 * Local autosave (`InterviewProvider`) remains the source of truth —
 * a failed sync never touches it.
 */
export function useServerSync(interview: InterviewContextValue) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const identityRef = useRef<SessionIdentity | null>(null);
  const hasSubmittedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    identityRef.current = loadSessionIdentity();
  }, []);

  const runSync = useCallback(async () => {
    const { state, questionnaire } = interview;
    if (inFlightRef.current) return;

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

    inFlightRef.current = true;
    setStatus("saving");
    try {
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
            voiceInputConsent: state.consent.granted,
            recordingConsent: false,
          },
        });
        identityRef.current = {
          participantId: created.participantId,
          sessionId: created.sessionId,
          sessionRowRef: created.sessionRowRef,
          resumeToken: created.resumeToken,
          rowRefs: {},
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
          rowRef: identity.rowRefs[question.id],
        });
      }

      const result = await syncAnswers({
        sessionId: identity.sessionId,
        sessionRowRef: identity.sessionRowRef,
        resumeToken: identity.resumeToken,
        currentQuestionId: state.currentStepId,
        progressPercentage: interview.progress.percent,
        answers: changed,
      });

      for (const { questionId, rowRef } of result.rowRefs) {
        identity.rowRefs[questionId] = rowRef;
        const response = state.responses[questionId];
        if (response) identity.syncedUpdatedAt[questionId] = response.updatedAt;
      }
      saveSessionIdentity(identity);
      setStatus("saved");
    } catch {
      // The participant-safe message already logged server-side; here we
      // just mark the sync as failed so the UI can show a subtle retry
      // state. The local draft (Phase 2) still has every answer.
      setStatus("error");
    } finally {
      inFlightRef.current = false;
    }
  }, [interview]);

  // Debounced sync on meaningful state changes (answers, navigation).
  useEffect(() => {
    const timer = window.setTimeout(runSync, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.state.responses, interview.state.currentStepId]);

  // Silent retry while a sync attempt is failing.
  useEffect(() => {
    if (status !== "error") return;
    const timer = window.setInterval(runSync, RETRY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [status, runSync]);

  // Idempotent final submit: guarded so a re-render never double-fires it.
  // Runs a sync first — a participant can click "Finish" before the
  // debounced sync has ever fired, and the session (created lazily on
  // first sync) must exist before there is anything to mark completed.
  useEffect(() => {
    if (interview.state.status !== "submitted") return;
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    void runSync().then(async () => {
      const identity = identityRef.current;
      if (!identity) {
        hasSubmittedRef.current = false;
        return;
      }
      try {
        await submitServerSession({
          sessionId: identity.sessionId,
          sessionRowRef: identity.sessionRowRef,
          resumeToken: identity.resumeToken,
        });
      } catch {
        // Safe to leave unresolved: the participant already sees the local
        // completion screen, and the retry loop above keeps syncing content
        // in the (rare) case the submit call itself failed on the network.
        hasSubmittedRef.current = false;
      }
    });
  }, [interview.state.status, runSync]);

  const [resumeLink, setResumeLink] = useState<string | null>(null);
  useEffect(() => {
    if (status !== "saved" && status !== "saving") return;
    const token = identityRef.current?.resumeToken;
    if (!token || typeof window === "undefined") return;
    setResumeLink(`${window.location.origin}/interview/resume?token=${token}`);
  }, [status]);

  return { status, resumeLink };
}
