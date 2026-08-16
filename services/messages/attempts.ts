/** Recording an answer. */

import { db, INDEX, relatedSlugsOf, type TrackerDB } from "../../utils/db";
import { refreshSummariesFor } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { AttemptInput, QuestionRecord, ResponseMap } from "../../types";
import { upsertTopic, withParents } from "./topics";

function projectAttempt(
  attempt: AttemptInput,
  previous: QuestionRecord | undefined,
): QuestionRecord {
  const projected: QuestionRecord = {
    goId: attempt.goId,
    status: attempt.verdict,
    // User curation, not a projection — never recompute it.
    starred: previous?.starred ?? false,
    type: attempt.type,
    marks: attempt.marks,
    firstSeenAt: previous?.firstSeenAt ?? attempt.ts,
    lastAttemptAt: attempt.ts,
    attemptCount: (previous?.attemptCount ?? 0) + 1,
    firstVerdict: previous?.firstVerdict ?? attempt.verdict,
  };
  return projected;
}

function isConstraintError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  return name === "ConstraintError" || /constraint/i.test(String(error));
}

/**
 * Every topic whose figures this answer changes.
 *
 * One question sits in more than one place: the topic whose page it was
 * answered on, any other topic listing the same question, the child topic the
 * site files it under, and the subject each of those sits beneath. Refreshing
 * only the page's own topic is what left the others reading zero until
 * something rebuilt everything.
 */
async function topicsAffectedBy(
  attempt: AttemptInput,
  database: TrackerDB,
): Promise<string[]> {
  const rows = await database.rows.where(INDEX.rowGoId).equals(attempt.goId).toArray();
  const direct = [
    attempt.topicSlug,
    ...rows.flatMap((row) => [row.topicSlug, ...relatedSlugsOf(row)]),
  ];
  return await withParents(database, direct);
}

/**
 * Appends an attempt. Never updates an existing one.
 * `eventId` carries a unique index, so a message retried after a lost
 * acknowledgement lands on the constraint error below and is reported as a
 * duplicate rather than doubling the user's attempt count.
 */
export async function recordAttempt(
  attempt: AttemptInput,
): Promise<ResponseMap[MessageKind.RecordAttempt]> {
  const database = db();

  try {
    await database.attempts.add(attempt as never);
  } catch (error) {
    if (!isConstraintError(error)) throw error;
    const duplicate: ResponseMap[MessageKind.RecordAttempt] = { stored: false, duplicate: true };
    return duplicate;
  }

  await database.transaction("rw", database.questions, database.topics, async () => {
    const previous = await database.questions.get(attempt.goId);
    await database.questions.put(projectAttempt(attempt, previous));

    if (attempt.ordinal === null) return;

    const topic = await database.topics.get(attempt.topicSlug);
    // Only the fields this path owns, so indexing a page concurrently cannot
    // roll the high-water mark back.
    await upsertTopic(database, attempt.topicSlug, {
      lastAnsweredOrdinal: Math.max(topic?.lastAnsweredOrdinal ?? 0, attempt.ordinal),
      lastVisitedPage: topic?.lastVisitedPage ?? attempt.pageNo,
      updatedAt: attempt.ts,
    });
  });

  await refreshSummariesFor(await topicsAffectedBy(attempt, database));
  const stored: ResponseMap[MessageKind.RecordAttempt] = { stored: true, duplicate: false };
  return stored;
}
