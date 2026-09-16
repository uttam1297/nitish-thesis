import Link from "next/link";

import {
  ParticipantFilters,
  type RoleOption,
} from "@/components/participant-filters";
import { getQuestion } from "@/lib/research-metadata";
import { getDashboardConfig } from "@/lib/config/dashboard-config";
import { getDashboardData } from "@/lib/research/dashboard-data";
import {
  applyParticipantFilters,
  parseDashboardFilters,
} from "@/lib/research/filters";
import {
  formatPercent,
  formatTimestamp,
  humanize,
} from "@/lib/research/format";
import { MetricCard } from "@/components/data-display";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const { participants: allParticipants } = await getDashboardData();
  const participants = applyParticipantFilters(allParticipants, filters);
  const { timezone } = getDashboardConfig();
  const unique = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort();
  // Roles are stored as slugs ("digital-strategy"); the filter shows the
  // wording the participant actually chose from.
  const q1 = getQuestion("1.5.0", "q1");
  const roleOptions: RoleOption[] = unique(
    allParticipants.flatMap((item) => [...item.roles])
  ).map((value) => ({
    value,
    label:
      value === "__other__"
        ? "Other"
        : q1?.responseType === "multi_select"
          ? (q1.options.find((option) => option.value === value)?.label ??
            value)
          : value,
  }));

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Explore the sample</p>
          <h1>Participants</h1>
          <p className="lede">
            Pseudonymous participant profiles, collection status, and
            questionnaire completeness.
          </p>
        </div>
        <span className="record-count">{participants.length} matching participants</span>
      </header>
      <section className="explorer-summary" aria-label="Participant summary">
        <MetricCard label="Total participants" value={allParticipants.length} />
        <MetricCard label="Completed" value={allParticipants.filter((item) => item.status === "completed").length} />
        <MetricCard label="In progress" value={allParticipants.filter((item) => item.status === "started" || item.status === "in_progress").length} />
        <MetricCard label="Average completion" value={formatPercent(allParticipants.length ? allParticipants.reduce((sum, item) => sum + item.coverage, 0) / allParticipants.length : 0)} />
      </section>
      <ParticipantFilters
        filters={filters}
        roles={roleOptions}
        industries={unique(allParticipants.map((item) => item.industry))}
        experiences={unique(allParticipants.map((item) => item.experience))}
      />
      <div className="table-wrap research-table">
        <table>
          <caption>Everyone who has started the interview</caption>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Role</th>
              <th>Industry / experience</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr
                key={`${participant.participantCode}-${participant.startedAt}`}
              >
                <td>
                  <Link
                    href={`/participants/${encodeURIComponent(participant.participantCode)}`}
                  >
                    {participant.participantCode}
                  </Link>
                </td>
                <td>
                  {participant.responses.find(
                    (response) => response.question.id === "q1"
                  )?.readableAnswer ?? "Not recorded"}
                </td>
                <td>
                  {participant.industry}
                  <br />
                  <span className="muted">
                    {participant.experience} · {participant.discoveryCloseness}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${participant.status === "withdrawn" ? "warning" : ""}`}
                  >
                    {humanize(participant.status)}
                  </span>
                </td>
                <td><span className="table-progress"><i style={{ width: `${participant.coverage * 100}%` }} /><b>{formatPercent(participant.coverage)}</b></span><span className="muted small">{participant.answeredCount} resolved of {participant.expectedCount}</span></td>
                <td>{formatTimestamp(participant.startedAt, timezone)}</td>
                <td>{formatTimestamp(participant.lastActivityAt, timezone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!participants.length && (
          <p className="empty">No records match these filters.</p>
        )}
      </div>
    </main>
  );
}
