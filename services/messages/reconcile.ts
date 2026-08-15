/**
 * Repairing a question that was recorded before it had a real identity.
 *
 * A question with no GateOverflow anchor is stored under a synthetic
 * `pp:<topicSlug>:<ordinal>` key so that answering it is never dropped. That
 * key is a placeholder, not an identity: it cannot follow the question into
 * another topic, and if the site later prints the anchor, the placeholder would
 * otherwise shadow the real question for good.
 *
 * So when a real id turns up at a placement we hold provisionally, the history
 * moves across.
 */

import { db, INDEX, type TrackerDB } from "../../utils/db";
import { isProvisionalKey } from "../../utils/url";
import type { AttemptRecord, ObservedRow, QuestionRecord } from "../../types";

/** The attempt's identity within the log, which is derived from its question. */
function rekeyAttempt(attempt: AttemptRecord, goId: string): AttemptRecord {
  const moved: AttemptRecord = {
    ...attempt,
    goId,
    eventId: `${goId}:${attempt.pageLoadId}`,
    provisional: false,
  };
  return moved;
}

/**
 * Folds the provisional question's projection into the real one.
 *
 * Both may already exist — the same question can have been answered under its
 * real id in another topic — so the counts are summed and the ends of the two
 * histories taken, rather than one simply overwriting the other.
 */
function mergeQuestions(
  real: QuestionRecord | undefined,
  provisional: QuestionRecord,
  goId: string,
): QuestionRecord {
  if (!real) {
    const promoted: QuestionRecord = { ...provisional, goId };
    return promoted;
  }

  const merged: QuestionRecord = {
    ...real,
    starred: real.starred || provisional.starred,
    firstSeenAt: Math.min(real.firstSeenAt, provisional.firstSeenAt),
    attemptCount: real.attemptCount + provisional.attemptCount,
    lastAttemptAt: Math.max(real.lastAttemptAt ?? 0, provisional.lastAttemptAt ?? 0) || null,
    status: (real.lastAttemptAt ?? 0) >= (provisional.lastAttemptAt ?? 0)
      ? real.status
      : provisional.status,
    firstVerdict: real.firstVerdict ?? provisional.firstVerdict,
  };
  return merged;
}

/**
 * Moves everything held under `from` onto `to`.
 *
 * Idempotent: the attempt log's unique `eventId` means an attempt already moved
 * is recognised and dropped rather than duplicated, so running this twice
 * leaves the same history as running it once.
 */
async function absorb(database: TrackerDB, from: string, to: string): Promise<void> {
  const attempts = await database.attempts.where(INDEX.attemptGoId).equals(from).toArray();
  const existing = new Set(
    (await database.attempts.where(INDEX.attemptGoId).equals(to).toArray()).map(
      (attempt) => attempt.eventId,
    ),
  );

  const moved = attempts
    .map((attempt) => rekeyAttempt(attempt, to))
    .filter((attempt) => !existing.has(attempt.eventId));

  await database.attempts.bulkDelete(
    attempts.map((attempt) => attempt.id).filter((id): id is number => id !== undefined),
  );
  await database.attempts.bulkAdd(moved.map(({ id: _id, ...rest }) => rest as AttemptRecord));

  const provisional = await database.questions.get(from);
  if (provisional) {
    const real = await database.questions.get(to);
    await database.questions.put(mergeQuestions(real, provisional, to));
    await database.questions.delete(from);
  }

  // Rows are a rebuildable cache, but leaving one pointing at a key with no
  // question behind it would strand it as permanently unattempted.
  const rows = await database.rows.where(INDEX.rowGoId).equals(from).toArray();
  await database.rows.bulkPut(rows.map((row) => ({ ...row, goId: to })));
}

/**
 * Reconciles every placement on a page whose stored key is provisional but
 * whose markup now carries a real GateOverflow id.
 *
 * Returns the ids repaired, so indexing can report it.
 */
export async function reconcileProvisional(
  topicSlug: string,
  rows: ObservedRow[],
  database: TrackerDB = db(),
): Promise<string[]> {
  const real = rows.filter((row) => !isProvisionalKey(row.goId));
  if (real.length === 0) return [];

  const stored = await database.rows.bulkGet(real.map((row) => [topicSlug, row.ordinal]));

  const repairs = real
    .map((row, index) => ({ row, previous: stored[index] }))
    .filter(({ row, previous }) => {
      if (!previous || previous.goId === row.goId) return false;
      return isProvisionalKey(previous.goId);
    });

  await Promise.all(
    repairs.map(({ row, previous }) => absorb(database, previous!.goId, row.goId)),
  );

  return repairs.map(({ previous }) => previous!.goId);
}
