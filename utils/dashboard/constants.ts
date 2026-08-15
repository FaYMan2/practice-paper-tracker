/** Literals and dispatch keys for the dashboard. */

/**
 * Which questions the drill-down lists.
 *
 * An enum rather than loose strings because it is a dispatch key: it selects a
 * predicate from a lookup table and round-trips through a `data-` attribute on
 * the filter buttons, and a typo in either would silently list nothing.
 */
export enum QuestionFilter {
  All = "all",
  Correct = "correct",
  Wrong = "wrong",
  Unattempted = "unattempted",
  Starred = "starred",
}

/** The group topics fall into when the index page gives them no linked parent. */
export const UNGROUPED_KEY = "(ungrouped)";

export const UNGROUPED_LABEL = "Other topics";

export const OVERALL_LABEL = "Across all subjects";
