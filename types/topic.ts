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
  lastSeenAt: number;
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
