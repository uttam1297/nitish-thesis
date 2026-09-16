import { notFound } from "next/navigation";

import { Distribution, MetricCard } from "@/components/data-display";
import { FilterBar } from "@/components/filter-bar";
import { getDashboardConfig } from "@/lib/config/dashboard-config";
import { getQuestion } from "@/lib/research-metadata";
import { categoricalDistribution } from "@/lib/research/analytics";
import { getDashboardData } from "@/lib/research/dashboard-data";
import {
  applyParticipantFilters,
  parseDashboardFilters,
} from "@/lib/research/filters";
import { formatPercent, humanize } from "@/lib/research/format";
import {
  buildQuestionViewModels,
  isKnownQuestionId,
} from "@/lib/research/view-models";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { questionId } = await params;
  if (!isKnownQuestionId(questionId)) notFound();
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData();
  const question = buildQuestionViewModels(
    applyParticipantFilters(data.participants, filters)
  ).find((item) => item.questionId === questionId);
  if (!question) notFound();
  const metadata = getQuestion("1.3.0", questionId);
  if (!metadata) notFound();
  const config = getDashboardConfig();
  const narrative = metadata.responseType === "voice_or_text";
  const lengths = narrative
    ? question.responses.flatMap(({ response }) =>
        response.answer?.kind === "text" ? [response.answer.text.length] : []
      )
    : [];

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Question {question.questionId}</p>
          <h1>{question.wording}</h1>
          {question.hint && <p className="lede">{question.hint}</p>}
        </div>
        <span className="badge">{humanize(question.responseType)}</span>
      </header>
      <FilterBar filters={filters} />
      <section className="card-grid">
        <MetricCard
          label="Expected participants"
          value={question.expectedParticipantCount}
        />
        <MetricCard label="Stored responses" value={question.responseCount} />
        <MetricCard label="Missing responses" value={question.missingCount} />
        <MetricCard
          label="Question coverage"
          value={formatPercent(question.coverage)}
        />
      </section>
      <section className="panel">
        <h2>Definition</h2>
        <dl>
          <dt>Construct</dt>
          <dd>{humanize(question.construct)}</dd>
          <dt>Questionnaire version</dt>
          <dd>1.3.0</dd>
          <dt>Question version</dt>
          <dd>{metadata.questionVersion}</dd>
          <dt>Required</dt>
          <dd>{metadata.required ? "Yes" : "No"}</dd>
          <dt>Conditional behaviour</dt>
          <dd>
            {question.conditional
              ? "Q7 is not expected only when Q1 is exactly [engineering]."
              : "Always expected for eligible sessions."}
          </dd>
          <dt>Validation</dt>
          <dd>
            {metadata.responseType === "likert_scale"
              ? `${metadata.scale.minimum}–${metadata.scale.maximum} integer scale`
              : metadata.responseType === "voice_or_text"
                ? `At least ${metadata.validation.minimumNonWhitespaceCharacters} non-whitespace characters`
                : "Configured questionnaire options"}
          </dd>
        </dl>
      </section>
      <section className="panel">
        <h2>Descriptive distribution</h2>
        {narrative ? (
          <>
            <p>
              {config.showNarratives
                ? `${question.responseCount} narratives available below.`
                : "Narrative display disabled"}
            </p>
            {lengths.length > 0 && (
              <p className="muted small">
                Text length range: {Math.min(...lengths)}–{Math.max(...lengths)}{" "}
                characters. No semantic interpretation is performed.
              </p>
            )}
          </>
        ) : (
          <Distribution items={categoricalDistribution(question)} />
        )}
      </section>
      {narrative && config.showNarratives && (
        <section>
          <h2>Narrative responses</h2>
          {question.responses.map(({ participantCode, response }) => (
            <article className="panel" key={participantCode}>
              <strong>{participantCode}</strong>
              <p>{response.readableAnswer}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
