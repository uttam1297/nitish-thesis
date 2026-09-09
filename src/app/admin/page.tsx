import Link from "next/link";

import { auth, signOut } from "@/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { createRepositories } from "@/lib/google-sheets/repositories";
import { isUsingInMemoryFallback } from "@/lib/google-sheets/client-factory";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await auth();
  const repositories = createRepositories();
  const [sessions, participants] = await Promise.all([
    repositories.sessions.listAll(),
    repositories.participants.listAll(),
  ]);
  const participantsById = new Map(
    participants.map((p) => [p.participantId, p])
  );

  const overview = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.record.status === "completed")
      .length,
    inProgressSessions: sessions.filter(
      (s) => s.record.status === "started" || s.record.status === "in_progress"
    ).length,
    liveInterviews: sessions.filter(
      (s) => s.record.responseMode === "live_interview"
    ).length,
    asynchronousForms: sessions.filter(
      (s) => s.record.responseMode === "asynchronous_form"
    ).length,
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Research overview</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session?.user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/live-session"
            className={buttonVariants({ variant: "secondary" })}
          >
            Start live interview
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
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
          GOOGLE_* credentials are not set — showing an in-memory dataset that
          resets on restart. Configure the environment variables in README.md to
          persist real research data.
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

      <Surface className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-surface-subtle text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sessions.map(({ record }) => {
              const participant = participantsById.get(record.participantId);
              return (
                <tr key={record.sessionId} className="border-b last:border-0">
                  <td className="px-4 py-3">{participant?.role || "—"}</td>
                  <td className="px-4 py-3">{participant?.industry || "—"}</td>
                  <td className="px-4 py-3">{record.status}</td>
                  <td className="px-4 py-3">{record.responseMode}</td>
                  <td className="px-4 py-3">{record.questionnaireVersion}</td>
                  <td className="px-4 py-3">
                    {new Date(record.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {record.completedAt
                      ? new Date(record.completedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-primary underline"
                      href={`/admin/sessions/${record.sessionId}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                  No sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Surface>
    </main>
  );
}
