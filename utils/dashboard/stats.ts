/** Aggregating topic summaries into the numbers the dashboard shows. */

import * as R from "ramda";
import type { TopicSummary } from "../../types";
import type { StatusCounts, TopicStats } from "./types";

export function statsOf(summary: TopicSummary): TopicStats {
  const stats: TopicStats = {
    solvedRows: summary.solvedRows,
    correctRows: summary.correctRows,
    wrongRows: summary.wrongRows,
    indexedRows: summary.indexedRows,
    marksEarned: summary.marksEarned,
    totalFromSite: summary.totalFromSite,
    totalMarksFromSite: summary.totalMarksFromSite,
    fullyIndexed: summary.fullyIndexed,
    lastActivityAt: summary.lastActivityAt,
  };
  return stats;
}

export const EMPTY_STATS: TopicStats = {
  solvedRows: 0,
  correctRows: 0,
  wrongRows: 0,
  indexedRows: 0,
  marksEarned: 0,
  totalFromSite: null,
  totalMarksFromSite: null,
  fullyIndexed: false,
  lastActivityAt: null,
};

/** Sums a nullable field, staying null only when every input is null. */
function sumNullable(values: (number | null)[]): number | null {
  const known = R.filter(R.isNotNil, values);
  return known.length === 0 ? null : R.sum(known);
}

function latest(values: (number | null)[]): number | null {
  const known = R.filter(R.isNotNil, values);
  return known.length === 0 ? null : Math.max(...known);
}

/**
 * Adds up disjoint topics.
 *
 * Only ever applied across subjects, never to a subject and its own children:
 * `/gate-cse/data-structure` serves every question its children serve, so
 * adding the two together would count each of them twice.
 */
export function sumStats(parts: TopicStats[]): TopicStats {
  if (parts.length === 0) return EMPTY_STATS;

  const total: TopicStats = {
    solvedRows: R.sum(R.pluck("solvedRows", parts)),
    correctRows: R.sum(R.pluck("correctRows", parts)),
    wrongRows: R.sum(R.pluck("wrongRows", parts)),
    indexedRows: R.sum(R.pluck("indexedRows", parts)),
    marksEarned: R.sum(R.pluck("marksEarned", parts)),
    totalFromSite: sumNullable(parts.map((part) => part.totalFromSite)),
    totalMarksFromSite: sumNullable(parts.map((part) => part.totalMarksFromSite)),
    fullyIndexed: parts.every((part) => part.fullyIndexed),
    lastActivityAt: latest(parts.map((part) => part.lastActivityAt)),
  };
  return total;
}

/**
 * Questions in the topic with nothing recorded against them.
 *
 * Falls back to the indexed row count when the site's total is unknown, which
 * makes this a floor rather than a total — `fullyIndexed` says which it is.
 */
export function unattemptedRows(stats: TopicStats): number {
  const total = stats.totalFromSite ?? stats.indexedRows;
  return Math.max(0, total - stats.solvedRows);
}

/** Share of attempted questions answered correctly. Null with nothing attempted. */
export function accuracy(stats: TopicStats): number | null {
  return stats.solvedRows === 0 ? null : stats.correctRows / stats.solvedRows;
}

/** The three-way split a chart or a bar draws. */
export function statusCounts(stats: TopicStats): StatusCounts {
  const counts: StatusCounts = {
    correct: stats.correctRows,
    wrong: stats.wrongRows,
    left: unattemptedRows(stats),
  };
  return counts;
}

/** How much of the topic has been answered at all, 0–1. */
export function coverage(stats: TopicStats): number {
  const total = stats.correctRows + stats.wrongRows + unattemptedRows(stats);
  return total === 0 ? 0 : stats.solvedRows / total;
}
