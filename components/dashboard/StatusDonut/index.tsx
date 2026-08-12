/**
 * Correct, wrong and untouched as one ring.
 *
 * The denominator is the site's own question count wherever it is known, so
 * the pale part of the ring is genuinely what is left rather than what happens
 * to have been indexed so far.
 */

import "./StatusDonut.css";

import { Cell, Pie, PieChart } from "recharts";
import { statusCounts } from "../../../utils/dashboard";
import type { TopicStats } from "../../../utils/dashboard";
import { CHART_COLOR, STATUS_LABEL } from "../constants";

/** Recharts insets the plot area unless told otherwise. */
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 } as const;

interface Slice {
  key: keyof typeof STATUS_LABEL;
  name: string;
  value: number;
  fill: string;
}

export interface StatusDonutProps {
  stats: TopicStats;
  size: number;
  /** Rendered in the hole. A percentage usually, but the caller decides. */
  caption?: string;
  label?: string;
}

function slices(stats: TopicStats): Slice[] {
  const counts = statusCounts(stats);
  const built: Slice[] = [
    { key: "correct", name: STATUS_LABEL.correct, value: counts.correct, fill: CHART_COLOR.correct },
    { key: "wrong", name: STATUS_LABEL.wrong, value: counts.wrong, fill: CHART_COLOR.wrong },
    { key: "left", name: STATUS_LABEL.left, value: counts.left, fill: CHART_COLOR.left },
  ];
  return built.filter((slice) => slice.value > 0);
}

export function StatusDonut({ stats, size, caption, label }: StatusDonutProps) {
  const data = slices(stats);
  const radius = size / 2;
  // An untouched topic would otherwise render as nothing at all, so it gets a
  // full pale ring rather than an empty box.
  const shown: Slice[] =
    data.length > 0
      ? data
      : [{ key: "left", name: STATUS_LABEL.left, value: 1, fill: CHART_COLOR.left }];

  return (
    <div className="donut" style={{ width: size, height: size }}>
      {/*
        Zero margin, and the centre placed by hand: Recharts insets the plot
        area by 5px on every side by default and measures `cx`/`cy` inside it,
        which pushes the ring down and right until the SVG clips it.
      */}
      <PieChart width={size} height={size} margin={NO_MARGIN}>
        <Pie
          data={shown}
          dataKey="value"
          nameKey="name"
          cx={radius}
          cy={radius}
          innerRadius={radius * 0.64}
          outerRadius={radius}
          startAngle={90}
          endAngle={-270}
          paddingAngle={shown.length > 1 ? 1.5 : 0}
          stroke="none"
          isAnimationActive={false}
        >
          {shown.map((slice) => (
            <Cell key={slice.key} fill={slice.fill} />
          ))}
        </Pie>
      </PieChart>

      {caption ? (
        <div className="donut-hole">
          <span className="donut-value num" style={{ fontSize: Math.round(size * 0.2) }}>
            {caption}
          </span>
          {label ? <span className="donut-label">{label}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
