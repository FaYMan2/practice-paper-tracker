/**
 * When a question you got wrong is worth seeing again.
 *
 * SM-2, folded over the attempt log rather than stored beside it. The usual
 * implementation keeps easiness, interval and repetition count as mutable
 * per-card fields updated on each review; here they are recomputed from the
 * attempts every time, which costs one pass over a table the dashboard already
 * reads and buys the thing that matters: there is no second copy of the
 * schedule, so nothing can drift from the log, and Phase 6 has nothing extra to
 * export, import or rebuild.
 *
 * Pure — no database, no clock beyond what the caller passes in.
 */

import * as R from "ramda";
import { dayStartOf } from "./grouping";
import type { AttemptRecord, Verdict } from "../../types";
import {
  DAY_MS,
  LEECH_LAPSES,
  ReviewStage,
  FIRST_INTERVAL_DAYS,
  GRADUATION_INTERVAL_DAYS,
  INITIAL_EASINESS,
  LAPSE_INTERVAL_DAYS,
  MIN_EASINESS,
  PASS_QUALITY,
  QUALITY,
  SECOND_INTERVAL_DAYS,
} from "./constants";
import type { ReviewSchedule } from "./types";

export * from "./constants";
export * from "./calendar";
export * from "./grouping";
export type * from "./types";

/** Running state of the fold, before it is turned into a schedule. */
interface Progress {
  easiness: number;
  repetitions: number;
  intervalDays: number;
  lapses: number;
}

const START: Progress = {
  easiness: INITIAL_EASINESS,
  repetitions: 0,
  intervalDays: 0,
  lapses: 0,
};

/**
 * SM-2's easiness adjustment, `EF + (0.1 - (5-q)(0.08 + (5-q)0.02))`.
 *
 * With only two qualities available this is two constants in disguise — a
 * correct answer adds 0.1, a wrong one subtracts 0.32 — but it is written out
 * because the formula is the thing being implemented, and collapsing it to two
 * magic numbers would hide which algorithm this is.
 */
function adjustEasiness(easiness: number, quality: number): number {
  const miss = 5 - quality;
  const next = easiness + (0.1 - miss * (0.08 + miss * 0.02));
  return Math.max(MIN_EASINESS, next);
}

/** How long until this question should be seen again, in days. */
function nextInterval(previous: Progress, repetitions: number): number {
  if (repetitions === 1) return FIRST_INTERVAL_DAYS;
  if (repetitions === 2) return SECOND_INTERVAL_DAYS;
  return Math.round(previous.intervalDays * previous.easiness);
}

function applyAttempt(previous: Progress, verdict: Verdict): Progress {
  const quality = QUALITY[verdict];
  const easiness = adjustEasiness(previous.easiness, quality);

  if (quality < PASS_QUALITY) {
    // A failure sends it back to the start of the rotation. Easiness keeps the
    // penalty, so a question missed repeatedly climbs back more slowly each time.
    const lapsed: Progress = {
      easiness,
      repetitions: 0,
      intervalDays: LAPSE_INTERVAL_DAYS,
      lapses: previous.lapses + 1,
    };
    return lapsed;
  }

  const repetitions = previous.repetitions + 1;
  const passed: Progress = {
    easiness,
    repetitions,
    intervalDays: nextInterval(previous, repetitions),
    lapses: previous.lapses,
  };
  return passed;
}

/**
 * Where a question stands, or null if it does not belong in the rotation.
 *
 * Null for a question never answered, and null for one never answered wrong.
 * That second case is the deliberate one: a question you got right first time
 * is not a question you need reminding of, and scheduling it anyway would bury
 * the ones you are actually missing under everything you already know.
 *
 * `attempts` must be in chronological order — the fold is the algorithm.
 */
export function scheduleFor(goId: string, attempts: AttemptRecord[]): ReviewSchedule | null {
  if (attempts.length === 0) return null;
  if (!attempts.some((attempt) => attempt.verdict === "wrong")) return null;

  const progress = attempts.reduce(
    (state, attempt) => applyAttempt(state, attempt.verdict),
    START,
  );
  const lastReviewedAt = attempts[attempts.length - 1]!.ts;

  const schedule: ReviewSchedule = {
    goId,
    easiness: progress.easiness,
    repetitions: progress.repetitions,
    intervalDays: progress.intervalDays,
    lapses: progress.lapses,
    lastReviewedAt,
    dueAt: lastReviewedAt + progress.intervalDays * DAY_MS,
    graduated: progress.intervalDays >= GRADUATION_INTERVAL_DAYS,
  };
  return schedule;
}

/**
 * Schedules every question in a log at once.
 *
 * Attempts arrive as one flat table, so they are grouped here and each group
 * sorted, rather than making every caller remember that the fold depends on
 * order.
 */
export function scheduleAll(attempts: AttemptRecord[]): ReviewSchedule[] {
  const byGoId = Map.groupBy(attempts, (attempt) => attempt.goId);

  const schedules = [...byGoId].map(([goId, list]) =>
    scheduleFor(goId, R.sortBy(R.prop("ts"), list)),
  );
  return R.filter(R.isNotNil, schedules);
}

/**
 * Whole days a question has been waiting. Zero on the day it comes due.
 *
 * Counted in *calendar* days, not elapsed twenty-four hour periods. Something
 * that came due on Friday morning has been waiting since Friday, and saying
 * "1 day" on Sunday because only 47 hours have passed reads as wrong next to a
 * grid that has it two columns back. `Math.round` because a local day is 23 or
 * 25 hours long across a daylight-saving change.
 */
export function overdueDays(schedule: ReviewSchedule, now: number): number {
  const elapsed = dayStartOf(now) - dayStartOf(schedule.dueAt);
  return Math.max(0, Math.round(elapsed / DAY_MS));
}

export function isDue(schedule: ReviewSchedule, now: number): boolean {
  return !schedule.graduated && schedule.dueAt <= now;
}

/**
 * What a question's history says to do about it, in three states.
 *
 * Takes an object rather than a `ReviewItem` so a caller with only a schedule
 * can ask, and so the fields are **optional**: a background worker built before
 * `repetitions` was carried on the item sends one without it, and a queue that
 * renders every question as struggling is a better failure than one that
 * throws. The same normalise-at-the-boundary rule as `subjectSlug`.
 */
export function stageOf(item: { repetitions?: number; lapses?: number }): ReviewStage {
  // Right at least once since the last miss, so it is on its way out.
  if ((item.repetitions ?? 0) > 0) return ReviewStage.OnTrack;
  return (item.lapses ?? 0) >= LEECH_LAPSES ? ReviewStage.Struggling : ReviewStage.Relearning;
}
