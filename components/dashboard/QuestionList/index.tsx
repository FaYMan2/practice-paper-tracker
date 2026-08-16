/**
 * The questions inside one topic.
 *
 * The first surface that shows the attempt log rather than a projection of it:
 * how many times a question has been answered, and when it was last touched.
 */

import {
  FILTERS,
  FILTER_ORDER,
  QuestionFilter,
  filterCounts,
  filterQuestions,
} from "../../../utils/dashboard";
import {
  NO_VALUE,
  examDisplayName,
  formatDate,
  pluralize,
  topicDisplayName,
} from "../../../utils/format";
import { Star } from "lucide-react";
import { buildResumeUrl } from "../../../utils/url";
import type { TopicDetail, TopicQuestionRow } from "../../../types";
import {
  LOADING_QUESTIONS_LABEL,
  NOT_INDEXED_LABEL,
  NO_QUESTIONS_LABEL,
} from "../constants";
import { Badge, cn } from "../ui";
import { STARRED_TITLE, STATUS_TEXT } from "./constants";

export * from "./constants";

/** The verdict a question carries, as a badge tone. */
const STATUS_TONE = {
  correct: "correct",
  wrong: "wrong",
  unattempted: "neutral",
} as const;

export interface QuestionListProps {
  slug: string;
  /** Slug -> display title, for naming the topic a borrowed question sits in. */
  titles: Record<string, string | null>;
  /** Null while the round trip to the background is still in flight. */
  detail: TopicDetail | null;
  loading: boolean;
  filter: QuestionFilter;
  onFilter: (filter: QuestionFilter) => void;
}

/** "GATE CSE 2024 Set 1 · MSQ · 2 marks · 2 attempts, last 11 Aug 2026". */
function metaText(row: TopicQuestionRow, slug: string, titles: Record<string, string | null>): string {
  const attempts =
    row.attemptCount === 0
      ? "never attempted"
      : `${pluralize(row.attemptCount, "attempt")}, last ${formatDate(row.lastAttemptAt) ?? NO_VALUE}`;

  // A borrowed question is numbered by the topic it was seen under, so saying
  // where it came from is what makes "Q44" mean anything.
  const via =
    row.topicSlug === slug ? [] : [`via ${topicDisplayName(row.topicSlug, titles)}`];

  return [
    row.examSlug ? examDisplayName(row.examSlug) : NO_VALUE,
    row.type,
    pluralize(row.marks, "mark"),
    attempts,
    ...via,
  ].join(" · ");
}

function Question({
  slug,
  row,
  titles,
}: {
  slug: string;
  row: TopicQuestionRow;
  titles: Record<string, string | null>;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-t border-line px-4 py-2 first:border-t-0">
      <a
        className="num font-semibold text-accent no-underline hover:underline"
        // Built from the row's own topic, never the one being listed: the
        // ordinal only addresses a page within the topic it was seen in.
        href={buildResumeUrl(row.topicSlug, { ordinal: row.ordinal, goId: row.goId })}
        target="_blank"
        rel="noreferrer"
      >
        Q{row.ordinal}
      </a>
      {row.starred ? (
        <Star className="size-3.5 self-center fill-accent text-accent" aria-label={STARRED_TITLE} />
      ) : null}
      <Badge tone={STATUS_TONE[row.status]}>{STATUS_TEXT[row.status]}</Badge>
      <span className="text-xs text-muted">{metaText(row, slug, titles)}</span>
    </li>
  );
}

export function QuestionList({
  slug,
  titles,
  detail,
  loading,
  filter,
  onFilter,
}: QuestionListProps) {
  if (loading || !detail) {
    return <p className="m-0 px-4 py-3 text-xs text-muted italic">{LOADING_QUESTIONS_LABEL}</p>;
  }

  const counts = filterCounts(detail.rows);
  const shown = filterQuestions(detail.rows, filter);

  return (
    <div className="border-t border-line bg-raised">
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
        {FILTER_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              option === filter
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-muted hover:text-ink",
            )}
            aria-pressed={option === filter}
            onClick={() => onFilter(option)}
          >
            {FILTERS[option].label} <span className="num">{counts[option]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="m-0 px-4 py-3 text-xs text-muted italic">
          {detail.rows.length === 0 ? NOT_INDEXED_LABEL : NO_QUESTIONS_LABEL}
        </p>
      ) : (
        <ul className="m-0 max-h-none list-none bg-surface p-0">
          {shown.map((row) => (
            <Question
              key={`${row.topicSlug}:${row.ordinal}`}
              slug={slug}
              row={row}
              titles={titles}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
