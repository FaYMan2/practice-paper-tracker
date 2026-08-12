/**
 * Accuracy per subject, weakest first.
 *
 * Sorted rather than alphabetical on purpose: the useful question is not "how
 * is algorithms going" but "what should I revise", and that is the top bar.
 */

import "./AccuracyBars.css";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import * as R from "ramda";
import { accuracy } from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { formatPercent } from "../../../utils/format";
import { CHART_COLOR } from "../constants";
import { BAR_SIZE, ROW_HEIGHT, WEAK_THRESHOLD } from "./constants";

export * from "./constants";

interface Row {
  key: string;
  label: string;
  accuracy: number;
  attempted: number;
}

export interface AccuracyBarsProps {
  groups: TopicGroup[];
  /** Nothing attempted anywhere, so the caller can say so instead. */
  emptyMessage: string;
}

function toRow(group: TopicGroup): Row | null {
  const value = accuracy(group.stats);
  if (value === null) return null;

  const row: Row = {
    key: group.key,
    label: group.label,
    accuracy: value,
    attempted: group.stats.solvedRows,
  };
  return row;
}

function weakestFirst(groups: TopicGroup[]): Row[] {
  const rows = R.filter(R.isNotNil, groups.map(toRow));
  return R.sortBy(R.prop("accuracy"), rows);
}

export function AccuracyBars({ groups, emptyMessage }: AccuracyBarsProps) {
  const rows = weakestFirst(groups);
  if (rows.length === 0) return <p className="bars-empty">{emptyMessage}</p>;

  return (
    <div className="bars" style={{ height: rows.length * ROW_HEIGHT + 24 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 44, top: 4, bottom: 4 }}>
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#57534e" }}
          />
          <Bar
            dataKey="accuracy"
            barSize={BAR_SIZE}
            radius={[0, 999, 999, 0]}
            isAnimationActive={false}
            label={{
              position: "right",
              formatter: (value: unknown) =>
                formatPercent(typeof value === "number" ? value : null),
              fontSize: 11,
              fill: "#78716c",
            }}
          >
            {rows.map((row) => (
              <Cell
                key={row.key}
                fill={row.accuracy < WEAK_THRESHOLD ? CHART_COLOR.wrong : CHART_COLOR.correct}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
