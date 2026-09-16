import { formatPercent } from "@/lib/research/format";

/**
 * Charts are plain server-rendered SVG: no chart library, no client
 * JavaScript, and no hydration cost. Every chart states its own numbers in
 * text next to the shape, so the figure is readable without colour vision,
 * and each bar or point carries a `<title>` the browser shows on hover.
 */

export type BarChartDatum = Readonly<{
  label: string;
  value: number;
  /** Optional share of the sample, shown after the count. */
  percentage?: number;
  /** Optional per-bar note, e.g. "not asked of 2 participants". */
  note?: string;
}>;

export function BarChart({
  data,
  caption,
  valueLabel = "participants",
  empty = "Nothing collected yet.",
}: {
  data: readonly BarChartDatum[];
  caption?: string;
  valueLabel?: string;
  empty?: string;
}) {
  if (!data.length) return <p className="empty">{empty}</p>;

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <figure className="chart">
      <ul className="chart-bars">
        {data.map((item) => (
          <li key={item.label}>
            <span className="chart-bar-label" title={item.label}>
              {item.label}
            </span>
            <span className="chart-bar-track">
              <span
                className="chart-bar-fill"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="chart-bar-value">
              <strong>{item.value}</strong>
              {item.percentage !== undefined && (
                <span className="muted"> {formatPercent(item.percentage)}</span>
              )}
            </span>
            {item.note && <span className="chart-bar-note">{item.note}</span>}
          </li>
        ))}
      </ul>
      {caption && <figcaption className="muted small">{caption}</figcaption>}
      <span className="visually-hidden">
        Largest value {max} {valueLabel}. Each row states its own count, so the
        chart is readable as a list.
      </span>
    </figure>
  );
}

export type TrendSeries = Readonly<{
  name: string;
  colour: string;
  points: readonly Readonly<{ date: string; value: number }>[];
}>;

/**
 * Cumulative totals over time. A line chart is the right shape here because
 * the x axis is a real date sequence and the running total only ever rises —
 * the slope is the thing worth reading, not the individual day.
 */
export function TrendChart({
  series,
  caption,
  empty = "No collection activity recorded yet.",
}: {
  series: readonly TrendSeries[];
  caption?: string;
  empty?: string;
}) {
  const dates = [
    ...new Set(
      series.flatMap((item) => item.points.map((point) => point.date))
    ),
  ].sort();
  if (dates.length === 0) return <p className="empty">{empty}</p>;

  const width = 720;
  const height = 260;
  const padding = { top: 16, right: 16, bottom: 44, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    ...series.flatMap((item) => item.points.map((point) => point.value)),
    1
  );

  const x = (date: string) =>
    dates.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (dates.indexOf(date) / (dates.length - 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + plotHeight - (value / maxValue) * plotHeight;

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((step) =>
    Math.round(maxValue * step)
  );
  // A short collection window should not repeat the same rounded tick.
  const ticks = [...new Set(gridValues)];

  return (
    <figure className="chart">
      <svg
        className="chart-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{`${series
          .map((item) => item.name)
          .join(", ")} over time, running totals`}</title>
        {ticks.map((value) => (
          <g key={value}>
            <line
              className="chart-grid"
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
            />
            <text className="chart-tick" x={padding.left - 10} y={y(value) + 4}>
              {value}
            </text>
          </g>
        ))}
        {dates.map((date) => (
          <text
            className="chart-tick"
            key={date}
            textAnchor="middle"
            x={x(date)}
            y={height - padding.bottom + 20}
          >
            {date.slice(5)}
          </text>
        ))}
        {series.map((item) => (
          <g key={item.name}>
            <polyline
              fill="none"
              points={item.points
                .map((point) => `${x(point.date)},${y(point.value)}`)
                .join(" ")}
              stroke={item.colour}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
            />
            {item.points.map((point) => (
              <circle
                cx={x(point.date)}
                cy={y(point.value)}
                fill={item.colour}
                key={`${item.name}-${point.date}`}
                r={4}
              >
                <title>{`${item.name} — ${point.date}: ${point.value}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <ul className="chart-legend">
        {series.map((item) => (
          <li key={item.name}>
            <span
              className="chart-swatch"
              style={{ background: item.colour }}
              aria-hidden="true"
            />
            {item.name}
            <strong> {item.points.at(-1)?.value ?? 0}</strong>
          </li>
        ))}
      </ul>
      {caption && <figcaption className="muted small">{caption}</figcaption>}
    </figure>
  );
}

export type CompletionRow = Readonly<{
  label: string;
  done: number;
  total: number;
  /** Visible under the row — keep it short; it is read at a glance. */
  note?: string;
  /** Hover text for the label, for detail that would crowd the chart. */
  title?: string;
}>;

/**
 * "How much of what was asked has been answered", one row per participant or
 * per question. The denominator is per row on purpose: participants are not
 * all asked the same number of questions.
 */
export function CompletionChart({
  rows,
  caption,
  empty = "Nothing to show yet.",
}: {
  rows: readonly CompletionRow[];
  caption?: string;
  empty?: string;
}) {
  if (!rows.length) return <p className="empty">{empty}</p>;

  return (
    <figure className="chart">
      <ul className="chart-bars completion">
        {rows.map((row) => {
          const share = row.total ? row.done / row.total : 0;
          return (
            <li key={row.label}>
              <span
                className="chart-bar-label"
                title={row.title ?? row.note ?? row.label}
              >
                {row.label}
              </span>
              <span
                className="chart-bar-track"
                title={`${row.done} of ${row.total} answered`}
              >
                <span
                  className={`chart-bar-fill ${share === 1 ? "complete" : ""}`}
                  style={{ width: `${share * 100}%` }}
                />
              </span>
              <span className="chart-bar-value">
                <strong>
                  {row.done}/{row.total}
                </strong>
              </span>
              {row.note && <span className="chart-bar-note">{row.note}</span>}
            </li>
          );
        })}
      </ul>
      {caption && <figcaption className="muted small">{caption}</figcaption>}
    </figure>
  );
}
