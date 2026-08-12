/** The view model the dashboard renders from. */

import type { TopicSummary } from "../../types";

/**
 * Counts for one topic or one subject, in the same units the site uses.
 *
 * Everything here is a row count rather than a distinct-question count, so it
 * can be compared against the site's own "out of N".
 */
export interface TopicStats {
  solvedRows: number;
  correctRows: number;
  wrongRows: number;
  indexedRows: number;
  marksEarned: number;
  totalFromSite: number | null;
  totalMarksFromSite: number | null;
  /** False when some of the topic's questions have never been seen. */
  fullyIndexed: boolean;
  lastActivityAt: number | null;
}

/** The three states a question can be in, for a chart or a bar. */
export interface StatusCounts {
  correct: number;
  wrong: number;
  left: number;
}

/**
 * A subject and the topics beneath it.
 *
 * `parent` is null for topics the index page lists without a linked heading —
 * the "Only For ISRO CSE" group is a bare `<strong>` — which are collected into
 * one trailing group rather than dropped.
 */
export interface TopicGroup {
  key: string;
  label: string;
  parent: TopicSummary | null;
  children: TopicSummary[];
  stats: TopicStats;
}

export interface DashboardView {
  groups: TopicGroup[];
  /** Slug -> display name for every known topic, for naming borrowed questions. */
  titles: Record<string, string | null>;
  overall: TopicStats;
  topicCount: number;
  /** True before the index page has ever been visited, so nothing is grouped. */
  empty: boolean;
}
