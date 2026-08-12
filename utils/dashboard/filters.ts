/** Narrowing a topic's question list to one status. */

import type { TopicQuestionRow } from "../../types";
import { QuestionFilter } from "./constants";

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
};

export const FILTER_ORDER: QuestionFilter[] = [
  QuestionFilter.All,
  QuestionFilter.Correct,
  QuestionFilter.Wrong,
  QuestionFilter.Unattempted,
];

export function filterQuestions(
  rows: TopicQuestionRow[],
  filter: QuestionFilter,
): TopicQuestionRow[] {
  return rows.filter(FILTERS[filter].matches);
}

/** How many questions each filter would show, for the button labels. */
export function filterCounts(rows: TopicQuestionRow[]): Record<QuestionFilter, number> {
  const counted = FILTER_ORDER.map(
    (filter) => [filter, filterQuestions(rows, filter).length] as const,
  );
  return Object.fromEntries(counted) as Record<QuestionFilter, number>;
}
