"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextInput } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { QUESTIONNAIRE_VERSION, questionnaire } from "@/config/interview";
import { CONSENT_VERSION } from "@/config/study";

/**
 * Researcher-facing form to start a live interview session. Reuses the
 * exact same participant/session/response schema as the async form (see
 * `/api/admin/live-session`), tagged `response_mode = "live_interview"`.
 */
export default function AdminLiveSessionPage() {
  const [profile, setProfile] = useState({
    role: "",
    industry: "",
    experience: "",
    closenessToDiscovery: "",
  });
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-xl font-semibold">Start a live interview</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Record the participant&apos;s profile as you introduce the study
        verbally, then confirm consent before opening the interview.
      </p>

      <Surface className="grid gap-4 p-4">
        {(
          ["role", "industry", "experience", "closenessToDiscovery"] as const
        ).map((field) => (
          <div key={field} className="grid gap-1.5">
            <Label htmlFor={field}>{field}</Label>
            <TextInput
              id={field}
              value={profile[field]}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
            />
          </div>
        ))}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recordingConsent}
            onChange={(event) => setRecordingConsent(event.target.checked)}
          />
          Participant consented to call recording (separate from voice-input
          consent)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const response = await fetch("/api/admin/live-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  questionnaireVersion: QUESTIONNAIRE_VERSION,
                  firstQuestionId: questionnaire.questions[0].id,
                  profile,
                  consent: {
                    consentVersion: CONSENT_VERSION,
                    participationConsent: true,
                    voiceInputConsent: false,
                    recordingConsent,
                  },
                }),
              });
              if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.error ?? "Could not create the session.");
              }
              const result = (await response.json()) as {
                resumeLinkPath: string;
              };
              setLink(`${window.location.origin}${result.resumeLinkPath}`);
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Something went wrong."
              );
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Creating…" : "Create live session"}
        </Button>

        {link && (
          <div className="grid gap-2 border-t pt-4 text-sm">
            <p>Open this link in the interview browser to begin:</p>
            <code className="rounded-md border bg-surface-subtle p-2 text-xs break-all">
              {link}
            </code>
          </div>
        )}
      </Surface>
    </main>
  );
}
