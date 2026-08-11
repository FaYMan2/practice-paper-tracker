/** Recording an answer. */

import { db } from "../../utils/db";
import { refreshTopicSummary } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { AttemptInput, QuestionRecord, ResponseMap } from "../../types";
import { upsertTopic } from "./topics";

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
 * Appends an attempt. Never updates an existing one.
 *
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

  await refreshTopicSummary(attempt.topicSlug);
  const stored: ResponseMap[MessageKind.RecordAttempt] = { stored: true, duplicate: false };
  return stored;
}
