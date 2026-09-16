import Link from "next/link";

import { FilterBar } from "@/components/filter-bar";
import { getDashboardConfig } from "@/lib/config/dashboard-config";
import { getDashboardData } from "@/lib/research/dashboard-data";
import { applyParticipantFilters, parseDashboardFilters } from "@/lib/research/filters";
import { formatTimestamp, humanize } from "@/lib/research/format";
import { buildPublicResponseRows } from "@/lib/research/privacy";

export const dynamic = "force-dynamic";

function text(value: string | string[] | undefined, limit = 80) { return typeof value === "string" ? value.slice(0, limit) : ""; }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""; }

export default async function ResponsesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseDashboardFilters(params);
  const data = await getDashboardData();
  const config = getDashboardConfig();
  const participant = text(params.participant, 40).toLocaleLowerCase();
  const question = text(params.question, 10);
  const construct = text(params.construct);
  const responseType = text(params.responseType);
  const presence = text(params.presence);
  const from = validDate(text(params.from, 10));
  const to = validDate(text(params.to, 10));
  const scopedParticipants = applyParticipantFilters(data.participants, filters).filter((item) => !participant || item.participantCode.toLocaleLowerCase().includes(participant));
  const rows = buildPublicResponseRows(scopedParticipants, config).filter((row) =>
    (!question || row.questionId === question) && (!construct || row.construct === construct) && (!responseType || row.responseType === responseType) &&
    (presence !== "answered" || row.answerState === "ANSWERED") && (presence !== "missing" || row.answerState !== "ANSWERED") &&
    (!from || (row.createdAt ?? "") >= `${from}T00:00:00`) && (!to || (row.createdAt ?? "") <= `${to}T23:59:59`),
  );

  return <main className="page"><header className="page-header"><div><p className="eyebrow">Long-format explorer</p><h1>All Responses</h1><p className="lede">Researcher-friendly response records with server-side privacy redaction.</p></div><strong>{rows.length} rows</strong></header><FilterBar filters={filters} showStatus />
    <form className="filter-bar" method="get"><input type="hidden" name="stage" value={filters.stage} /><input type="hidden" name="version" value={filters.version} /><input type="hidden" name="mode" value={filters.mode} /><input type="hidden" name="status" value={filters.status} /><label>Participant<input name="participant" defaultValue={text(params.participant)} placeholder="P007" /></label><label>Question<input name="question" defaultValue={question} placeholder="q7" /></label><label>Construct<input name="construct" defaultValue={construct} /></label><label>Response type<input name="responseType" defaultValue={responseType} /></label><label>Answer presence<select name="presence" defaultValue={presence}><option value="">All</option><option value="answered">Answered</option><option value="missing">Missing/unavailable</option></select></label><label>From<input type="date" name="from" defaultValue={from} /></label><label>To<input type="date" name="to" defaultValue={to} /></label><button className="button" type="submit">Apply response filters</button></form>
    {!config.showNarratives && <p className="definition">Narrative display is disabled. Verbatim text is removed from the server-rendered public projection, not merely hidden visually.</p>}
    <div className="table-wrap"><table><caption>Question response records</caption><thead><tr><th>Participant</th><th>Question</th><th>Construct / type</th><th>Readable answer</th><th>Session</th><th>Stage / mode</th><th>Questionnaire</th><th>Created</th><th>Updated</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.participantCode}-${row.questionId}`}><td><Link href={`/participants/${row.participantCode}`}>{row.participantCode}</Link></td><td><Link href={`/questions/${row.questionId}`}>{row.questionId}</Link><br /><span className="muted">{row.question}</span></td><td>{humanize(row.construct)}<br /><span className="muted">{humanize(row.responseType)}</span></td><td>{row.readableAnswer}{row.rawValue !== undefined && <details><summary>Raw JSON</summary><pre>{JSON.stringify(row.rawValue, null, 2)}</pre></details>}</td><td>{humanize(row.sessionStatus)}</td><td>{humanize(row.studyStage)}<br /><span className="muted">{humanize(row.mode)}</span></td><td>{row.questionnaireVersion}</td><td>{formatTimestamp(row.createdAt, config.timezone)}</td><td>{formatTimestamp(row.updatedAt, config.timezone)}</td></tr>)}</tbody></table>{!rows.length && <p className="empty">No records match these filters.</p>}</div>
  </main>;
}
