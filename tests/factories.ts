/** Shared test data for the dashboard suites. */

import { buildView } from "../utils/dashboard";
import type { DashboardView } from "../utils/dashboard";
import type { TopicQuestionRow, TopicSummary } from "../types";

export function summary(slug: string, overrides: Partial<TopicSummary> = {}): TopicSummary {
  const base: TopicSummary = {
    slug,
    title: null,
    parentSlug: null,
    solvedRows: 0,
    correctRows: 0,
    wrongRows: 0,
    distinctSolved: 0,
    totalFromSite: null,
    indexedRows: 0,
    fullyIndexed: false,
    marksEarned: 0,
    totalMarksFromSite: null,
    lastAnsweredOrdinal: null,
    lastAnsweredGoId: null,
    lastVisitedPage: null,
    firstUnattemptedOrdinal: null,
    firstUnattemptedGoId: null,
    lastActivityAt: null,
  };
  return { ...base, ...overrides };
}

export function question(
  ordinal: number,
  overrides: Partial<TopicQuestionRow> = {},
): TopicQuestionRow {
  const base: TopicQuestionRow = {
    ordinal,
    topicSlug: "stack",
    goId: `${ordinal}`,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 1,
    status: "unattempted",
    attemptCount: 0,
    lastAttemptAt: null,
    firstVerdict: null,
    provisional: false,
  };
  return { ...base, ...overrides };
}

/** A fully indexed subject, part-way through. */
export const SUBJECT: TopicSummary = summary("data-structure", {
  title: "Data Structure",
  solvedRows: 40,
  correctRows: 30,
  wrongRows: 10,
  totalFromSite: 298,
  indexedRows: 298,
  fullyIndexed: true,
  marksEarned: 44,
  totalMarksFromSite: 366,
  lastAnsweredOrdinal: 271,
  lastAnsweredGoId: "523106",
  firstUnattemptedOrdinal: 41,
  firstUnattemptedGoId: "1035",
  lastActivityAt: Date.UTC(2026, 7, 11),
});

/** A topic of that subject, only partly indexed. */
export const CHILD: TopicSummary = summary("stack", {
  title: "Stack",
  parentSlug: "data-structure",
  solvedRows: 12,
  correctRows: 9,
  wrongRows: 3,
  totalFromSite: 34,
  indexedRows: 20,
  marksEarned: 11,
});

export function bySlug(summaries: TopicSummary[]): Record<string, TopicSummary> {
  return Object.fromEntries(summaries.map((entry) => [entry.slug, entry]));
}

export function viewOf(summaries: TopicSummary[]): DashboardView {
  return buildView(bySlug(summaries));
}
