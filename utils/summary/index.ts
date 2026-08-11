/**
 * Turning stored records into per-topic counts.
 *
 * Everything here reads IndexedDB, so it runs in the background worker only.
 * The content script reads the mirrored result from `./mirror` instead.
 */

import * as R from "ramda";
import { db, INDEX, type TrackerDB } from "../db";
import type { QuestionStatus, TopicSummary } from "../../types";
import { mergeSummaries } from "./mirror";
import type {
  ResumeTarget,
  ResumeTargetInputs,
  SummaryInputs,
  TopicRowInput,
} from "./types";

export * from "./constants";
export * from "./mirror";
export type * from "./types";

/**
 * Where "resume" points.
 *
 * The first *unattempted* question, not the last answered one (already done)
 * and not the furthest scroll (noise from scrolling past ads). With gaps in the
 * index we cannot know the true first unattempted question, so we fall back to
 * just past the furthest answer rather than inventing one.
 */
function resolveResumeTarget(input: ResumeTargetInputs): ResumeTarget {
  if (input.firstUnattempted) {
    const known: ResumeTarget = {
      ordinal: input.firstUnattempted.ordinal,
      goId: input.firstUnattempted.goId,
    };
    return known;
  }

  if (!input.fullyIndexed && input.lastAnsweredOrdinal !== null) {
    const estimated: ResumeTarget = { ordinal: input.lastAnsweredOrdinal + 1, goId: null };
    return estimated;
  }

  const none: ResumeTarget = { ordinal: null, goId: null };
  return none;
}

/**
 * Pure, so it can be unit-tested without IndexedDB.
 *
 * The counting rule that matters: the numerator counts *rows whose question is
 * solved*, not distinct solved questions. The site's "out of N" counts rows and
 * one question can legitimately occupy several — GateOverflow id 49487 fills
 * three in `stack` alone — so counting distinct questions against a row
 * denominator would strand a fully solved topic at N-2 of N forever.
 */
export function computeTopicSummary(input: SummaryInputs): TopicSummary {
  const rowsInOrder = R.sortBy(R.prop("ordinal"), input.rows);
  const statusOf = (row: TopicRowInput): QuestionStatus =>
    input.statusByGoId.get(row.goId) ?? "unattempted";

  const attempted = rowsInOrder.filter((row) => statusOf(row) !== "unattempted");
  const correct = attempted.filter((row) => statusOf(row) === "correct");
  const firstUnattempted = rowsInOrder.find((row) => statusOf(row) === "unattempted") ?? null;

  const indexedRows = rowsInOrder.length;
  const fullyIndexed = input.totalFromSite !== null && indexedRows >= input.totalFromSite;
  const resume = resolveResumeTarget({
    firstUnattempted,
    fullyIndexed,
    lastAnsweredOrdinal: input.lastAnsweredOrdinal,
  });

  const summary: TopicSummary = {
    slug: input.slug,
    title: input.title,
    solvedRows: attempted.length,
    correctRows: correct.length,
    wrongRows: attempted.length - correct.length,
    distinctSolved: R.uniq(R.pluck("goId", attempted)).length,
    totalFromSite: input.totalFromSite,
    indexedRows,
    fullyIndexed,
    marksEarned: R.sum(R.pluck("marks", correct)),
    totalMarksFromSite: input.totalMarksFromSite,
    lastAnsweredOrdinal: input.lastAnsweredOrdinal,
    lastVisitedPage: input.lastVisitedPage,
    firstUnattemptedOrdinal: resume.ordinal,
    firstUnattemptedGoId: resume.goId,
    lastActivityAt: input.lastActivityAt,
  };
  return summary;
}

/** Computes a topic's summary from IndexedDB without writing it out. */
export async function buildTopicSummary(
  slug: string,
  database: TrackerDB = db(),
): Promise<TopicSummary | null> {
  const topic = await database.topics.get(slug);
  const rows = await database.rows.where(INDEX.rowTopicSlug).equals(slug).toArray();
  if (!topic && rows.length === 0) return null;

  const goIds = R.uniq(R.pluck("goId", rows));
  const questions = goIds.length
    ? await database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray()
    : [];

  const statusByGoId = new Map<string, QuestionStatus>(
    questions.map((question) => [question.goId, question.status]),
  );
  // `R.pluck` loses the element type on a nullable field, so map explicitly.
  const activity = R.filter(R.isNotNil, questions.map((question) => question.lastAttemptAt));

  return computeTopicSummary({
    slug,
    title: topic?.title ?? null,
    totalFromSite: topic?.totalFromSite ?? null,
    totalMarksFromSite: topic?.totalMarksFromSite ?? null,
    lastAnsweredOrdinal: topic?.lastAnsweredOrdinal ?? null,
    lastVisitedPage: topic?.lastVisitedPage ?? null,
    rows: rows.map((row) => ({ ordinal: row.ordinal, goId: row.goId, marks: row.marks })),
    statusByGoId,
    lastActivityAt: activity.length ? Math.max(...activity) : null,
  });
}

/** Recomputes one topic's summary and mirrors it out. */
export async function refreshTopicSummary(
  slug: string,
  database: TrackerDB = db(),
): Promise<TopicSummary | null> {
  const summary = await buildTopicSummary(slug, database);
  if (summary) await mergeSummaries([summary]);
  return summary;
}

async function knownTopicSlugs(database: TrackerDB): Promise<string[]> {
  const fromTopics = (await database.topics.toCollection().primaryKeys()) as string[];
  const fromRows = (await database.rows.orderBy(INDEX.rowTopicSlug).uniqueKeys()).map(String);
  return R.union(fromTopics, fromRows);
}

/**
 * Rebuilds every topic summary. Used after an import or a detected divergence.
 * Computation fans out, but the mirror is written once so the topics cannot
 * clobber one another.
 */
export async function refreshAllSummaries(database: TrackerDB = db()): Promise<number> {
  const slugs = await knownTopicSlugs(database);
  const built = await Promise.all(slugs.map((slug) => buildTopicSummary(slug, database)));
  const summaries = R.filter(R.isNotNil, built);

  await mergeSummaries(summaries);
  return summaries.length;
}
