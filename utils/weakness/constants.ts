/** Thresholds and bands for the weak-area view. */

/**
 * The z-score for a 95% interval.
 *
 * Not a knob to turn. It is here as a name because `1.96` appearing bare in the
 * middle of the Wilson formula reads as a magic number, and the whole point of
 * that formula is that the ranking can be explained.
 */
export const CONFIDENCE_Z = 1.96;

/**
 * Questions answered before a topic can be ranked at all.
 *
 * Wilson already stops a single miss from topping the list, but a topic with
 * one or two answers has nothing to say either way, and a ranked list padded
 * with them buries the ones that do. Those topics are shown separately rather
 * than dropped: "not enough yet" is a useful thing to be told.
 */
export const MIN_EVIDENCE = 3;

/** How many weak areas the list offers at once. */
export const RANKED_SHOWN = 8;

/**
 * A topic is only a weak area if even the *optimistic* reading of it falls
 * below this.
 *
 * Without a ceiling the list is just every topic sorted, and a page headed
 * "where to spend your time" that recommends something you get right nine
 * times out of ten is not advice — it is a leaderboard. 80% is the same line
 * the top colour band draws, so the list and the heatmap agree about what
 * "fine" means.
 */
export const WEAK_CEILING = 0.8;

/**
 * The accuracy bands a cell is grouped into.
 *
 * Four, not a continuous gradient: a gradient invites reading a difference
 * between 61% and 64% that the sample size does not support. Bands say "this
 * group needs work" and stop there.
 *
 * `min` is inclusive, and the list is ordered worst first. Deliberately no
 * colours — this module is domain logic, and Tailwind only scans the dashboard
 * component tree, so a class named here would silently never be generated.
 * The component owns how a band looks; this owns where the lines fall.
 */
export const BANDS = [
  { id: "poor", min: 0, label: "Under 40%" },
  { id: "weak", min: 0.4, label: "40–59%" },
  { id: "fair", min: 0.6, label: "60–79%" },
  { id: "good", min: 0.8, label: "80% and up" },
] as const;

export type BandId = (typeof BANDS)[number]["id"];

export const NO_DATA_LABEL = "Nothing answered";
