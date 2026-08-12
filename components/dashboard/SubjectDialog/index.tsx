/**
 * One subject, opened.
 *
 * A native `<dialog>` rather than a hand-built overlay: Escape, the focus trap
 * and the inertness of the page behind it all come for free, and none of the
 * three is worth reimplementing badly.
 */

import "./SubjectDialog.css";

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
      className="dialog"
      aria-label={group.label}
      onClose={onClose}
      // Clicking the backdrop lands on the dialog element itself, never on the
      // panel inside it.
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
    >
      <div className="dialog-panel">
        <header className="dialog-head">
          <div>
            <h2 className="dialog-title">{group.label}</h2>
            <p className="dialog-sub">
              {pluralize(group.children.length, "topic")} ·{" "}
              {stats.marksEarned}
              {stats.totalMarksFromSite === null ? "" : ` / ${stats.totalMarksFromSite}`} marks
            </p>
          </div>

          <button type="button" className="dialog-close" onClick={() => ref.current?.close()}>
            {CLOSE_LABEL}
          </button>
        </header>

        <section className="dialog-summary">
          <StatusDonut
            stats={stats}
            size={104}
            caption={formatPercent(coverage(stats))}
            label="done"
          />

          <div className="dialog-figures">
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
          <p className="dialog-empty">{NO_TOPICS}</p>
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
