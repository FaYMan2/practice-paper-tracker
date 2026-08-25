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
import { accuracy, averageTimeMs, coverage } from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import {
  NO_VALUE,
  formatDate,
  formatDuration,
  formatPercent,
  pluralize,
} from "../../../utils/format";
import type { TopicSummary } from "../../../types";
import {
  AVERAGED_OVER_TITLE,
  NOT_STARTED,
  PARTIAL_INDEX_TITLE,
  UNKNOWN_TOTAL,
} from "../constants";
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

/** How often the subject's questions went right first time. */
function firstTryRate(children: TopicSummary[], solved: number): number | null {
  if (solved === 0) return null;
  const correct = children.reduce(
    (total, child) => total + (child.firstTryCorrectRows ?? child.correctRows),
    0,
  );
  return correct / solved;
}

export function SubjectCard({ group, onOpen }: SubjectCardProps) {
  const { stats } = group;
  const touched = stats.solvedRows > 0;
  const coverageTitle = stats.fullyIndexed
    ? undefined
    : PARTIAL_INDEX_TITLE(stats.indexedRows, stats.totalFromSite ?? UNKNOWN_TOTAL);

  return (
    <button
      type="button"
      onClick={() => onOpen(group.key)}
      className={cn(
        "group flex flex-col gap-4 rounded-card border border-line bg-surface p-5 text-left",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:-translate-y-px hover:border-accent/40 hover:shadow-pop",
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
          <span className="text-xs text-muted">{pluralize(group.children.length, "topic")}</span>
        </div>

        <StatusDonut
          stats={stats}
          size={72}
          caption={formatPercent(coverage(stats))}
          label="done"
        />
      </div>

      {/*
        Three figures, not nine. The card used to carry the attempted count, the
        accuracy, a three-part legend of correct / wrong / not attempted, the
        marks and the date, which is the same set the summary above it already
        shows, at a smaller size. What is left is what decides whether to open
        this subject next.
      */}
      <div className="flex flex-wrap gap-x-7 gap-y-3" title={coverageTitle}>
        <Stat value={attemptedText(group)} label="attempted" />
        <Stat
          value={touched ? formatPercent(accuracy(stats)) : NO_VALUE}
          label="accuracy"
          tone={touched ? "accent" : undefined}
        />
        <Stat
          value={formatPercent(firstTryRate(group.children, stats.solvedRows))}
          label="first try"
          title="How often these went right the first time, which is what an exam asks for"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
        <span className="num">
          {stats.marksEarned}
          {stats.totalMarksFromSite === null ? "" : ` / ${stats.totalMarksFromSite}`} marks
        </span>

        {/*
          The pace, where there is any. Sits in the footer rather than beside
          the headline figures because it rests on a handful of questions while
          they rest on all of them, and equal weight would overstate it.
        */}
        {stats.timedQuestions > 0 ? (
          <span className="num" title={AVERAGED_OVER_TITLE(stats.timedQuestions)}>
            {formatDuration(averageTimeMs(stats))} avg
          </span>
        ) : null}

        <span>{touched ? (formatDate(stats.lastActivityAt) ?? "") : NOT_STARTED}</span>
      </div>
    </button>
  );
}
