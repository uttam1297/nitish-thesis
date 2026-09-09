"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusMessage } from "@/components/feedback/status-message";
import { Surface } from "@/components/ui/surface";
import { questionnaire } from "@/config/interview";
import { createInitialState } from "@/domain/interview/reducer";
import type { AnswerValue, InterviewState } from "@/domain/interview/types";
import { resumeServerSession } from "@/features/interview/server-sync-client";
import { draftStorage } from "@/lib/persistence/draft-storage";
import { saveSessionIdentity } from "@/lib/persistence/session-identity-storage";

interface ResumeClientProps {
  token: string | null;
}

export function ResumeClient({ token }: ResumeClientProps) {
  const router = useRouter();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = token ? fetchError : "This resume link is missing its token.";

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    resumeServerSession(token)
      .then((result) => {
        if (cancelled) return;

        if (result.session.questionnaireVersion !== questionnaire.version) {
          setFetchError(
            "This session was started under an earlier version of the questionnaire and can't be resumed automatically. Please contact the researcher."
          );
          return;
        }

        const base: InterviewState = createInitialState(questionnaire);
        const responses: InterviewState["responses"] = {};
        for (const response of result.responses) {
          try {
            const value = JSON.parse(response.responseValue) as AnswerValue;
            responses[response.questionId] = {
              questionId: response.questionId,
              value,
              method: "typed",
              skipped: false,
              updatedAt: response.updatedAt,
            };
          } catch {
            // Skip a row that isn't valid JSON rather than failing the
            // whole resume; the participant can re-answer that question.
          }
        }

        const state: InterviewState = {
          ...base,
          questionnaireVersion: result.session.questionnaireVersion,
          currentStepId: result.session.currentQuestionId || base.currentStepId,
          responses,
          consent: {
            granted: true,
            grantedAt: result.consent?.consentedAt ?? null,
            consentVersion:
              result.consent?.consentVersion ?? base.consent.consentVersion,
          },
        };

        draftStorage.save({
          questionnaireVersion: result.session.questionnaireVersion,
          state,
          savedAt: new Date().toISOString(),
        });
        saveSessionIdentity({
          participantId: result.session.participantId,
          sessionId: result.session.sessionId,
          sessionRowRef: result.sessionRowRef,
          resumeToken: token,
          rowRefs: {},
          syncedUpdatedAt: {},
        });

        router.replace("/interview");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setFetchError(
          cause instanceof Error
            ? cause.message
            : "Could not resume this session."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Surface className="grid max-w-md gap-4 p-6 text-center">
        {error ? (
          <StatusMessage variant="warning">{error}</StatusMessage>
        ) : (
          <p className="text-sm text-muted-foreground">
            Resuming your session…
          </p>
        )}
      </Surface>
    </main>
  );
}
