/**
 * One subject, opened.
 *
 * A native `<dialog>` rather than a hand-built overlay: Escape, the focus trap
 * and the inertness of the page behind it all come for free, and none of the
 * three is worth reimplementing badly.
 */

import { useEffect, useRef, useState } from "react";
import { QuestionFilter, accuracy, coverage, statusCounts } from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { useTopicDetail } from "../../../services/dashboard";
import { NO_VALUE, formatDate, formatPercent, pluralize } from "../../../utils/format";
import { CLOSE_LABEL, UNKNOWN_TOTAL } from "../constants";
import { Legend } from "../Legend";
import { Stat, StatRow } from "../Stat";
import { StatusDonut } from "../StatusDonut";
import { TopicTable } from "../TopicTable";
import { Button, cn } from "../ui";
import { NO_TOPICS } from "./constants";

export * from "./constants";

export interface SubjectDialogProps {
  group: TopicGroup;
  titles: Record<string, string | null>;
  onClose: () => void;
}

export function SubjectDialog({ group, titles, onClose }: SubjectDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<QuestionFilter>(QuestionFilter.All);
  const { detail, loading } = useTopicDetail(expandedSlug);

  useEffect(() => {
    // `showModal` cannot be expressed as an attribute, so it is called once the
    // element exists. happy-dom and older browsers may not implement it.
    ref.current?.showModal?.();
  }, []);

  const toggle = (slug: string): void => {
    setFilter(QuestionFilter.All);
    setExpandedSlug((current) => (current === slug ? null : slug));
  };

  const { stats } = group;
  const attempted = `${stats.fullyIndexed ? "" : "≥"}${stats.solvedRows} / ${
    stats.totalFromSite ?? UNKNOWN_TOTAL
  }`;

  return (
    <dialog
      ref={ref}
      className={cn(
        "m-auto max-h-[86vh] w-[min(1080px,94vw)] rounded-card border-0 bg-surface p-0 text-ink",
        "shadow-[0_1px_2px_rgba(28,25,23,0.04),0_24px_64px_rgba(28,25,23,0.18)]",
        "backdrop:bg-[rgba(28,25,23,0.42)]",
      )}
      aria-label={group.label}
      onClose={onClose}
      // Clicking the backdrop lands on the dialog element itself, never on the
      // panel inside it.
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <div className="flex max-h-[86vh] flex-col overflow-y-auto p-6 [&>*]:flex-[0_0_auto]">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-bold tracking-tight">{group.label}</h2>
            <p className="mt-1 mb-0 text-xs text-muted">
              {pluralize(group.children.length, "topic")} ·{" "}
              {stats.marksEarned}
              {stats.totalMarksFromSite === null ? "" : ` / ${stats.totalMarksFromSite}`} marks
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => ref.current?.close()}>
            {CLOSE_LABEL}
          </Button>
        </header>

        <section className="mb-5 flex items-center gap-6 rounded-card border border-line bg-raised p-5">
          <StatusDonut
            stats={stats}
            size={104}
            caption={formatPercent(coverage(stats))}
            label="done"
          />

          <div className="flex min-w-0 flex-col gap-3.5">
            <StatRow>
              <Stat value={attempted} label="attempted" />
              <Stat value={`${stats.correctRows}`} label="correct" tone="correct" />
              <Stat value={`${stats.wrongRows}`} label="wrong" tone="wrong" />
              <Stat value={formatPercent(accuracy(stats))} label="accuracy" tone="accent" />
              <Stat value={formatDate(stats.lastActivityAt) ?? NO_VALUE} label="last solved" />
            </StatRow>
            <Legend counts={statusCounts(stats)} />
          </div>
        </section>

        {group.parent === null && group.children.length === 0 ? (
          <p className="m-0 text-sm text-muted italic">{NO_TOPICS}</p>
        ) : (
          <TopicTable
            parent={group.parent}
            topics={group.children}
            titles={titles}
            expandedSlug={expandedSlug}
            detail={detail}
            detailLoading={loading}
            filter={filter}
            onToggle={toggle}
            onFilter={setFilter}
          />
        )}
      </div>
    </dialog>
  );
}
