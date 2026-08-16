/** The SM-2 constants, and the two places our data differs from SM-2's. */

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Starting easiness. SM-2's own default, and the value every question begins
 * at the moment it is first missed.
 */
export const INITIAL_EASINESS = 2.5;

/**
 * Easiness never drops below this. Without a floor a question missed a few
 * times in a row collapses to a near-zero interval and reappears forever,
 * which is how a review queue becomes something you stop opening.
 */
export const MIN_EASINESS = 1.3;

/**
 * SM-2 grades a review 0–5 on how well it was recalled. The site grades an
 * answer right or wrong and nothing else, so there are exactly two qualities
 * available and no honest way to invent the ones in between.
 *
 * 5 and 2 rather than 5 and 0: the difference decides how far easiness moves,
 * and 0 punishes a single slip hard enough that one careless arithmetic error
 * keeps a question you understand in circulation for weeks.
 */
export const QUALITY = {
  correct: 5,
  wrong: 2,
} as const;

/** The threshold SM-2 treats as a failed review. Below it, repetitions reset. */
export const PASS_QUALITY = 3;

/**
 * Intervals for the first two successful reviews, in days. Fixed by SM-2
 * rather than derived: easiness has nothing to multiply yet.
 */
export const FIRST_INTERVAL_DAYS = 1;

export const SECOND_INTERVAL_DAYS = 6;

/** Interval after a failure. Back to the start, whatever easiness says. */
export const LAPSE_INTERVAL_DAYS = 1;

/**
 * Once the interval passes this, a question stops being offered.
 *
 * SM-2 has no notion of finishing, because a flashcard deck is forever. A GATE
 * syllabus is not: something you have got right often enough to be due in three
 * months is something you have learned, and keeping it in the queue costs
 * attention that belongs to the questions you are still missing.
 */
export const GRADUATION_INTERVAL_DAYS = 90;

/**
 * How many not-yet-due questions travel with the queue.
 *
 * Enough to answer "is there more coming", not so many that the reply carries
 * the whole rotation to render three lines of it.
 */
export const UPCOMING_LIMIT = 5;

/**
 * How the review list is arranged.
 *
 * An enum because it is a dispatch key: it selects a grouping function from a
 * lookup and round-trips through the control that sets it.
 *
 * The two answer different questions. By day is "what does today look like" —
 * a worklist. By topic is "what am I bad at" — the same questions read as a
 * diagnosis, with each subject's misses gathered under it.
 */
export enum ReviewGrouping {
  Day = "day",
  Topic = "topic",
}

/** Which end of the queue comes first. Longest-waiting is the default. */
export enum ReviewOrder {
  Oldest = "oldest",
  Newest = "newest",
}
