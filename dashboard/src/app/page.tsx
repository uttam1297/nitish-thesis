import Link from "next/link";
import { Activity, ArrowUpRight, CircleAlert, FileCheck2 } from "lucide-react";
import { BarChart, CollectionCadence, CompletionChart } from "@/components/charts";
import { MetricCard } from "@/components/data-display";
import { getDashboardConfig } from "@/lib/config/dashboard-config";
import { getDashboardData } from "@/lib/research/dashboard-data";
import { formatPercent, formatTimestamp, humanize } from "@/lib/research/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const data = await getDashboardData();
  const { metrics } = data;
  const { timezone } = getDashboardConfig();
  const coverage = metrics.expectedResponses ? (metrics.expectedResponses - metrics.missingResponses) / metrics.expectedResponses : 0;
  const openIntegrity = data.integrity.filter((item) => item.count > 0);
  const title = data.snapshot.studies[0]?.title ?? "Thesis research study";
  return <main className="page overview-page">
    <header className="page-header"><div><p className="eyebrow">Research intelligence</p><h1>Dataset overview</h1><p className="lede">{title}. A descriptive view of collection progress, evidence coverage, and the current sample.</p></div><div className="header-status"><Activity size={15} /><span>Last refreshed {formatTimestamp(data.snapshot.refreshedAt, timezone)}</span></div></header>

    <section aria-labelledby="dataset-state"><div className="section-heading"><div><h2 id="dataset-state">Current dataset state</h2><p>Read the collection status before drilling into individual records.</p></div><span className="research-status"><FileCheck2 size={15} /> Questionnaire {data.participants[0]?.questionnaireVersion ?? "—"}</span></div>
      <div className="metric-grid">
        <MetricCard label="Participants" value={metrics.totalParticipants} detail={`${metrics.inProgressSessions} interviews in progress`} />
        <MetricCard label="Completed interviews" value={metrics.completedSessions} detail={`${formatPercent(metrics.totalParticipants ? metrics.completedSessions / metrics.totalParticipants : 0)} of participants`} />
        <MetricCard label="Responses collected" value={metrics.storedResponses} detail={`${metrics.missingResponses} expected responses missing`} />
        <MetricCard label="Questionnaire coverage" value={formatPercent(coverage)} detail={`${metrics.expectedResponses - metrics.missingResponses} resolved of ${metrics.expectedResponses} expected`} />
      </div>
    </section>

    <section className="overview-analysis" aria-label="Collection progress and research completeness">
      <article className="panel chart-panel"><div className="panel-heading"><div><h2>Collection cadence</h2><p>What was added on each active date—without letting high-volume response records hide interview progress.</p></div><Link href="/responses">Explore records <ArrowUpRight size={14} /></Link></div><CollectionCadence points={metrics.trajectory} /></article>
      <article className="panel completeness-panel"><div className="panel-heading"><div><h2>Research completeness</h2><p>Interview status across the current sample.</p></div></div><div className="segmented-status" aria-label={`${metrics.completedSessions} completed, ${metrics.inProgressSessions} in progress, ${metrics.withdrawnSessions} withdrawn`}>
        {metrics.completedSessions > 0 && <span className="complete" style={{ flex: metrics.completedSessions }} />}{metrics.inProgressSessions > 0 && <span className="progress" style={{ flex: metrics.inProgressSessions }} />}{metrics.withdrawnSessions > 0 && <span className="withdrawn" style={{ flex: metrics.withdrawnSessions }} />}
      </div><dl className="status-key"><div><dt><i className="complete" />Completed</dt><dd>{metrics.completedSessions}</dd></div><div><dt><i className="progress" />In progress</dt><dd>{metrics.inProgressSessions}</dd></div>{metrics.withdrawnSessions > 0 && <div><dt><i className="withdrawn" />Withdrawn</dt><dd>{metrics.withdrawnSessions}</dd></div>}</dl>
      <div className="completeness-note"><strong>{metrics.missingResponses}</strong><span>expected responses still need resolution</span></div></article>
    </section>

    <section aria-labelledby="question-coverage"><div className="section-heading"><div><h2 id="question-coverage">Question coverage</h2><p>Expected counts honour questionnaire routing. Conditional and retired questions stay in questionnaire order.</p></div><Link href="/questions" className="quiet-link">Evidence explorer <ArrowUpRight size={14} /></Link></div><details className="coverage-disclosure"><summary><span><strong>{metrics.questionCompletion.length} questionnaire items</strong><small>{metrics.missingResponses} expected responses remain unresolved</small></span><span className="coverage-summary-bar" aria-hidden="true"><i style={{ width: `${coverage * 100}%` }} /></span><b>{formatPercent(coverage)}</b><span className="disclosure-action">Show coverage</span></summary><div className="panel coverage-panel"><CompletionChart rows={metrics.questionCompletion.map((item) => ({ label: item.label.toUpperCase(), done: item.resolved, total: item.expected, title: item.wording, note: item.retired ? "Retired — historical evidence retained" : item.conditional ? "Conditional — expected count varies by routing" : undefined }))} caption="Answered includes valid not-applicable responses. Q7 only counts participants who were shown the question." /></div></details></section>

    <section aria-labelledby="sample"><div className="section-heading"><div><h2 id="sample">Sample composition</h2><p>Descriptive profile fields only. Professional responsibility is multi-select, so shares may total more than 100%.</p></div></div><div className="composition-grid">
      <article className="panel"><h3>Professional responsibility</h3><BarChart data={metrics.roleDistribution.map((item) => ({ label: item.label, value: item.count, percentage: item.percentage }))} /></article>
      <article className="panel"><h3>Industry</h3><BarChart data={metrics.industryDistribution.map((item) => ({ label: item.label, value: item.count, percentage: item.percentage }))} /></article>
      <article className="panel"><h3>Relevant experience</h3><BarChart data={metrics.experienceDistribution.map((item) => ({ label: item.label, value: item.count, percentage: item.percentage }))} /></article>
      <article className="panel"><h3>Discovery proximity</h3><BarChart data={metrics.closenessDistribution.map((item) => ({ label: item.label, value: item.count, percentage: item.percentage }))} /></article>
    </div></section>

    <section className="overview-bottom" aria-label="Participant progress and data quality"><article><div className="section-heading"><div><h2>Participant progress</h2><p>Use the matrix to spot incomplete interviews without scanning a long list.</p></div><Link href="/participants" className="quiet-link">All participants <ArrowUpRight size={14} /></Link></div><details className="participant-disclosure"><summary><span><strong>{metrics.participantCompletion.length} participants</strong><small>{metrics.inProgressSessions} interviews remain in progress</small></span><span className="participant-status-count"><i />{metrics.completedSessions} completed</span><span className="disclosure-action">Show matrix</span></summary><div className="participant-matrix">{metrics.participantCompletion.map((item) => <Link key={item.participantCode} href={`/participants/${item.participantCode}`}><span>{item.participantCode}</span><span className="matrix-track"><i style={{ width: `${item.expected ? item.answered / item.expected * 100 : 0}%` }} /></span><b>{item.answered}/{item.expected}</b><em>{humanize(item.status)}</em></Link>)}</div></details></article>
      <article className={`quality-summary ${openIntegrity.length ? "has-issues" : ""}`}><CircleAlert size={18} /><div><h2>Data quality</h2>{openIntegrity.length ? <ul>{openIntegrity.map((item) => <li key={item.code}>{item.message}: {item.count}</li>)}</ul> : <p>No duplicate participant codes, duplicate answers, orphaned rows, or unreadable values were found.</p>}</div></article></section>
  </main>;
}
