/** What the three colours mean, said once rather than in every tooltip. */

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
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-baseline gap-1.5">
          <span
            className="size-2 shrink-0 self-center rounded-full"
            style={{ background: entry.color }}
          />
          <span className="num font-bold">{entry.value}</span>
          <span className="text-xs text-muted">{STATUS_LABEL[entry.key]}</span>
        </li>
      ))}
    </ul>
  );
}
