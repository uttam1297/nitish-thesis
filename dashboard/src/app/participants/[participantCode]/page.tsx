import { notFound } from "next/navigation";

import { getDashboardConfig } from "@/lib/config/dashboard-config";
import { getDashboardData } from "@/lib/research/dashboard-data";
import { displayAnswer } from "@/lib/research/privacy";
import {
  formatPercent,
  formatTimestamp,
  humanize,
} from "@/lib/research/format";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ participantCode: string }>;
}) {
  const { participantCode } = await params;
  const { participants } = await getDashboardData();
  const participant = participants.find(
    (item) => item.participantCode === participantCode
  );
  if (!participant) notFound();
  const config = getDashboardConfig();

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Participant detail</p>
          <h1>{participant.participantCode}</h1>
          <p className="lede">
            Pseudonymous session record and ordered questionnaire coverage.
          </p>
        </div>
        <span
          className={`badge ${participant.status === "withdrawn" ? "warning" : ""}`}
        >
          {humanize(participant.status)}
        </span>
      </header>
      <section className="card-grid">
        <article className="card">
          <span className="label">Progress</span>
          <strong className="value">
            {participant.answeredCount} / {participant.expectedCount}
          </strong>
          <span>{formatPercent(participant.coverage)}</span>
        </article>
        <article className="card">
          <span className="label">Questionnaire</span>
          <strong>{participant.questionnaireVersion}</strong>
          <p>
            Q7{" "}
            {participant.hiddenQuestionIds.includes("q7")
              ? "not expected"
              : "expected"}
          </p>
        </article>
        <article className="card">
          <span className="label">Consent</span>
          <strong>
            {participant.consent?.participation_consent
              ? "Participation agreed"
              : "Not recorded"}
          </strong>
          <p>
            {participant.consent
              ? `Consent ${participant.consent.consent_version}`
              : "No consent row"}
          </p>
        </article>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>Profile</h2>
          <dl>
            <dt>Roles</dt>
            <dd>
              {participant.responses.find(
                (response) => response.question.id === "q1"
              )?.readableAnswer ?? "Not recorded"}
            </dd>
            <dt>Industry</dt>
            <dd>{participant.industry || "Not recorded"}</dd>
            <dt>Experience</dt>
            <dd>{participant.experience || "Not recorded"}</dd>
            <dt>Discovery closeness</dt>
            <dd>{participant.discoveryCloseness || "Not recorded"}</dd>
          </dl>
        </div>
        <div className="panel">
          <h2>Timing</h2>
          <dl>
            <dt>Started</dt>
            <dd>{formatTimestamp(participant.startedAt, config.timezone)}</dd>
            <dt>Last activity</dt>
            <dd>
              {formatTimestamp(participant.lastActivityAt, config.timezone)}
            </dd>
            <dt>Completed</dt>
            <dd>{formatTimestamp(participant.completedAt, config.timezone)}</dd>
            <dt>Withdrawn</dt>
            <dd>{formatTimestamp(participant.withdrawnAt, config.timezone)}</dd>
          </dl>
        </div>
      </section>
      <section>
        <h2>Questionnaire record</h2>
        {participant.responses.map((response) => {
          const narrative = response.question.responseType === "voice_or_text";
          const readable = displayAnswer(response, config);
          // "Not applicable" is an answer the participant chose, so it reads as
          // resolved rather than as something wrong with the record.
          const resolved =
            response.state === "ANSWERED" ||
            response.state === "NOT_APPLICABLE";
          return (
            <article
              className={`panel answer-state ${resolved ? "answered" : ""}`}
              key={response.question.id}
            >
              <p className="eyebrow">
                {response.question.id} · {humanize(response.question.construct)}
              </p>
              <h3>{response.question.wording}</h3>
              <span className={`badge ${resolved ? "" : "warning"}`}>
                {humanize(response.state)}
              </span>
              <p>{readable}</p>
              {config.showRawJson &&
                response.answer &&
                (!narrative || config.showNarratives) && (
                  <details>
                    <summary>Raw response JSON</summary>
                    <pre>{JSON.stringify(response.answer, null, 2)}</pre>
                  </details>
                )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
