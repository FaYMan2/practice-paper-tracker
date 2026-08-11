/**
 * The single writer. Owns IndexedDB; every mutation in the extension passes
 * through here.
 *
 * MV3 terminates this worker after ~30s idle, so nothing may be cached in
 * module scope beyond the Dexie handle, and the message listener must be
 * registered synchronously at the top level so a cold start can receive the
 * event that woke it.
 */

import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import {
  db,
  INDEX,
  questionMarks,
  rebuildQuestionProjections,
  recordDiagnostic,
} from "../utils/db";
import { getSummaries, refreshAllSummaries, refreshTopicSummary } from "../utils/summary";
import { MessageKind } from "../utils/messaging";
import type {
  AttemptInput,
  Message,
  PageObservation,
  QuestionRecord,
  ResponseMap,
  TopicSummary,
} from "../types";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message;
    handle(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error("[pptr] handler failed", message?.kind, error);
        sendResponse({ error: error instanceof Error ? error.message : String(error) });
      });
    // Keeps the message channel open for the async response.
    return true;
  });

  console.info("[pptr] background ready");
});

async function handle(message: Message): Promise<unknown> {
  switch (message.kind) {
    case MessageKind.RecordAttempt:
      return await recordAttempt(message.attempt);

    case MessageKind.ObservePage:
      return await observePage(message.page);

    case MessageKind.GetSummaries:
      return await summariesFor(message.slugs);

    case MessageKind.GetQuestionMarks:
      return Object.fromEntries(await questionMarks(message.goIds));

    case MessageKind.ReportDiagnostic: {
      await recordDiagnostic(message.entry);
      await setBadge(true);
      const acknowledged: ResponseMap[MessageKind.ReportDiagnostic] = { ok: true };
      return acknowledged;
    }

    case MessageKind.RebuildAll: {
      const rebuilt: ResponseMap[MessageKind.RebuildAll] = {
        questions: await rebuildQuestionProjections(),
        topics: await refreshAllSummaries(),
      };
      return rebuilt;
    }

    default: {
      const unreachable: never = message;
      throw new Error(`unknown message: ${JSON.stringify(unreachable)}`);
    }
  }
}

async function summariesFor(slugs?: string[]): Promise<Record<string, TopicSummary>> {
  const all = await getSummaries();
  if (!slugs) return all;

  return Object.fromEntries(
    slugs.map((slug) => [slug, all[slug]]).filter(([, summary]) => summary !== undefined),
  ) as Record<string, TopicSummary>;
}

function projectAttempt(attempt: AttemptInput, previous: QuestionRecord | undefined): QuestionRecord {
  const projected: QuestionRecord = {
    goId: attempt.goId,
    status: attempt.verdict,
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

/**
 * Appends an attempt. Never updates an existing one.
 *
 * `eventId` carries a unique index, so a message retried after a lost
 * acknowledgement lands on the constraint error below and is reported as a
 * duplicate rather than doubling the user's attempt count.
 */
async function recordAttempt(
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
    await database.topics.put({
      slug: attempt.topicSlug,
      title: topic?.title ?? null,
      parentSlug: topic?.parentSlug ?? null,
      totalFromSite: topic?.totalFromSite ?? null,
      totalMarksFromSite: topic?.totalMarksFromSite ?? null,
      lastAnsweredOrdinal: Math.max(topic?.lastAnsweredOrdinal ?? 0, attempt.ordinal),
      lastVisitedPage: topic?.lastVisitedPage ?? attempt.pageNo,
      indexedPages: topic?.indexedPages ?? [],
      updatedAt: attempt.ts,
    });
  });

  await refreshTopicSummary(attempt.topicSlug);
  const stored: ResponseMap[MessageKind.RecordAttempt] = { stored: true, duplicate: false };
  return stored;
}

function seedQuestion(row: PageObservation["rows"][number], now: number): QuestionRecord {
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
 * Records every question seen on a page load, answered or not. This is the lazy
 * indexing that lets us count solved rows against the site's own total.
 */
async function observePage(page: PageObservation): Promise<ResponseMap[MessageKind.ObservePage]> {
  const database = db();
  const now = Date.now();

  await database.transaction(
    "rw",
    database.rows,
    database.topics,
    database.questions,
    async () => {
      await database.rows.bulkPut(
        page.rows.map((row) => ({
          topicSlug: page.topicSlug,
          ordinal: row.ordinal,
          goId: row.goId,
          examSlug: row.examSlug,
          type: row.type,
          marks: row.marks,
          lastSeenAt: now,
        })),
      );

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

      await database.topics.put({
        slug: page.topicSlug,
        title: page.title ?? topic?.title ?? null,
        parentSlug: topic?.parentSlug ?? null,
        // Re-read every visit: the site's totals grow with each new exam year.
        totalFromSite: page.totalFromSite ?? topic?.totalFromSite ?? null,
        totalMarksFromSite: page.totalMarksFromSite ?? topic?.totalMarksFromSite ?? null,
        lastAnsweredOrdinal: topic?.lastAnsweredOrdinal ?? null,
        lastVisitedPage: page.pageNo,
        indexedPages: [...indexedPages].sort((a, b) => a - b),
        updatedAt: now,
      });
    },
  );

  await refreshTopicSummary(page.topicSlug);
  const observed: ResponseMap[MessageKind.ObservePage] = { rows: page.rows.length };
  return observed;
}

function isConstraintError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  return name === "ConstraintError" || /constraint/i.test(String(error));
}

async function setBadge(warn: boolean): Promise<void> {
  try {
    await browser.action.setBadgeText({ text: warn ? "!" : "" });
    if (warn) await browser.action.setBadgeBackgroundColor({ color: "#c2410c" });
  } catch {
    // The badge is a nicety; never let it break a write path.
  }
}
