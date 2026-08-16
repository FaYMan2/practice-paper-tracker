/** Rebuilding everything derived from the attempt log. */

import { db, driftedProjections, rebuildQuestionProjections } from "../../utils/db";
import type { TrackerDB } from "../../utils/db";
import { refreshAllSummaries } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap } from "../../types";

/**
 * Recomputes the question projections and every topic summary from `attempts`.
 * Used after an import, or when the mirror is suspected of drifting.
 */
export async function rebuildAll(): Promise<ResponseMap[MessageKind.RebuildAll]> {
  const rebuilt: ResponseMap[MessageKind.RebuildAll] = {
    questions: await rebuildQuestionProjections(),
    topics: await refreshAllSummaries(),
  };
  return rebuilt;
}

/**
 * Puts right any question whose cached state has fallen out of step with the
 * log, and reports how many there were.
 *
 * Run on every dashboard load. It is cheap — the same two tables the dashboard
 * is about to read anyway — and it is the difference between a promise and a
 * checked one: `questions` is a cache, and a cache nobody verifies is a place
 * where a lost solve can sit unnoticed for months. The count is returned rather
 * than swallowed because a silent self-heal would hide the fact that something
 * went wrong at all.
 */
export async function repairDrift(database: TrackerDB = db()): Promise<number> {
  const drifted = await driftedProjections(database);
  if (drifted.length === 0) return 0;

  console.warn("[pptr] repairing question projections", drifted.length);
  await database.questions.bulkPut(drifted);
  return drifted.length;
}
