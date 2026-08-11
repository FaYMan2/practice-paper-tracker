/**
 * Denormalised per-topic counts mirrored into `chrome.storage.local`.
 *
 * The content script can read `storage.local` without waking the service
 * worker, so resume buttons and badges paint immediately on page load.
 * IndexedDB remains the source of truth and wins on any disagreement.
 */

export interface TopicSummary {
  slug: string;
  title: string | null;
  /** Rows whose question is solved — the same unit as `totalFromSite`. */
  solvedRows: number;
  correctRows: number;
  wrongRows: number;
  /** Distinct solved questions; the honest floor when indexing is partial. */
  distinctSolved: number;
  totalFromSite: number | null;
  indexedRows: number;
  /** False when `indexedRows < totalFromSite`, so the UI can say "at least". */
  fullyIndexed: boolean;
  marksEarned: number;
  totalMarksFromSite: number | null;
  /** Highest-ordinal question answered in this topic — the resume target. */
  lastAnsweredOrdinal: number | null;
  lastAnsweredGoId: string | null;
  lastVisitedPage: number | null;
  /**
   * Lowest-ordinal indexed row with no attempt. Not the resume target: it
   * drags you backwards to questions you deliberately skipped. Kept for the
   * dashboard, which can offer it separately as "next unanswered".
   */
  firstUnattemptedOrdinal: number | null;
  firstUnattemptedGoId: string | null;
  lastActivityAt: number | null;
}
