/** Copy and colour for the weak-area view. */

import type { BandId } from "../../../utils/weakness";

/**
 * How each band looks.
 *
 * Here rather than beside the thresholds because Tailwind is told to scan this
 * directory and nothing else — a utility class written into `utils/` is not
 * generated, and the failure is silent: `bg-wrong/70` on a bar simply renders
 * as no background at all.
 */
export const BAND_STYLE: Record<BandId, { cell: string; bar: string }> = {
  poor: { cell: "bg-wrong text-on-solid", bar: "bg-wrong" },
  weak: { cell: "bg-wrong-soft text-wrong", bar: "bg-wrong/70" },
  fair: { cell: "bg-warn-soft text-warn", bar: "bg-warn" },
  good: { cell: "bg-correct-soft text-correct", bar: "bg-correct" },
};

/** A topic answered, but not enough of to judge. Deliberately colourless. */
export const UNRANKED_CELL = "bg-raised text-muted ring-1 ring-line";

/** A topic with nothing answered in it at all. */
export const NO_DATA_CELL = "bg-raised text-faint";

export const WEAK_TITLE = "Where to spend your time";

export const WEAK_NOTE =
  "Ranked on how often you get a question right the first time, and how much " +
  "evidence there is for saying so. A topic missed once is not a weak area.";

export const HEATMAP_TITLE = "Every topic you’ve worked on";

export const HEATMAP_NOTE =
  "Coloured by first-try accuracy. Hover a topic for its numbers, click to open its subject.";

export const RANKED_HEADING = "Worst first";

/** Region names, so a topic in the ranking is distinguishable from its heatmap cell. */
export const RANKED_REGION = "Weak areas, worst first";

export const HEATMAP_REGION = "Topic heatmap";

export const EARLY_HEADING = "Too early to say";

export const EARLY_NOTE = "Answered, but not enough of yet to rank.";

/** Said when every topic with enough evidence is going well. */
export const NOTHING_WEAK =
  "Nothing stands out. Every topic you’ve answered enough of is going well. " +
  "the ones below need more questions before there’s anything to say.";

export const NOTHING_TITLE = "Nothing to diagnose yet";

export const NOTHING_BODY =
  "Answer a few questions and this becomes a ranked list of what to revise, " +
  "worst first. It needs a handful in a topic before it will say anything. " +
  "one wrong answer is bad luck, not a weakness.";

/** The lead line of a ranked row: "6 of 15 first time". */
export function firstTryText(correct: number, answered: number): string {
  return `${correct} of ${answered} first time`;
}

/**
 * Why a topic sits where it does.
 *
 * The ranking is on the *optimistic* end of the interval, so saying it out loud
 * is what stops the order looking arbitrary: "at best 64%" is the claim being
 * made, and it is a claim about evidence rather than about one bad afternoon.
 */
export function atBestText(high: number): string {
  return `at best ${Math.round(high * 100)}%`;
}
