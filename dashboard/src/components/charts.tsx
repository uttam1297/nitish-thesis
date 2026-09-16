"use client";

import { formatPercent } from "@/lib/research/format";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
 * Daily collection events, intentionally kept on separate scales. A single
 * cumulative response line makes a burst of answers visually drown out the
 * much smaller (but equally important) participant and completion events.
 */
export function CollectionCadence({
  points,
}: {
  points: readonly Readonly<{
    date: string;
    participants: number;
    responses: number;
    completions: number;
  }>[];
}) {
  if (!points.length) return <p className="empty">No collection activity recorded yet.</p>;
  const tracks = [
    { label: "Participants started", key: "participants" as const, tone: "participant" },
    { label: "Interviews completed", key: "completions" as const, tone: "completion" },
    { label: "Responses saved", key: "responses" as const, tone: "response" },
  ];
  return <figure className="cadence-chart">
    <div className="cadence-axis" aria-hidden="true">{points.map((point) => <span key={point.date}>{point.date.slice(5)}</span>)}</div>
    {tracks.map((track) => {
      const max = Math.max(...points.map((point) => point[track.key]), 1);
      const total = points.reduce((sum, point) => sum + point[track.key], 0);
      return <div className="cadence-track" key={track.key}>
        <div className="cadence-label"><span className={`cadence-dot ${track.tone}`} />{track.label}<strong>{total}</strong></div>
        <div className="cadence-bars">
          {points.map((point) => <span className="cadence-day" key={point.date} title={`${track.label}: ${point[track.key]} on ${point.date}`}>
            <i className={track.tone} style={{ height: `${Math.max(point[track.key] ? 8 : 2, point[track.key] / max * 100)}%` }} />
            <b>{point[track.key]}</b>
          </span>)}
        </div>
      </div>;
    })}
    <figcaption className="muted small">Each track uses its own scale. Read the numbers within a track to see collection activity by date; do not compare bar heights across tracks.</figcaption>
  </figure>;
}

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

  const data = dates.map((date) => Object.fromEntries([
    ["date", date],
    ...series.map((item) => [item.name, item.points.find((point) => point.date === date)?.value ?? 0]),
  ]));

  return (
    <figure className="chart">
      <div className="trend-chart" role="img" aria-label={`${series.map((item) => item.name).join(", ")} running totals over the collection period`}>
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: -22 }}>
            <CartesianGrid stroke="#e7e8eb" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(date) => String(date).slice(5)} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e7e8eb", boxShadow: "0 8px 20px rgb(20 25 30 / 12%)" }} labelFormatter={(date) => `Date: ${date}`} />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            {series.map((item) => <Line key={item.name} type="linear" dataKey={item.name} stroke={item.colour} strokeWidth={2.25} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
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
