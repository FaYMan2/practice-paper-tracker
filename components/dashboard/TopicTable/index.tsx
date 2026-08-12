/**
 * The topics of one subject, each expandable into its questions.
 *
 * The subject's own page is listed first: it carries every question its topics
 * carry, so it is where a "just give me the next question" resume belongs.
 */

import "./TopicTable.css";

import { accuracy, statsOf, unattemptedRows } from "../../../utils/dashboard";
import type { QuestionFilter } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent, topicDisplayName } from "../../../utils/format";
import type { TopicDetail, TopicSummary } from "../../../types";
import { NOT_STARTED, PARTIAL_INDEX_NOTE, UNKNOWN_TOTAL } from "../constants";
import { ProgressBar } from "../ProgressBar";
import { QuestionList } from "../QuestionList";
import { ResumeActions } from "../ResumeActions";

export interface TopicTableProps {
  /** The subject itself, when it has a page of its own. */
  parent: TopicSummary | null;
  topics: TopicSummary[];
  /** Slug -> display name, for naming a question borrowed from another topic. */
  titles: Record<string, string | null>;
  expandedSlug: string | null;
  detail: TopicDetail | null;
  detailLoading: boolean;
  filter: QuestionFilter;
  onToggle: (slug: string) => void;
  onFilter: (filter: QuestionFilter) => void;
}

function topicName(summary: TopicSummary): string {
  return topicDisplayName(summary.slug, { [summary.slug]: summary.title });
}

/** "12 / 34", or "≥12 / 34" while questions in the topic are undiscovered. */
function attemptedText(summary: TopicSummary): string {
  const prefix = summary.fullyIndexed ? "" : "≥";
  return `${prefix}${summary.solvedRows} / ${summary.totalFromSite ?? UNKNOWN_TOTAL}`;
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <span className="row-figure">
      <b className="num">{value}</b> {label}
    </span>
  );
}

function PartialNote({ summary }: { summary: TopicSummary }) {
  if (summary.fullyIndexed) return null;

  return (
    <span
      className="row-note"
      title={
        `${summary.indexedRows} of ${summary.totalFromSite ?? UNKNOWN_TOTAL} questions ` +
        "have been seen, so these counts are a floor rather than a total."
      }
    >
      {PARTIAL_INDEX_NOTE}
    </span>
  );
}

/**
 * An untouched topic gets a word rather than a row of zeros: six figures all
 * reading nothing is harder to skim past than one that says so.
 */
function RowFigures({ summary }: { summary: TopicSummary }) {
  const stats = statsOf(summary);

  if (summary.solvedRows === 0) {
    return (
      <div className="row-figures">
        <Figure value={attemptedText(summary)} label="attempted" />
        <span className="row-quiet">{NOT_STARTED}</span>
        <PartialNote summary={summary} />
      </div>
    );
  }

  return (
    <div className="row-figures">
      <Figure value={attemptedText(summary)} label="attempted" />
      <Figure value={`${summary.correctRows}`} label="correct" />
      <Figure value={`${summary.wrongRows}`} label="wrong" />
      <Figure value={`${unattemptedRows(stats)}`} label="left" />
      <Figure value={formatPercent(accuracy(stats))} label="accuracy" />
      <Figure value={formatDate(summary.lastActivityAt) ?? NO_VALUE} label="last solved" />
      <PartialNote summary={summary} />
    </div>
  );
}

interface TopicRowProps {
  summary: TopicSummary;
  whole: boolean;
  expanded: boolean;
  onToggle: (slug: string) => void;
}

function TopicRow({ summary, whole, expanded, onToggle }: TopicRowProps) {
  const stats = statsOf(summary);

  return (
    <div className={`row${whole ? " row-whole" : ""}${expanded ? " row-open" : ""}`}>
      <button
        type="button"
        className="row-name"
        aria-expanded={expanded}
        onClick={() => onToggle(summary.slug)}
      >
        <span className="row-caret" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
        {whole ? `All of ${topicName(summary)}` : topicName(summary)}
      </button>

      <ProgressBar stats={stats} />

      <RowFigures summary={summary} />

      <ResumeActions summary={summary} />
    </div>
  );
}

export function TopicTable(props: TopicTableProps) {
  const rows: { summary: TopicSummary; whole: boolean }[] = [
    ...(props.parent ? [{ summary: props.parent, whole: true }] : []),
    ...props.topics.map((summary) => ({ summary, whole: false })),
  ];

  return (
    <div className="table">
      {rows.map(({ summary, whole }) => {
        const expanded = props.expandedSlug === summary.slug;
        return (
          <div className="table-entry" key={summary.slug}>
            <TopicRow
              summary={summary}
              whole={whole}
              expanded={expanded}
              onToggle={props.onToggle}
            />
            {expanded ? (
              <QuestionList
                slug={summary.slug}
                titles={props.titles}
                detail={props.detail}
                loading={props.detailLoading}
                filter={props.filter}
                onFilter={props.onFilter}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
