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
  lastAnsweredOrdinal: number | null;
  lastVisitedPage: number | null;
  /** Lowest-ordinal indexed row with no attempt — the resume target. */
  firstUnattemptedOrdinal: number | null;
  firstUnattemptedGoId: string | null;
  lastActivityAt: number | null;
}
