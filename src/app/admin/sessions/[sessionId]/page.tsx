import { notFound } from "next/navigation";

import { getQuestion } from "@/config/interview";
import { Surface } from "@/components/ui/surface";
import { createRepositories } from "@/lib/supabase/repositories";
import type { ResponseRecord } from "@/lib/supabase/records";
import { WithdrawButton } from "@/app/admin/sessions/[sessionId]/withdraw-button";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const { sessionId } = await params;
  const repositories = createRepositories();

  const session = await repositories.sessions.getById(sessionId);
  if (!session) notFound();

  const [participant, responses, consent] = await Promise.all([
    repositories.participants.getById(session.participantId),
    repositories.responses.listBySession(sessionId),
    repositories.consent.listBySession(sessionId),
  ]);
  const latestConsent = consent.at(-1);

  const byConstruct = new Map<string, ResponseRecord[]>();
  for (const response of responses) {
    const bucket = byConstruct.get(response.construct) ?? [];
    bucket.push(response);
    byConstruct.set(response.construct, bucket);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {participant?.participantCode ?? "Session"} · {sessionId.slice(0, 8)}
        </h1>
        {session.status !== "withdrawn" && (
          <WithdrawButton sessionId={sessionId} />
        )}
      </div>

      <Surface className="mb-6 grid gap-2 p-4 text-sm">
        <p>
          <strong>Status:</strong> {session.status}
        </p>
        <p>
          <strong>Mode:</strong> {session.responseMode}
        </p>
        <p>
          <strong>Stage:</strong> {session.studyStage}
        </p>
        <p>
          <strong>Questionnaire version:</strong> {session.questionnaireVersion}
        </p>
        <p>
          <strong>Role / industry / experience:</strong> {participant?.role} /{" "}
          {participant?.industry} / {participant?.experience}
        </p>
        <p>
          <strong>Consent:</strong>{" "}
          {latestConsent
            ? `participation=${latestConsent.participationConsent}, voice=${latestConsent.voiceInputConsent}, recording=${latestConsent.recordingConsent} (v${latestConsent.consentVersion})`
            : "no consent record"}
        </p>
        <p>
          <strong>Started:</strong>{" "}
          {new Date(session.startedAt).toLocaleString()}
        </p>
        {session.completedAt && (
          <p>
            <strong>Completed:</strong>{" "}
            {new Date(session.completedAt).toLocaleString()}
          </p>
        )}
      </Surface>

      <div className="grid gap-4">
        {[...byConstruct.entries()].map(([construct, items]) => (
          <Surface key={construct} className="p-4">
            <h2 className="mb-3 text-sm font-semibold">{construct}</h2>
            <ul className="grid gap-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="border-t pt-3 first:border-0 first:pt-0"
                >
                  <p className="text-xs text-muted-foreground">
                    {getQuestion(item.questionId)?.title ?? item.questionId}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {formatStoredValue(item.responseValue)}
                  </p>
                </li>
              ))}
            </ul>
          </Surface>
        ))}
        {responses.length === 0 && (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        )}
      </div>
    </main>
  );
}

function formatStoredValue(value: unknown): string {
  if (value === "[WITHDRAWN]") return "[withdrawn]";
  if (!value || typeof value !== "object") return String(value ?? "");

  const answer = value as
    | { kind: "text"; text: string }
    | { kind: "choice"; value: string }
    | { kind: "choices"; values: string[] }
    | { kind: "scale"; value: number }
    | { kind: "ranking"; order: string[] };

  switch (answer.kind) {
    case "text":
      return answer.text;
    case "choice":
      return answer.value;
    case "choices":
      return answer.values.join(", ");
    case "scale":
      return String(answer.value);
    case "ranking":
      return answer.order.join(" > ");
    default:
      return JSON.stringify(value);
  }
}
