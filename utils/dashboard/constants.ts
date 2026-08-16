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

/**
 * The three things the dashboard is for.
 *
 * An enum because it is a dispatch key: it picks which panel renders and which
 * tab reads as current, and the two coming apart would show one thing while
 * highlighting another.
 */
export enum DashboardTab {
  Home = "home",
  Review = "review",
  Backups = "backups",
}

/**
 * Which subjects the grid shows.
 *
 * The syllabus is a hundred topics under thirteen subjects, and on any given
 * day most of them have nothing recorded. Rendering all of them puts a wall of
 * identical empty cards between you and the four you are working on, so the
 * default is the ones you have touched — with everything still one click away,
 * because "what have I not started" is a real question, just not the usual one.
 */
export enum SubjectView {
  Started = "started",
  All = "all",
}

/** The group topics fall into when the index page gives them no linked parent. */
export const UNGROUPED_KEY = "(ungrouped)";

export const UNGROUPED_LABEL = "Other topics";

export const OVERALL_LABEL = "Across all subjects";
