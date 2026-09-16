import { Distribution, MetricCard } from "@/components/data-display";
import { FilterBar } from "@/components/filter-bar";
import { getDashboardConfig } from "@/lib/config/dashboard-config";
import {
  calculateDatasetMetrics,
  runIntegrityChecks,
} from "@/lib/research/analytics";
import { getDashboardData } from "@/lib/research/dashboard-data";
import {
  applyParticipantFilters,
  parseDashboardFilters,
} from "@/lib/research/filters";
import { formatPercent, formatTimestamp } from "@/lib/research/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const data = await getDashboardData();
  const participants = applyParticipantFilters(data.participants, filters);
  const metrics = calculateDatasetMetrics(participants);
  const integrity = runIntegrityChecks(data.snapshot, participants).filter(
    (item) => item.count > 0
  );
  const { timezone } = getDashboardConfig();
  const title =
    data.snapshot.studies[0]?.title ?? "B2C AI-mediated discovery study";

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Master&apos;s thesis research</p>
          <h1>What data do we have?</h1>
          <p className="lede">
            {title}. A read-only, descriptive view of collection progress and
            coverage.
          </p>
        </div>
        <p className="muted small">
          Questionnaire 1.3.0
          <br />
          Last refreshed {formatTimestamp(data.snapshot.refreshedAt, timezone)}
        </p>
      </header>
      <FilterBar filters={filters} />
      <p className="definition">
        <strong>Scope:</strong>{" "}
        {filters.stage === "main"
          ? "Main study only"
          : filters.stage === "pilot"
            ? "Pilot/test data only"
            : "Main and pilot combined"}
        . Pilot data is never silently included in the default main-study view.
      </p>
      <section aria-labelledby="headline">
        <h2 id="headline">Collection status</h2>
        <div className="card-grid">
          <MetricCard
            label="Total participants"
            value={metrics.totalParticipants}
            detail="Sessions in the selected scope"
          />
          <MetricCard
            label="Completed"
            value={metrics.completedSessions}
            detail="Not the same as total participants"
          />
          <MetricCard
            label="In progress"
            value={metrics.inProgressSessions}
            detail="Started or actively progressing"
          />
          <MetricCard
            label="Withdrawn"
            value={metrics.withdrawnSessions}
            detail="Retained as audit records"
          />
        </div>
      </section>
      <section className="two-column" aria-label="Coverage metrics">
        <div className="panel">
          <h2>Dataset coverage</h2>
          <strong className="value">
            {formatPercent(metrics.datasetCoverage)}
          </strong>
          <p>
            {metrics.storedResponses} valid stored responses /{" "}
            {metrics.expectedResponses} expected responses.
          </p>
          <p className="muted small">
            The denominator respects routing, including Q7 not being expected
            for engineering-only participants, and excludes withdrawn sessions.
          </p>
        </div>
        <div className="panel">
          <h2>Study stages</h2>
          <Distribution items={metrics.stageDistribution} />
        </div>
      </section>
      <section>
        <h2>Participant profile distributions</h2>
        <div className="two-column">
          <div className="panel">
            <h3>Professional responsibility</h3>
            <Distribution items={metrics.roleDistribution} />
            <p className="muted small">
              Multi-role participants count once in every selected role, so
              percentages may total more than 100%.
            </p>
          </div>
          <div className="panel">
            <h3>Industry</h3>
            <Distribution items={metrics.industryDistribution} />
          </div>
          <div className="panel">
            <h3>Experience</h3>
            <Distribution items={metrics.experienceDistribution} />
          </div>
          <div className="panel">
            <h3>Discovery closeness</h3>
            <Distribution items={metrics.closenessDistribution} />
          </div>
        </div>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>Collection timeline</h2>
          {metrics.timeline.length ? (
            <ul className="bar-list">
              {metrics.timeline.map((item) => (
                <li className="bar-row" key={item.date}>
                  <span>{item.date}</span>
                  <span className="bar-track" aria-hidden="true">
                    <span
                      style={{ width: `${Math.min(item.count * 20, 100)}%` }}
                    />
                  </span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No data collected for this scope.</p>
          )}
        </div>
        <div className="panel">
          <h2>Latest activity</h2>
          <p>{formatTimestamp(metrics.latestActivity, timezone)}</p>
          <h3>Data quality</h3>
          {integrity.length ? (
            <ul>
              {integrity.map((item) => (
                <li key={item.code}>
                  {item.message}: {item.count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No deterministic integrity warnings in this scope.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
