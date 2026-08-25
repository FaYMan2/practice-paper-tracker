/** Types local to summary computation. */

import type { QuestionStatus, Verdict } from "../../types";

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
  /**
   * Verdict of each question's *earliest* attempt. Null, or absent, for one
   * never answered — which is why the two maps are separate rather than one
   * richer record: they have different domains.
   */
  firstVerdictByGoId: Map<string, Verdict | null>;
  /** How long each question's last timed attempt took, where one was timed. */
  durationByGoId: Map<string, number | null>;
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
