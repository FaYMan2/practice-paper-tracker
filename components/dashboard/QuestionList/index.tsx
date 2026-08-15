/**
 * The questions inside one topic.
 *
 * The first surface that shows the attempt log rather than a projection of it:
 * how many times a question has been answered, and when it was last touched.
 */

import "./QuestionList.css";

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
import { buildResumeUrl } from "../../../utils/url";
import type { TopicDetail, TopicQuestionRow } from "../../../types";
import {
  LOADING_QUESTIONS_LABEL,
  NOT_INDEXED_LABEL,
  NO_QUESTIONS_LABEL,
} from "../constants";
import { STARRED_TITLE, STAR_GLYPH, STATUS_TEXT } from "./constants";

export * from "./constants";

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
    <li className="question">
      <a
        className="question-ordinal num"
        // Built from the row's own topic, never the one being listed: the
        // ordinal only addresses a page within the topic it was seen in.
        href={buildResumeUrl(row.topicSlug, { ordinal: row.ordinal, goId: row.goId })}
        target="_blank"
        rel="noreferrer"
      >
        Q{row.ordinal}
      </a>
      {row.starred ? (
        <span className="question-star" title={STARRED_TITLE}>
          {STAR_GLYPH}
        </span>
      ) : null}
      <span className={`pill pill-${row.status}`}>{STATUS_TEXT[row.status]}</span>
      <span className="question-meta">{metaText(row, slug, titles)}</span>
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
  if (loading || !detail) return <p className="panel-empty">{LOADING_QUESTIONS_LABEL}</p>;

  const counts = filterCounts(detail.rows);
  const shown = filterQuestions(detail.rows, filter);

  return (
    <div className="panel">
      <div className="filters">
        {FILTER_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            className={`filter${option === filter ? " filter-active" : ""}`}
            aria-pressed={option === filter}
            onClick={() => onFilter(option)}
          >
            {FILTERS[option].label} <span className="num">{counts[option]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="panel-empty">
          {detail.rows.length === 0 ? NOT_INDEXED_LABEL : NO_QUESTIONS_LABEL}
        </p>
      ) : (
        <ul className="questions">
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
