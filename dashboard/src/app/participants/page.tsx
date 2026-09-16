import Link from "next/link";

import { ParticipantFilters } from "@/components/participant-filters";
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
        <strong>{participants.length} matching</strong>
      </header>
      <ParticipantFilters
        filters={filters}
        roles={unique(allParticipants.flatMap((item) => [...item.roles]))}
        industries={unique(allParticipants.map((item) => item.industry))}
        experiences={unique(allParticipants.map((item) => item.experience))}
      />
      <div className="table-wrap">
        <table>
          <caption>Participant sessions in the selected scope</caption>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Role</th>
              <th>Profile</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Stage / mode</th>
              <th>Questionnaire</th>
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
                    (response) => response.question.id === "q1",
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
                <td>
                  {participant.answeredCount} / {participant.expectedCount}
                  <br />
                  <span className="muted">
                    {formatPercent(participant.coverage)}
                  </span>
                </td>
                <td>
                  {humanize(participant.studyStage)}
                  <br />
                  <span className="muted">
                    {humanize(participant.responseMode)}
                  </span>
                </td>
                <td>{participant.questionnaireVersion}</td>
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
