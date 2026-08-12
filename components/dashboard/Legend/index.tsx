/** What the three colours mean, said once rather than in every tooltip. */

import "./Legend.css";

import type { StatusCounts } from "../../../utils/dashboard";
import { CHART_COLOR, STATUS_LABEL } from "../constants";

export interface LegendProps {
  counts: StatusCounts;
}

export function Legend({ counts }: LegendProps) {
  const entries = [
    { key: "correct", value: counts.correct, color: CHART_COLOR.correct },
    { key: "wrong", value: counts.wrong, color: CHART_COLOR.wrong },
    { key: "left", value: counts.left, color: CHART_COLOR.left },
  ] as const;

  return (
    <ul className="legend">
      {entries.map((entry) => (
        <li key={entry.key} className="legend-item">
          <span className="legend-dot" style={{ background: entry.color }} />
          <span className="legend-value num">{entry.value}</span>
          <span className="legend-label">{STATUS_LABEL[entry.key]}</span>
        </li>
      ))}
    </ul>
  );
}
