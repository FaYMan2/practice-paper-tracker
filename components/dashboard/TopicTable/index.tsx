/**
 * The topics of one subject, each expandable into its questions.
 *
 * A table, and it has to behave like one. The previous version put six
 * label-value pairs into a single wrapping cell, so "≥42 / 165 attempted · 37
 * correct · 5 wrong · 123 left · 88% accuracy · 19 Aug last solved" ran across
 * two lines and nothing lined up with the row above it. Comparison is the only
 * reason to list topics together, and comparison needs columns.
 *
 * The subject's own page is listed first: it carries every question its topics
 * carry, so it is where a "just give me the next question" resume belongs.
 */

import { accuracy, averageTimeMs, statsOf } from "../../../utils/dashboard";
import type { QuestionFilter } from "../../../utils/dashboard";
import {
  NO_VALUE,
  formatDate,
  formatDuration,
  formatPercent,
  topicDisplayName,
} from "../../../utils/format";
import type { TopicDetail, TopicSummary } from "../../../types";
import {
  COLUMNS,
  NOT_STARTED,
  NOT_TIMED_TITLE,
  PARTIAL_INDEX_TITLE,
  AVERAGED_OVER_TITLE,
  UNKNOWN_TOTAL,
} from "../constants";
import { ProgressBar } from "../ProgressBar";
import { QuestionList } from "../QuestionList";
import { ResumeActions } from "../ResumeActions";
import { Caption, cn } from "../ui";

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

/*
 * One track list, declared once and used by the header and every row.
 *
 * Each row used to declare its own grid, which is fine until a row with no
 * actions sizes a column differently from its neighbours and the bars stop
 * lining up. Sharing the string is what makes the columns columns.
 */
const TRACKS =
  "grid items-center gap-x-4 [grid-template-columns:minmax(0,1.3fr)_minmax(110px,1fr)_66px_76px_80px_100px_minmax(0,190px)]";

function topicName(summary: TopicSummary): string {
  return topicDisplayName(summary.slug, { [summary.slug]: summary.title });
}

/** "12 / 34", or "≥12 / 34" while questions in the topic are undiscovered. */
function attemptedText(summary: TopicSummary): string {
  const prefix = summary.fullyIndexed ? "" : "≥";
  return `${prefix}${summary.solvedRows} / ${summary.totalFromSite ?? UNKNOWN_TOTAL}`;
}

/**
 * Why a count is a floor rather than a total.
 *
 * This used to be the words "partially indexed" in warning amber, repeated on
 * five rows out of seven. The "≥" already says it in the number itself; the
 * sentence moves to the cell's tooltip, and amber goes back to meaning
 * something needs attention.
 */
function coverageTitle(summary: TopicSummary): string | undefined {
  if (summary.fullyIndexed) return undefined;
  return PARTIAL_INDEX_TITLE(summary.indexedRows, summary.totalFromSite ?? UNKNOWN_TOTAL);
}

function Cell({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("num text-right text-xs text-ink", className)} title={title}>
      {children}
    </span>
  );
}

/** First-try accuracy, the figure the weak-areas tab ranks on. */
function firstTryRate(summary: TopicSummary): number | null {
  if (summary.solvedRows === 0) return null;
  return (summary.firstTryCorrectRows ?? summary.correctRows) / summary.solvedRows;
}

interface TopicRowProps {
  summary: TopicSummary;
  whole: boolean;
  expanded: boolean;
  onToggle: (slug: string) => void;
}

function TopicRow({ summary, whole, expanded, onToggle }: TopicRowProps) {
  const stats = statsOf(summary);
  const started = summary.solvedRows > 0;

  return (
    <div
      className={cn(
        TRACKS,
        "px-4 py-2 transition-colors",
        expanded ? "bg-accent-soft" : "hover:bg-raised",
        whole && !expanded && "bg-raised",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex min-w-0 items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[13px]",
          whole ? "font-semibold" : "font-medium",
        )}
        aria-expanded={expanded}
        onClick={() => onToggle(summary.slug)}
      >
        <span className="text-faint transition-transform" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="truncate">
          {whole ? `All of ${topicName(summary)}` : topicName(summary)}
        </span>
      </button>

      <span className="flex items-center gap-2" title={coverageTitle(summary)}>
        <ProgressBar stats={stats} />
        <span className="num shrink-0 text-[11px] text-muted">{attemptedText(summary)}</span>
      </span>

      {started ? (
        <>
          <Cell>{formatPercent(accuracy(stats))}</Cell>
          <Cell className="text-muted">{formatPercent(firstTryRate(summary))}</Cell>
          <Cell
            className="text-muted"
            title={
              stats.timedQuestions > 0
                ? AVERAGED_OVER_TITLE(stats.timedQuestions)
                : NOT_TIMED_TITLE
            }
          >
            {formatDuration(averageTimeMs(stats)) ?? NO_VALUE}
          </Cell>
          <Cell className="text-muted">
            {formatDate(summary.lastActivityAt) ?? NO_VALUE}
          </Cell>
        </>
      ) : (
        /*
         * One word instead of a row of zeros. Four cells reading "0%", "0%",
         * a dash and a dash are harder to skim past than a cell that says the
         * topic has not been started.
         */
        <span className="col-span-4 text-right text-xs text-faint italic">{NOT_STARTED}</span>
      )}

      <span className="flex justify-end">
        <ResumeActions summary={summary} />
      </span>
    </div>
  );
}

export function TopicTable(props: TopicTableProps) {
  const rows: { summary: TopicSummary; whole: boolean }[] = [
    ...(props.parent ? [{ summary: props.parent, whole: true }] : []),
    ...props.topics.map((summary) => ({ summary, whole: false })),
  ];

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {/* Headers make the numbers below them mean something without a legend. */}
      <div className={cn(TRACKS, "border-b border-line-strong bg-raised px-4 py-2")}>
        <Caption>{COLUMNS.topic}</Caption>
        <Caption>{COLUMNS.coverage}</Caption>
        <Caption className="text-right">{COLUMNS.accuracy}</Caption>
        <Caption className="text-right">{COLUMNS.firstTry}</Caption>
        <Caption className="text-right" title={COLUMNS.avgTimeTitle}>
          {COLUMNS.avgTime}
        </Caption>
        <Caption className="text-right">{COLUMNS.lastSolved}</Caption>
        <span className="sr-only">{COLUMNS.actions}</span>
      </div>

      {rows.map(({ summary, whole }) => {
        const expanded = props.expandedSlug === summary.slug;
        return (
          <div className="border-t border-line first:border-t-0" key={summary.slug}>
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
