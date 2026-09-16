import Link from "next/link";

import { getDashboardData } from "@/lib/research/dashboard-data";
import {
  applyParticipantFilters,
  parseDashboardFilters,
} from "@/lib/research/filters";
import { formatPercent, humanize } from "@/lib/research/format";
import { CompletionChart } from "@/components/charts";
import {
  buildQuestionSummaries,
  buildQuestionViewModels,
} from "@/lib/research/view-models";
import { MetricCard } from "@/components/data-display";

export const dynamic = "force-dynamic";

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value.slice(0, 80) : "";
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseDashboardFilters(params);
  const data = await getDashboardData();
  const participants = applyParticipantFilters(data.participants, filters);
  const construct = text(params.construct);
  const responseType = text(params.responseType);
  const coverage = text(params.coverage);
  // Merged across questionnaire versions: a visitor thinks in terms of "Q5",
  // not "Q5 as worded under 1.3.0".
  const questions = buildQuestionSummaries(
    buildQuestionViewModels(participants)
  ).filter(
    (question) =>
      (!construct || question.construct === construct) &&
      (!responseType || question.responseType === responseType) &&
      (coverage !== "incomplete" || question.coverage < 1) &&
      (coverage !== "complete" || question.coverage === 1)
  );
  const constructs = [
    ...new Set(data.questions.map((question) => question.construct)),
  ].sort();
  const responseTypes = [
    ...new Set(data.questions.map((question) => question.responseType)),
  ].sort();

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Question-level evidence</p>
          <h1>Questions</h1>
          <p className="lede">
            Coverage and descriptive distributions for each distinct
            questionnaire item.
          </p>
        </div>
        <span className="record-count">{questions.length} questions</span>
      </header>
      <section className="explorer-summary" aria-label="Question coverage summary">
        <MetricCard label="Active questions" value={questions.filter((item) => !item.retired).length} />
        <MetricCard label="Retired questions" value={questions.filter((item) => item.retired).length} detail="Historical evidence retained" />
        <MetricCard label="Average coverage" value={formatPercent(questions.length ? questions.reduce((sum, item) => sum + item.coverage, 0) / questions.length : 0)} />
        <MetricCard label="Below 80% coverage" value={questions.filter((item) => item.coverage < .8).length} />
      </section>
      <form className="filter-bar" method="get">
        <label>
          Construct
          <select name="construct" defaultValue={construct}>
            <option value="">All constructs</option>
            {constructs.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Response type
          <select name="responseType" defaultValue={responseType}>
            <option value="">All types</option>
            {responseTypes.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Coverage
          <select name="coverage" defaultValue={coverage}>
            <option value="">All coverage</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <button className="button" type="submit">
          Apply filters
        </button>
      </form>
      <p className="definition">
        <strong>Answered</strong> counts the people who were actually asked each
        question. Questions marked <strong>Retired</strong> are no longer part
        of the interview; they stay listed because earlier participants did
        answer them. Q7 is not asked of participants who work solely in
        engineering, so they are left out of its total rather than counted as
        missing.
      </p>
      <div className="panel">
        <h2>Answers per question</h2>
        <CompletionChart
          rows={questions.map((question) => ({
            label: question.questionId.toUpperCase(),
            done: question.responseCount + question.notApplicableCount,
            total: question.expectedParticipantCount,
            title: question.wording,
            note: question.retired ? "Retired — no longer asked" : undefined,
          }))}
          caption="Hover a bar for the exact count; hover a label for the full question wording."
          empty="No questions match these filters."
        />
      </div>
      <div className="table-wrap research-table">
        <table>
          <caption>Questions in questionnaire order</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>Wording</th>
              <th>Construct</th>
              <th>Response type</th>
              <th>Status</th>
              <th>Conditional</th>
              <th>Expected</th>
              <th>Answered</th>
              <th>Not applicable</th>
              <th>Missing</th>
              <th>Answered share</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.questionId}>
                <td>
                  <Link href={`/questions/${question.questionId}`}>
                    {question.questionId}
                  </Link>
                </td>
                <td>
                  <span className="question-wording">{question.wording}</span>
                </td>
                <td>{humanize(question.construct)}</td>
                <td>{humanize(question.responseType)}</td>
                <td>
                  {question.retired ? (
                    <span className="badge warning">Retired</span>
                  ) : (
                    <span className="badge">Asked now</span>
                  )}
                </td>
                <td>{question.conditional ? "Yes" : "No"}</td>
                <td>{question.expectedParticipantCount}</td>
                <td>{question.responseCount}</td>
                <td>{question.notApplicableCount}</td>
                <td>{question.missingCount}</td>
                <td><span className="table-progress"><i style={{ width: `${question.coverage * 100}%` }} /><b>{formatPercent(question.coverage)}</b></span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!questions.length && (
          <p className="empty">No records match these filters.</p>
        )}
      </div>
    </main>
  );
}
