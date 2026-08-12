/** One labelled figure, and the rows they line up in. */

import "./Stat.css";

import type { ReactNode } from "react";

export interface StatProps {
  value: string;
  label: string;
  title?: string;
  /** Tints the figure when it carries a verdict rather than a plain count. */
  tone?: "correct" | "wrong" | "accent";
}

export function Stat({ value, label, title, tone }: StatProps) {
  return (
    <div className="stat" title={title}>
      <span className={`stat-value num${tone ? ` stat-${tone}` : ""}`}>{value}</span>
      <span className="caption">{label}</span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="stat-row">{children}</div>;
}
