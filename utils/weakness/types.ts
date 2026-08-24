/** What the weak-area view renders from. */

/** A proportion and how much it can be trusted. */
export interface Interval {
  /** The observed fraction itself, 0–1. */
  rate: number;
  /** Wilson bounds at 95%. Wide when there is little evidence. */
  low: number;
  high: number;
}

/**
 * One topic, judged.
 *
 * Both proportions are over the same denominator — rows answered — so the gap
 * between them is readable: `accuracy` is where the topic stands now, and
 * `firstTry` is how often it went right without a second go.
 */
export interface WeakArea {
  slug: string;
  label: string;
  /** The subject it sits under, for grouping and for naming it in a list. */
  subjectSlug: string | null;
  subjectLabel: string | null;
  answered: number;
  accuracy: Interval;
  firstTry: Interval;
  /** False when too little has been answered to place it in the ranking. */
  ranked: boolean;
}

/** A subject and its topics, as one row of the heatmap. */
export interface WeakSubject {
  key: string;
  label: string;
  answered: number;
  /** The subject's own figure, across every topic beneath it. */
  firstTry: Interval | null;
  topics: WeakArea[];
}
