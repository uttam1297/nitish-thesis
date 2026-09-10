import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { SESSION_STATUSES, RESPONSE_MODES } from "@/lib/supabase/records";
import { createRepositories } from "@/lib/supabase/repositories";
import { isUsingInMemoryFallback } from "@/lib/supabase/server-client";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth-client";

export const dynamic = "force-dynamic";

interface AdminOverviewPageProps {
  searchParams: Promise<{ status?: string; mode?: string }>;
}

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewPageProps) {
  const { status: statusFilter, mode: modeFilter } = await searchParams;
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repositories = createRepositories();
  const [sessions, participants] = await Promise.all([
    repositories.sessions.listAll(),
    repositories.participants.listAll(),
  ]);
  const participantsById = new Map(participants.map((p) => [p.id, p]));

  const overview = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.status === "completed").length,
    inProgressSessions: sessions.filter(
      (s) => s.status === "started" || s.status === "in_progress"
    ).length,
    liveInterviews: sessions.filter((s) => s.responseMode === "live_interview")
      .length,
    asynchronousForms: sessions.filter(
      (s) => s.responseMode === "asynchronous_form"
    ).length,
  };

  const filteredSessions = sessions.filter(
    (session) =>
      (!statusFilter || session.status === statusFilter) &&
      (!modeFilter || session.responseMode === modeFilter)
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Research overview</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/live-session"
            className={buttonVariants({ variant: "secondary" })}
          >
            Start live interview
          </Link>
          <a
            href="/api/admin/export/csv"
            className={buttonVariants({ variant: "ghost" })}
          >
            Export CSV
          </a>
          <a
            href="/api/admin/export/qualitative"
            className={buttonVariants({ variant: "ghost" })}
          >
            Export qualitative CSV
          </a>
          <a
            href="/api/admin/export/json"
            className={buttonVariants({ variant: "ghost" })}
          >
            Export JSON
          </a>
          <form
            action={async () => {
              "use server";
              const client = await createSupabaseServerAuthClient();
              await client.auth.signOut();
            }}
          >
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      {isUsingInMemoryFallback() && (
        <Surface className="mb-6 border-danger/30 bg-danger/5 p-4 text-sm">
          SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — showing an
          in-memory dataset that resets on restart. Configure the environment
          variables in README.md to persist real research data.
        </Surface>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Total sessions", overview.totalSessions],
          ["Completed", overview.completedSessions],
          ["In progress", overview.inProgressSessions],
          ["Live interviews", overview.liveInterviews],
          ["Async forms", overview.asynchronousForms],
        ].map(([label, value]) => (
          <Surface key={label as string} className="p-4 text-center">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Surface>
        ))}
      </div>

      <form
        className="mb-4 flex flex-wrap items-end gap-3 text-sm"
        aria-label="Filter sessions"
      >
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-md border px-3 py-2"
          >
            <option value="">All statuses</option>
            {SESSION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-muted-foreground">Mode</span>
          <select
            name="mode"
            defaultValue={modeFilter ?? ""}
            className="rounded-md border px-3 py-2"
          >
            <option value="">All modes</option>
            {RESPONSE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply filter
        </Button>
        {(statusFilter || modeFilter) && (
          <Link href="/admin" className="text-sm text-primary underline">
            Clear
          </Link>
        )}
      </form>

      <Surface className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-surface-subtle text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Questionnaire version</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session) => {
              const participant = participantsById.get(session.participantId);
              return (
                <tr key={session.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {participant?.participantCode ?? "—"}
                  </td>
                  <td className="px-4 py-3">{participant?.role || "—"}</td>
                  <td className="px-4 py-3">{participant?.industry || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.status} />
                  </td>
                  <td className="px-4 py-3">
                    {session.responseMode === "live_interview"
                      ? "Live interview"
                      : "Async form"}
                  </td>
                  <td className="px-4 py-3">{session.studyStage}</td>
                  <td className="px-4 py-3">{session.questionnaireVersion}</td>
                  <td className="px-4 py-3">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {session.completedAt
                      ? new Date(session.completedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-primary underline"
                      href={`/admin/sessions/${session.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filteredSessions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={10}>
                  {sessions.length === 0
                    ? "No sessions yet."
                    : "No sessions match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-success/10 text-success"
      : status === "withdrawn"
        ? "bg-danger/10 text-danger"
        : "bg-surface-subtle text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
