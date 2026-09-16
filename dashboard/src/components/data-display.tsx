import type { DistributionItem } from "@/lib/research/analytics";
import { formatPercent } from "@/lib/research/format";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <article className="card">
      <span className="label">{label}</span>
      <strong className="value">{value}</strong>
      {detail && <small className="muted">{detail}</small>}
    </article>
  );
}

export function Distribution({
  items,
  empty = "No data collected for this scope.",
}: {
  items: readonly DistributionItem[];
  empty?: string;
}) {
  if (!items.length) return <p className="empty">{empty}</p>;
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <span className="bar-track" aria-hidden="true">
            <span style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <strong>
            {item.count}{" "}
            <span className="muted">({formatPercent(item.percentage)})</span>
          </strong>
        </li>
      ))}
    </ul>
  );
}
