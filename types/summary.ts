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
  /** The subject this topic sits under, once the index page has been scraped. */
  parentSlug: string | null;
  /** Rows whose question is solved — the same unit as `totalFromSite`. */
  solvedRows: number;
  correctRows: number;
  wrongRows: number;
  /**
   * Rows whose question was right the *first* time it was answered.
   *
   * `correctRows` counts the latest verdict, which is the right measure of
   * "how much have I covered" and the wrong one for "what am I weak at": a
   * question missed and later put right counts as correct there, hiding the
   * miss. The gap between the two is the interesting number — topics you get
   * to eventually but rarely first time are what costs marks in an exam hall.
   */
  firstTryCorrectRows: number;
  /**
   * Distinct questions here that have ever been timed, and the total of those
   * timings.
   *
   * Counted per *question* rather than per row, unlike everything around it:
   * one question can sit in three rows of a topic, and it took as long as it
   * took once. Rows are the right unit for "how much of this topic is done"
   * and the wrong one for "how long these take".
   *
   * A sum rather than a stored average, because a subject's figure has to be
   * the total of its topics' and averages do not add up.
   */
  timedQuestions: number;
  timedTotalMs: number;
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
