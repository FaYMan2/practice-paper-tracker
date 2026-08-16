/** One labelled figure, and the rows they line up in. */

import type { ReactNode } from "react";
import { cn } from "../ui";

export interface StatProps {
  value: string;
  label: string;
  title?: string;
  /** Tints the figure when it carries a verdict rather than a plain count. */
  tone?: "correct" | "wrong" | "accent";
  /** The headline figure on a panel, set larger than the ones beside it. */
  lead?: boolean;
}

const TONE = {
  correct: "text-correct",
  wrong: "text-wrong",
  accent: "text-accent",
} as const;

export function Stat({ value, label, title, tone, lead }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5" title={title}>
      <span
        className={cn(
          "num font-bold leading-none tracking-tight",
          lead ? "text-3xl" : "text-[22px]",
          tone ? TONE[tone] : "",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-7 gap-y-3.5">{children}</div>;
}
