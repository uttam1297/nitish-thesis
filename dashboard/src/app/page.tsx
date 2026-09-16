import { BarChart, CompletionChart, TrendChart } from "@/components/charts";
import { MetricCard } from "@/components/data-display";
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
import { formatTimestamp } from "@/lib/research/format";

export const dynamic = "force-dynamic";

// Violet ramp for the primary series, with two distinguishable companions
// that stay legible next to it and in greyscale.
const PARTICIPANT_COLOUR = "#6d28d9";
const RESPONSE_COLOUR = "#a78bfa";
const COMPLETION_COLOUR = "#15803d";

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

  const trajectory = metrics.trajectory;
  const series = [
    {
      name: "Participants started",
      colour: PARTICIPANT_COLOUR,
      points: trajectory.map((point) => ({
        date: point.date,
        value: point.cumulativeParticipants,
      })),
    },
    {
      name: "Answers recorded",
      colour: RESPONSE_COLOUR,
      points: trajectory.map((point) => ({
        date: point.date,
        value: point.cumulativeResponses,
      })),
    },
    {
      name: "Interviews finished",
      colour: COMPLETION_COLOUR,
      points: trajectory.map((point) => ({
        date: point.date,
        value: point.cumulativeCompletions,
      })),
    },
  ];

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Master&apos;s thesis research</p>
          <h1>What data do we have?</h1>
          <p className="lede">
            {title}. A read-only view of everything collected through the
            interview form so far.
          </p>
        </div>
        <p className="muted small">
          Last refreshed {formatTimestamp(data.snapshot.refreshedAt, timezone)}
        </p>
      </header>

      <section aria-labelledby="headline">
        <h2 id="headline">The dataset at a glance</h2>
        <div className="card-grid">
          <MetricCard
            label="People taking part"
            value={metrics.totalParticipants}
            detail="One interview session each"
          />
          <MetricCard
            label="Finished interviews"
            value={metrics.completedSessions}
            detail={`${metrics.inProgressSessions} still in progress`}
          />
          <MetricCard
            label="Answers collected"
            value={metrics.storedResponses}
            detail="Individual questions answered"
          />
          <MetricCard
            label="Still unanswered"
            value={metrics.missingResponses}
            detail="Questions asked but not yet answered"
          />
        </div>
      </section>

      <section aria-labelledby="trajectory">
        <h2 id="trajectory">How the dataset is growing</h2>
        <div className="panel">
          <TrendChart
            series={series}
            caption="Running totals by day. Hover a point for its exact value. A flat line means no new data that day."
          />
        </div>
      </section>

      <section aria-labelledby="composition">
        <h2 id="composition">Who is taking part</h2>
        <div className="two-column">
          <div className="panel">
            <h3>Professional responsibility</h3>
            <BarChart
              data={metrics.roleDistribution.map((item) => ({
                label: item.label,
                value: item.count,
                percentage: item.percentage,
              }))}
              caption="From each participant's own Q1 answer. People may choose more than one area, so the percentages can add up to more than 100%."
            />
          </div>
          <div className="panel">
            <h3>Industry</h3>
            <BarChart
              data={metrics.industryDistribution.map((item) => ({
                label: item.label,
                value: item.count,
                percentage: item.percentage,
              }))}
            />
          </div>
          <div className="panel">
            <h3>Years of experience</h3>
            <BarChart
              data={metrics.experienceDistribution.map((item) => ({
                label: item.label,
                value: item.count,
                percentage: item.percentage,
              }))}
              caption="Shown from least to most experienced rather than by size."
            />
          </div>
          <div className="panel">
            <h3>Closeness to customer discovery</h3>
            <BarChart
              data={metrics.closenessDistribution.map((item) => ({
                label: item.label,
                value: item.count,
                percentage: item.percentage,
              }))}
              caption="Self-rated on a 1-5 scale, where 5 is 'very closely'."
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="question-completion">
        <h2 id="question-completion">How many people answered each question</h2>
        <div className="panel">
          <CompletionChart
            rows={metrics.questionCompletion.map((item) => ({
              label: item.label,
              done: item.resolved,
              total: item.expected,
              note: item.retired
                ? "No longer asked — kept here because earlier participants answered it."
                : item.conditional
                  ? "Only asked of some participants, so its total is lower."
                  : undefined,
            }))}
            caption="Each total counts only the people who were actually asked that question. Q7 is skipped for participants who work solely in engineering, so it is never counted as missing for them. Retired questions stay listed because the answers already collected for them are still real data."
          />
        </div>
      </section>

      <section aria-labelledby="participant-completion">
        <h2 id="participant-completion">How far each person has got</h2>
        <div className="panel">
          <CompletionChart
            rows={metrics.participantCompletion.map((item) => ({
              label: item.participantCode,
              done: item.answered,
              total: item.expected,
            }))}
            caption="Answered out of the questions asked of that person. Totals differ because the questionnaire skips some questions depending on earlier answers."
          />
        </div>
      </section>

      <section className="two-column" aria-label="Recent activity">
        <div className="panel">
          <h2>Recent activity</h2>
          <p>
            Last answer saved{" "}
            <strong>{formatTimestamp(metrics.latestActivity, timezone)}</strong>
            .
          </p>
          {trajectory.length > 0 && (
            <p className="muted small">
              Collection started {trajectory[0].date}. Most recent activity on{" "}
              {trajectory.at(-1)?.date}.
            </p>
          )}
        </div>
        <div className="panel">
          <h2>Data quality</h2>
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
              No duplicate participant codes, duplicate answers, orphaned rows
              or unreadable values were found.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
