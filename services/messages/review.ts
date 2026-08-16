/** Building the review queue from the attempt log. */

import * as R from "ramda";
import { db, INDEX } from "../../utils/db";
import type { TrackerDB } from "../../utils/db";
import { UPCOMING_LIMIT, isDue, overdueDays, scheduleAll } from "../../utils/review";
import type { ReviewItem, ReviewSchedule } from "../../utils/review";
import type { MessageKind } from "../../utils/messaging";
import type { AttemptRecord, QuestionRecord, ResponseMap, RowRecord } from "../../types";

/**
 * Where to send someone who wants to answer this question again.
 *
 * One question can occupy several rows across several topics, so there is a
 * choice to make. The topic it was last answered under wins: that is the
 * listing it was met in, and the one whose question numbers will look familiar.
 * Otherwise the lowest ordinal, for no better reason than that it is stable.
 */
function placementFor(rows: RowRecord[], lastTopicSlug: string): RowRecord | null {
  const familiar = rows.find((row) => row.topicSlug === lastTopicSlug);
  return familiar ?? R.head(R.sortBy(R.prop("ordinal"), rows)) ?? null;
}

function toItem(
  schedule: ReviewSchedule,
  row: RowRecord,
  question: QuestionRecord | undefined,
  subjectSlug: string | null,
  now: number,
): ReviewItem {
  const item: ReviewItem = {
    goId: schedule.goId,
    topicSlug: row.topicSlug,
    subjectSlug,
    ordinal: row.ordinal,
    examSlug: row.examSlug,
    type: row.type,
    marks: row.marks,
    starred: question?.starred ?? false,
    attemptCount: question?.attemptCount ?? 0,
    lapses: schedule.lapses,
    lastReviewedAt: schedule.lastReviewedAt,
    dueAt: schedule.dueAt,
    overdueDays: overdueDays(schedule, now),
  };
  return item;
}

/** The last topic each question was answered under, for choosing a placement. */
function lastTopicByGoId(attempts: AttemptRecord[]): Map<string, string> {
  const inOrder = R.sortBy(R.prop("ts"), attempts);
  return new Map(inOrder.map((attempt) => [attempt.goId, attempt.topicSlug]));
}

/**
 * Everything worth reviewing, and when.
 *
 * Computed on every call rather than stored. That is one pass over `attempts` —
 * the same table the dashboard already reads twice to check its projections —
 * in exchange for a schedule that cannot disagree with the log, because there
 * is no copy of it anywhere to disagree.
 */
export async function reviewQueue(
  database: TrackerDB = db(),
  now: number = Date.now(),
): Promise<ResponseMap[MessageKind.GetReviewQueue]> {
  const attempts = await database.attempts.toArray();
  const scheduled = scheduleAll(attempts).filter((schedule) => !schedule.graduated);

  if (scheduled.length === 0) {
    const nothing: ResponseMap[MessageKind.GetReviewQueue] = {
      due: [],
      upcoming: [],
      tracked: 0,
      unplaced: 0,
    };
    return nothing;
  }

  const goIds = R.pluck("goId", scheduled);
  const [rows, questions] = await Promise.all([
    database.rows.where(INDEX.rowGoId).anyOf(goIds).toArray(),
    database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray(),
  ]);

  const rowsByGoId = Map.groupBy(rows, (row) => row.goId);
  const questionsByGoId = new Map(questions.map((question) => [question.goId, question]));
  const lastTopic = lastTopicByGoId(attempts);

  // Read here rather than derived on the dashboard from the summaries: the
  // hierarchy belongs to the topics table, and a second copy of it computed
  // somewhere else is a second thing that can be wrong.
  const topics = await database.topics.toArray();
  const parentOf = new Map(topics.map((topic) => [topic.slug, topic.parentSlug]));

  const placed = scheduled.map((schedule) => {
    const row = placementFor(
      rowsByGoId.get(schedule.goId) ?? [],
      lastTopic.get(schedule.goId) ?? "",
    );
    // A question answered on a page whose rows were never recorded has nowhere
    // to link to. Counted rather than listed, so the number still adds up.
    return row === null
      ? null
      : toItem(
          schedule,
          row,
          questionsByGoId.get(schedule.goId),
          parentOf.get(row.topicSlug) ?? null,
          now,
        );
  });

  const items = R.filter(R.isNotNil, placed);
  const bySoonest = R.sortBy(R.prop("dueAt"), items);
  const dueNow = new Set(
    scheduled.filter((schedule) => isDue(schedule, now)).map((schedule) => schedule.goId),
  );

  const queue: ResponseMap[MessageKind.GetReviewQueue] = {
    // Ascending due date is descending overdue-ness: the longest wait first.
    due: bySoonest.filter((item) => dueNow.has(item.goId)),
    upcoming: bySoonest.filter((item) => !dueNow.has(item.goId)).slice(0, UPCOMING_LIMIT),
    tracked: scheduled.length,
    unplaced: scheduled.length - items.length,
  };
  return queue;
}
