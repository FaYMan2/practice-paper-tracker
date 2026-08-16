/** Narrowing a topic's question list to one status, and the grid to one view. */

import type { TopicQuestionRow } from "../../types";
import { QuestionFilter, SubjectView } from "./constants";
import type { TopicGroup } from "./types";

interface FilterDefinition {
  label: string;
  matches: (row: TopicQuestionRow) => boolean;
}

/**
 * One entry per filter, so adding a filter cannot leave a button without a
 * predicate or a predicate without a button.
 */
export const FILTERS: Record<QuestionFilter, FilterDefinition> = {
  [QuestionFilter.All]: { label: "All", matches: () => true },
  [QuestionFilter.Correct]: {
    label: "Correct",
    matches: (row) => row.status === "correct",
  },
  [QuestionFilter.Wrong]: { label: "Wrong", matches: (row) => row.status === "wrong" },
  [QuestionFilter.Unattempted]: {
    label: "Unattempted",
    matches: (row) => row.status === "unattempted",
  },
  // Cuts across the other three: a starred question can be in any state, which
  // is the point of starring one.
  [QuestionFilter.Starred]: { label: "Starred", matches: (row) => row.starred },
};

export const FILTER_ORDER: QuestionFilter[] = [
  QuestionFilter.All,
  QuestionFilter.Correct,
  QuestionFilter.Wrong,
  QuestionFilter.Unattempted,
  QuestionFilter.Starred,
];

export function filterQuestions(
  rows: TopicQuestionRow[],
  filter: QuestionFilter,
): TopicQuestionRow[] {
  return rows.filter(FILTERS[filter].matches);
}

/**
 * Whether anything at all is known about a subject.
 *
 * Indexed rows count, not just answers. Opening a topic's page records what is
 * on it, and a subject you have looked at but not yet answered anything in is
 * one you have started — it knows its own size, which is more than the
 * untouched ones do.
 */
export function hasRecords(group: TopicGroup): boolean {
  return group.stats.indexedRows > 0 || group.stats.solvedRows > 0;
}

export function visibleGroups(groups: TopicGroup[], view: SubjectView): TopicGroup[] {
  return view === SubjectView.All ? groups : groups.filter(hasRecords);
}

/** How many questions each filter would show, for the button labels. */
export function filterCounts(rows: TopicQuestionRow[]): Record<QuestionFilter, number> {
  const counted = FILTER_ORDER.map(
    (filter) => [filter, filterQuestions(rows, filter).length] as const,
  );
  return Object.fromEntries(counted) as Record<QuestionFilter, number>;
}
