/** Indexing the questions on a page, answered or not. */

import { db, INDEX } from "../../utils/db";
import { refreshSummariesFor } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type {
  ObservedRow,
  PageObservation,
  QuestionRecord,
  ResponseMap,
  RowRecord,
} from "../../types";
import { reconcileProvisional } from "./reconcile";
import { upsertTopic, withParents } from "./topics";

function toRowRecord(topicSlug: string, row: ObservedRow, now: number): RowRecord {
  const record: RowRecord = {
    topicSlug,
    ordinal: row.ordinal,
    goId: row.goId,
    examSlug: row.examSlug,
    type: row.type,
    marks: row.marks,
    relatedSlugs: row.relatedSlugs,
    lastSeenAt: now,
  };
  return record;
}

function seedQuestion(row: ObservedRow, now: number): QuestionRecord {
  const seeded: QuestionRecord = {
    goId: row.goId,
    status: "unattempted",
    starred: false,
    type: row.type,
    marks: row.marks,
    firstSeenAt: now,
    lastAttemptAt: null,
    attemptCount: 0,
    firstVerdict: null,
  };
  return seeded;
}

/**
 * Records every question seen on a page load. This is the lazy indexing that
 * lets a topic's numerator be counted in the same unit as the site's own
 * "out of N" denominator — rows, not distinct questions.
 */
export async function observePage(
  page: PageObservation,
): Promise<ResponseMap[MessageKind.ObservePage]> {
  const database = db();
  const now = Date.now();

  // Before anything is written: a placement we hold under a synthetic key may
  // have gained a real GateOverflow id, and its history has to move across
  // before the row is overwritten with the new key.
  const repaired = await reconcileProvisional(page.topicSlug, page.rows, database);
  if (repaired.length > 0) console.info("[pptr] reconciled provisional keys", repaired);

  await database.transaction(
    "rw",
    database.rows,
    database.topics,
    database.questions,
    async () => {
      await database.rows.bulkPut(page.rows.map((row) => toRowRecord(page.topicSlug, row, now)));

      // Seed unattempted rows so the dashboard can list a topic's questions
      // before any of them has been answered.
      const known = new Set(
        (await database.questions
          .where(INDEX.questionGoId)
          .anyOf(page.rows.map((row) => row.goId))
          .primaryKeys()) as string[],
      );
      const fresh = page.rows
        .filter((row) => !known.has(row.goId))
        .map((row) => seedQuestion(row, now));
      if (fresh.length) await database.questions.bulkAdd(fresh);

      const topic = await database.topics.get(page.topicSlug);
      const indexedPages = new Set(topic?.indexedPages ?? []);
      if (page.rows.length > 0) indexedPages.add(page.pageNo);

      // `lastAnsweredOrdinal` is deliberately absent: recording an answer owns
      // it, and rewriting it from a stale read here would undo a solve that
      // landed while this page was being indexed.
      await upsertTopic(database, page.topicSlug, {
        title: page.title ?? topic?.title ?? null,
        // Re-read every visit: the site's totals grow with each new exam year.
        totalFromSite: page.totalFromSite ?? topic?.totalFromSite ?? null,
        totalMarksFromSite: page.totalMarksFromSite ?? topic?.totalMarksFromSite ?? null,
        lastVisitedPage: page.pageNo,
        indexedPages: [...indexedPages].sort((a, b) => a - b),
        updatedAt: now,
      });
    },
  );

  // Not just this page's topic: each question is also filed under a child
  // topic, and counts towards the subject this topic sits under. All of their
  // figures change the moment this page is indexed.
  await refreshSummariesFor(
    await withParents(database, [
      page.topicSlug,
      ...page.rows.flatMap((row) => row.relatedSlugs),
    ]),
  );
  const observed: ResponseMap[MessageKind.ObservePage] = { rows: page.rows.length };
  return observed;
}
