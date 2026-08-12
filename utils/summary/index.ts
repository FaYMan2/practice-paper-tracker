/**
 * Turning stored records into per-topic counts.
 *
 * Everything here reads IndexedDB, so it runs in the background worker only.
 * The content script reads the mirrored result from `./mirror` instead.
 */

import * as R from "ramda";
import { db, INDEX, type TrackerDB } from "../db";
import type {
  QuestionRecord,
  QuestionStatus,
  RowRecord,
  TopicRecord,
  TopicSummary,
} from "../../types";
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
 * The lowest-ordinal question with no attempt.
 *
 * Note this is *not* where resume points. Skipping a hard question and moving
 * on is normal, and targeting the first gap would drag you back to it on every
 * return. It is kept for the dashboard to offer as "next unanswered".
 *
 * With gaps in the row index the true first unanswered question is unknowable,
 * so it estimates just past the furthest answer rather than inventing one.
 */
function resolveFirstUnattempted(input: ResumeTargetInputs): ResumeTarget {
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
 * The furthest question answered in this topic — where resume sends you.
 *
 * Prefers the highest-ordinal answered row, because that carries the question
 * id and an id survives the ordinal shift a new exam year causes. Falls back to
 * the topic record's own high-water mark, which is derived from the attempt log
 * and so can exceed anything currently indexed.
 */
function furthestAnswered(
  attempted: TopicRowInput[],
  recordedOrdinal: number | null,
): ResumeTarget {
  // `attempted` is already sorted ascending by ordinal.
  const lastRow = attempted.at(-1) ?? null;

  if (lastRow && (recordedOrdinal === null || lastRow.ordinal >= recordedOrdinal)) {
    const fromRow: ResumeTarget = { ordinal: lastRow.ordinal, goId: lastRow.goId };
    return fromRow;
  }

  const fromRecord: ResumeTarget = { ordinal: recordedOrdinal, goId: null };
  return fromRecord;
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

  // Only rows seen on this topic's own pages can be navigated to: a borrowed
  // row's ordinal numbers a position in the topic it was seen under, so
  // resuming on it would open the wrong page of this one.
  const placed = rowsInOrder.filter((row) => !row.borrowed);
  const firstUnattempted = placed.find((row) => statusOf(row) === "unattempted") ?? null;
  const lastAnswered = furthestAnswered(
    attempted.filter((row) => !row.borrowed),
    input.lastAnsweredOrdinal,
  );

  const indexedRows = rowsInOrder.length;
  const fullyIndexed = input.totalFromSite !== null && indexedRows >= input.totalFromSite;
  const nextUnanswered = resolveFirstUnattempted({
    firstUnattempted,
    fullyIndexed,
    lastAnsweredOrdinal: input.lastAnsweredOrdinal,
  });

  const summary: TopicSummary = {
    slug: input.slug,
    title: input.title,
    parentSlug: input.parentSlug,
    solvedRows: attempted.length,
    correctRows: correct.length,
    wrongRows: attempted.length - correct.length,
    distinctSolved: R.uniq(R.pluck("goId", attempted)).length,
    totalFromSite: input.totalFromSite,
    indexedRows,
    fullyIndexed,
    marksEarned: R.sum(R.pluck("marks", correct)),
    totalMarksFromSite: input.totalMarksFromSite,
    lastAnsweredOrdinal: lastAnswered.ordinal,
    lastAnsweredGoId: lastAnswered.goId,
    lastVisitedPage: input.lastVisitedPage,
    firstUnattemptedOrdinal: nextUnanswered.ordinal,
    firstUnattemptedGoId: nextUnanswered.goId,
    lastActivityAt: input.lastActivityAt,
  };
  return summary;
}

/**
 * Every question known to belong to this topic, from wherever it was seen.
 *
 * A topic's own pages are only one source. The site labels each question with
 * the other topic it is filed under — a Probability Theory question listed on
 * the Discrete Mathematics page says so beneath itself — so answering it there
 * is answering it here, and a topic whose pages have never been opened can
 * still show real progress.
 *
 * Borrowed rows are deduplicated against the topic's own by question id, and
 * marked, because their `ordinal` is a position in *that* topic's numbering and
 * would send a resume link to the wrong page of this one.
 */
async function topicRows(slug: string, database: TrackerDB): Promise<TopicRowInput[]> {
  const own = await database.rows.where(INDEX.rowTopicSlug).equals(slug).toArray();
  const elsewhere = await database.rows.where(INDEX.rowRelatedSlugs).equals(slug).toArray();

  const seen = new Set(own.map((row) => row.goId));
  const borrowed = elsewhere.filter((row) => !seen.has(row.goId));

  return [
    ...own.map((row) => toRowInput(row, false)),
    ...borrowed.map((row) => toRowInput(row, true)),
  ];
}

function toRowInput(row: RowRecord, borrowed: boolean): TopicRowInput {
  const input: TopicRowInput = {
    ordinal: row.ordinal,
    goId: row.goId,
    marks: row.marks,
    borrowed,
  };
  return input;
}

/** Latest status and attempt time per question, for the rows in hand. */
interface QuestionFacts {
  statusByGoId: Map<string, QuestionStatus>;
  lastAttemptByGoId: Map<string, number | null>;
}

function factsFrom(questions: QuestionRecord[]): QuestionFacts {
  const facts: QuestionFacts = {
    statusByGoId: new Map(questions.map((question) => [question.goId, question.status])),
    lastAttemptByGoId: new Map(
      questions.map((question) => [question.goId, question.lastAttemptAt]),
    ),
  };
  return facts;
}

function summaryFor(
  slug: string,
  topic: TopicRecord | undefined,
  rows: TopicRowInput[],
  facts: QuestionFacts,
): TopicSummary {
  const goIds = R.uniq(R.pluck("goId", rows));
  const times = R.filter(
    R.isNotNil,
    goIds.map((goId) => facts.lastAttemptByGoId.get(goId) ?? null),
  );

  return computeTopicSummary({
    slug,
    title: topic?.title ?? null,
    parentSlug: topic?.parentSlug ?? null,
    totalFromSite: topic?.totalFromSite ?? null,
    totalMarksFromSite: topic?.totalMarksFromSite ?? null,
    lastAnsweredOrdinal: topic?.lastAnsweredOrdinal ?? null,
    lastVisitedPage: topic?.lastVisitedPage ?? null,
    rows,
    statusByGoId: facts.statusByGoId,
    lastActivityAt: times.length ? Math.max(...times) : null,
  });
}

/** Computes a topic's summary from IndexedDB without writing it out. */
export async function buildTopicSummary(
  slug: string,
  database: TrackerDB = db(),
): Promise<TopicSummary | null> {
  const topic = await database.topics.get(slug);
  const rows = await topicRows(slug, database);
  if (!topic && rows.length === 0) return null;

  const goIds = R.uniq(R.pluck("goId", rows));
  const questions = goIds.length
    ? await database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray()
    : [];

  return summaryFor(slug, topic, rows, factsFrom(questions));
}

/**
 * Files every row under each topic it counts towards, in one pass.
 *
 * The per-topic query does the same thing one slug at a time; doing it in
 * memory is what keeps a full rebuild to three table reads instead of three
 * hundred, which matters because the dashboard now rebuilds on every load.
 */
function groupRowsBySlug(rows: RowRecord[]): Map<string, TopicRowInput[]> {
  const grouped = new Map<string, TopicRowInput[]>();
  const ownGoIds = new Map<string, Set<string>>();

  const push = (slug: string, input: TopicRowInput): void => {
    grouped.set(slug, [...(grouped.get(slug) ?? []), input]);
  };

  rows.forEach((row) => {
    push(row.topicSlug, toRowInput(row, false));
    ownGoIds.set(row.topicSlug, (ownGoIds.get(row.topicSlug) ?? new Set()).add(row.goId));
  });

  // Second pass, because a row is only borrowed where the topic has no row of
  // its own for that question — which is not known until the first pass ends.
  rows.forEach((row) => {
    row.relatedSlugs
      .filter((slug) => !ownGoIds.get(slug)?.has(row.goId))
      .forEach((slug) => push(slug, toRowInput(row, true)));
  });

  return grouped;
}

/**
 * Every topic's summary, computed from the database in one pass.
 *
 * This is the authority. The `storage.local` mirror is a cache for the injected
 * UI, which cannot reach IndexedDB; anything running on an extension page reads
 * through here instead, so a stale mirror can never be what it shows.
 */
export async function buildAllSummaries(database: TrackerDB = db()): Promise<TopicSummary[]> {
  const [topics, rows, questions] = await Promise.all([
    database.topics.toArray(),
    database.rows.toArray(),
    database.questions.toArray(),
  ]);

  const grouped = groupRowsBySlug(rows);
  const facts = factsFrom(questions);
  const bySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const slugs = R.union(R.pluck("slug", topics), [...grouped.keys()]);

  return slugs.map((slug) => summaryFor(slug, bySlug.get(slug), grouped.get(slug) ?? [], facts));
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

/**
 * Recomputes several topics at once, writing the mirror a single time.
 *
 * Answering one question changes more than one topic's figures: the question is
 * filed under a child topic as well as the subject whose page it was answered
 * on. Refreshing only the page's own topic is what left the others reading zero
 * until something rebuilt everything.
 */
export async function refreshSummariesFor(
  slugs: Iterable<string>,
  database: TrackerDB = db(),
): Promise<number> {
  const wanted = R.uniq([...slugs]);
  const built = await Promise.all(wanted.map((slug) => buildTopicSummary(slug, database)));
  const summaries = R.filter(R.isNotNil, built);

  await mergeSummaries(summaries);
  return summaries.length;
}

/**
 * Rebuilds every topic summary. Used after an import or a detected divergence.
 * The mirror is written once so the topics cannot clobber one another.
 */
export async function refreshAllSummaries(database: TrackerDB = db()): Promise<number> {
  const summaries = await buildAllSummaries(database);
  await mergeSummaries(summaries);
  return summaries.length;
}
