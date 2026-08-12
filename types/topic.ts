/**
 * Topics and the physical placement of questions inside them.
 */

import type { QuestionType } from "./question";

/**
 * One placement of a question within a topic.
 *
 * A rebuildable cache, not an identity: when a new exam year is added the
 * ordinals within a topic can shift, so this is invalidated via `lastSeenAt`
 * rather than trusted indefinitely. One question can occupy several rows —
 * GateOverflow id 49487 fills three in `stack` alone.
 */
export interface RowRecord {
  topicSlug: string;
  ordinal: number;
  goId: string;
  examSlug: string | null;
  type: QuestionType;
  marks: number;
  /**
   * The other topics this question is filed under, as the site itself labels
   * it beneath the question. A parent page names the child topic, a child page
   * names the parent subject, and a year page names both — which is what lets
   * a topic show progress from questions answered on a page other than its own.
   */
  relatedSlugs: string[];
  lastSeenAt: number;
}

/**
 * One topic's place in the subject hierarchy, as scraped from the index page.
 *
 * `parentSlug` is null both for a subject and for a topic whose group heading
 * carries no link of its own — "Only For ISRO CSE" is a bare `<strong>`, so its
 * children genuinely have no parent topic to belong to.
 */
export interface TopicHierarchyEntry {
  slug: string;
  title: string | null;
  parentSlug: string | null;
}

export interface TopicRecord {
  slug: string;
  title: string | null;
  parentSlug: string | null;
  /** From "out of N Questions". Counts rows, so our numerator must too. */
  totalFromSite: number | null;
  /** From `div.allquestionarea[data-value]`. */
  totalMarksFromSite: number | null;
  lastAnsweredOrdinal: number | null;
  lastVisitedPage: number | null;
  /** Pages whose rows we have harvested, for coverage honesty. */
  indexedPages: number[];
  updatedAt: number;
}
