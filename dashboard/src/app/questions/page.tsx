import Link from "next/link";

import { FilterBar } from "@/components/filter-bar";
import { getDashboardData } from "@/lib/research/dashboard-data";
import {
  applyParticipantFilters,
  parseDashboardFilters,
} from "@/lib/research/filters";
import { formatPercent, humanize } from "@/lib/research/format";
import { buildQuestionViewModels } from "@/lib/research/view-models";

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
  const questions = buildQuestionViewModels(participants).filter(
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
        <strong>{questions.length} questions</strong>
      </header>
      <FilterBar filters={filters} />
      <form className="filter-bar" method="get">
        <input type="hidden" name="stage" value={filters.stage} />
        <input type="hidden" name="version" value={filters.version} />
        <input type="hidden" name="mode" value={filters.mode} />
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
          Apply question filters
        </button>
      </form>
      <p className="definition">
        <strong>Question coverage</strong> = valid stored responses /
        participants for whom the question was expected. Q7 excludes
        engineering-only participants from its denominator.
      </p>
      <div className="table-wrap">
        <table>
          <caption>Questions in questionnaire order</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>Wording</th>
              <th>Construct</th>
              <th>Response type</th>
              <th>Version</th>
              <th>Conditional</th>
              <th>Expected</th>
              <th>Stored</th>
              <th>Missing</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr key={question.questionId}>
                <td>
                  <Link
                    href={`/questions/${question.questionId}?stage=${filters.stage}&mode=${filters.mode}&version=${filters.version}`}
                  >
                    {question.questionId}
                  </Link>
                </td>
                <td>{question.wording}</td>
                <td>{humanize(question.construct)}</td>
                <td>{humanize(question.responseType)}</td>
                <td>1.3.0</td>
                <td>{question.conditional ? "Yes" : "No"}</td>
                <td>{question.expectedParticipantCount}</td>
                <td>{question.responseCount}</td>
                <td>{question.missingCount}</td>
                <td>{formatPercent(question.coverage)}</td>
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
