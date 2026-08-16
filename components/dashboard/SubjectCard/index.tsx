/**
 * One subject, summarised.
 *
 * The ring shows how much of the subject is done and how it went; everything
 * else on the card is there to answer "is this the one I should open next?".
 *
 * The whole card is the button. A card with a button inside it makes the reader
 * work out which part is clickable, and the answer is always "all of it".
 */

import { ChevronRight } from "lucide-react";
import { accuracy, coverage, statusCounts } from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent, pluralize } from "../../../utils/format";
import { NOT_STARTED, PARTIAL_INDEX_NOTE, UNKNOWN_TOTAL } from "../constants";
import { Legend } from "../Legend";
import { StatusDonut } from "../StatusDonut";
import { Stat } from "../Stat";
import { cn } from "../ui";

export interface SubjectCardProps {
  group: TopicGroup;
  onOpen: (key: string) => void;
}

/** "40 / 298", or "≥40 / 298" while questions in the subject are undiscovered. */
function attemptedText(group: TopicGroup): string {
  const { solvedRows, totalFromSite, fullyIndexed } = group.stats;
  const prefix = fullyIndexed ? "" : "≥";
  return `${prefix}${solvedRows} / ${totalFromSite ?? UNKNOWN_TOTAL}`;
}

export function SubjectCard({ group, onOpen }: SubjectCardProps) {
  const { stats } = group;
  const touched = stats.solvedRows > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(group.key)}
      className={cn(
        "group flex flex-col gap-4 rounded-card border border-line bg-surface p-5 text-left",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:-translate-y-px hover:border-accent/40 hover:shadow-[0_2px_4px_rgba(28,25,23,0.04),0_12px_28px_rgba(28,25,23,0.07)]",
        // Started subjects carry a hairline of accent, so the grid reads at a
        // glance as "these are the ones in play".
        touched && "border-l-2 border-l-accent",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 flex items-center gap-1 text-[15px] font-semibold tracking-tight">
            <span className="truncate">{group.label}</span>
            <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </h3>
          <span className="text-xs text-muted">
            {pluralize(group.children.length, "topic")}
            {stats.fullyIndexed ? "" : ` · ${PARTIAL_INDEX_NOTE}`}
          </span>
        </div>

        <StatusDonut
          stats={stats}
          size={72}
          caption={formatPercent(coverage(stats))}
          label="done"
        />
      </div>

      <div className="flex flex-wrap gap-x-7 gap-y-3">
        <Stat value={attemptedText(group)} label="attempted" />
        <Stat
          value={touched ? formatPercent(accuracy(stats)) : NO_VALUE}
          label="accuracy"
          tone={touched ? "accent" : undefined}
        />
      </div>

      <Legend counts={statusCounts(stats)} />

      <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        <span className="num">
          {stats.marksEarned}
          {stats.totalMarksFromSite === null ? "" : ` / ${stats.totalMarksFromSite}`} marks
        </span>
        <span>{touched ? (formatDate(stats.lastActivityAt) ?? "") : NOT_STARTED}</span>
      </div>
    </button>
  );
}
