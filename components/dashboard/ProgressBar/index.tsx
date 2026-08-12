/** The same three-way split as the donut, in the space of a table row. */

import "./ProgressBar.css";

import { accuracy, statusCounts, unattemptedRows } from "../../../utils/dashboard";
import type { TopicStats } from "../../../utils/dashboard";
import { formatPercent } from "../../../utils/format";

export interface ProgressBarProps {
  stats: TopicStats;
}

function tooltip(stats: TopicStats, total: number): string {
  return [
    `${stats.correctRows} correct`,
    `${stats.wrongRows} wrong`,
    `${unattemptedRows(stats)} not attempted`,
    `of ${total}`,
    `accuracy ${formatPercent(accuracy(stats))}`,
  ].join(" · ");
}

export function ProgressBar({ stats }: ProgressBarProps) {
  const counts = statusCounts(stats);
  const total = counts.correct + counts.wrong + counts.left;
  const share = (value: number): string => (total === 0 ? "0%" : `${(value / total) * 100}%`);

  return (
    <div className="bar" title={total === 0 ? undefined : tooltip(stats, total)}>
      <span className="bar-correct" style={{ width: share(counts.correct) }} />
      <span className="bar-wrong" style={{ width: share(counts.wrong) }} />
    </div>
  );
}
