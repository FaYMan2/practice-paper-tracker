/**
 * Which topics are actually weak, as opposed to unlucky.
 *
 * Sorting by accuracy is the obvious thing and it is wrong: it puts "0%, one
 * question" above "45% across thirty", which is exactly backwards as advice.
 * The first is noise; the second is a topic to spend a Saturday on.
 *
 * So the ranking uses the **upper** bound of the Wilson score interval — the
 * most generous reading of the evidence — and sorts ascending. A topic ranks as
 * weak only when even the optimistic reading is poor, which is a claim that
 * needs evidence to make. One miss out of one leaves an upper bound near 0.79
 * and sinks down the list where it belongs; five out of five puts it at 0.43
 * and near the top.
 *
 * Pure. Everything here reads the mirrored summaries the dashboard already has.
 */

import * as R from "ramda";
import { topicDisplayName } from "../format";
import { CONFIDENCE_Z, MIN_EVIDENCE, RANKED_SHOWN, WEAK_CEILING } from "./constants";
import type { Interval, WeakArea, WeakSubject } from "./types";
import type { TopicGroup } from "../dashboard";
import type { TopicSummary } from "../../types";

export * from "./constants";
export type * from "./types";

/**
 * The Wilson score interval for `successes` out of `total`.
 *
 * The normal approximation everyone reaches for first — p̂ ± z·√(p̂(1-p̂)/n) —
 * collapses to a zero-width interval at 0/5 and 5/5, claiming certainty exactly
 * where a small sample has none. Wilson does not: it pulls the centre towards
 * a half in proportion to how little evidence there is, which is the behaviour
 * this whole view depends on.
 */
export function wilsonBounds(successes: number, total: number): Interval {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) {
    const unknown: Interval = { rate: 0, low: 0, high: 1 };
    return unknown;
  }

  const rate = successes / total;
  const z2 = CONFIDENCE_Z * CONFIDENCE_Z;
  const denominator = total + z2;
  const centre = (successes + z2 / 2) / denominator;
  const spread =
    (CONFIDENCE_Z / denominator) *
    Math.sqrt((successes * (total - successes)) / total + z2 / 4);

  const interval: Interval = {
    rate,
    low: Math.max(0, centre - spread),
    high: Math.min(1, centre + spread),
  };
  return interval;
}

/**
 * How many of a topic's questions went right first time.
 *
 * Falls back to the current-status count where the field is absent, which
 * happens while a page is newer than the background worker answering it — the
 * state every extension reload passes through. Zero would be the lazy default
 * and it is the harmful one: it paints every topic as catastrophic and puts
 * the whole syllabus at the top of a list headed "where to spend your time".
 * The old reading is merely optimistic, and it corrects itself on the next
 * load from a current worker.
 */
function firstTryCorrect(summary: TopicSummary): number {
  return summary.firstTryCorrectRows ?? summary.correctRows;
}

function toWeakArea(
  summary: TopicSummary,
  subject: TopicSummary | null,
  titles: Record<string, string | null>,
): WeakArea {
  const answered = summary.solvedRows;

  const area: WeakArea = {
    slug: summary.slug,
    label: topicDisplayName(summary.slug, titles),
    subjectSlug: subject?.slug ?? null,
    subjectLabel: subject === null ? null : topicDisplayName(subject.slug, titles),
    answered,
    accuracy: wilsonBounds(summary.correctRows, answered),
    firstTry: wilsonBounds(firstTryCorrect(summary), answered),
    ranked: answered >= MIN_EVIDENCE,
  };
  return area;
}

/**
 * The heatmap: every subject, with the topics beneath it.
 *
 * A subject's own figure is summed from its topics rather than read from its
 * own summary row, so the row header and the cells beside it cannot disagree.
 */
export function weakSubjects(
  groups: TopicGroup[],
  titles: Record<string, string | null>,
): WeakSubject[] {
  return groups.map((group) => {
    const topics = group.children.map((child) => toWeakArea(child, group.parent, titles));
    const answered = R.sum(R.pluck("answered", topics));
    const correct = R.sum(group.children.map(firstTryCorrect));

    const subject: WeakSubject = {
      key: group.key,
      label: group.label,
      answered,
      firstTry: answered === 0 ? null : wilsonBounds(correct, answered),
      topics,
    };
    return subject;
  });
}

/**
 * Weak areas, worst first.
 *
 * Ranked on first-try accuracy rather than current status: a question you
 * missed and later put right counts as correct in the latter, which is the
 * right measure of coverage and hides the very thing this list is for.
 *
 * Ties break on evidence, so of two equally poor topics the better-established
 * one is offered first — there is more to gain from working on the one you are
 * more certain about.
 */
export function rankWeakAreas(subjects: WeakSubject[], limit = RANKED_SHOWN): WeakArea[] {
  const ranked = subjects
    .flatMap((subject) => subject.topics)
    // The ceiling is what keeps this a list of weak areas rather than a
    // leaderboard: a topic nobody could call weak has no business on it.
    .filter((topic) => topic.ranked && topic.answered > 0 && topic.firstTry.high < WEAK_CEILING);

  const worstFirst = R.sortWith<WeakArea>([
    R.ascend((topic) => topic.firstTry.high),
    R.descend((topic) => topic.answered),
  ]);

  return worstFirst(ranked).slice(0, limit);
}

/** Topics worked on, but not yet enough of to say anything about. */
export function tooEarlyToSay(subjects: WeakSubject[]): WeakArea[] {
  return subjects
    .flatMap((subject) => subject.topics)
    .filter((topic) => topic.answered > 0 && !topic.ranked);
}
