/** Types local to summary computation. */

import type { QuestionStatus } from "../../types";

/** One known placement in a topic, from lazy indexing or a crawl. */
export interface TopicRowInput {
  ordinal: number;
  goId: string;
  marks: number;
  /**
   * True when the row was seen on another topic's page and only attributed
   * here by the site's own labelling. Its `ordinal` belongs to that topic's
   * numbering, so it can be counted but never navigated to.
   */
  borrowed: boolean;
}

export interface SummaryInputs {
  slug: string;
  title: string | null;
  parentSlug: string | null;
  totalFromSite: number | null;
  totalMarksFromSite: number | null;
  lastAnsweredOrdinal: number | null;
  lastVisitedPage: number | null;
  rows: TopicRowInput[];
  /** Latest-attempt status per goId, for the goIds appearing in `rows`. */
  statusByGoId: Map<string, QuestionStatus>;
  lastActivityAt: number | null;
}

/** Where "resume" should send the user next. */
export interface ResumeTarget {
  ordinal: number | null;
  goId: string | null;
}

export interface ResumeTargetInputs {
  firstUnattempted: TopicRowInput | null;
  fullyIndexed: boolean;
  lastAnsweredOrdinal: number | null;
}
