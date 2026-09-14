/** Reading the papers you have sat, scored on their own answers. */

import * as R from "ramda";
import { db, INDEX } from "../../utils/db";
import type { TrackerDB } from "../../utils/db";
import { buildPaper, paperSlugs, satAttempts, summarise } from "../../utils/papers";
import type { PaperDetail, PaperSummary } from "../../utils/papers";
import type { MessageKind } from "../../utils/messaging";
import type { AttemptRecord, ResponseMap, RowRecord, TopicRecord } from "../../types";

/**
 * Every question answered anywhere, for telling "met elsewhere" from "sat".
 *
 * Read from the projection rather than the log because that is exactly what
 * the projection is for, and `status` is not indexed: filtering in memory over
 * a table of a few hundred rows is cheaper than an index nothing else needs.
 */
async function answeredAnywhere(database: TrackerDB): Promise<Set<string>> {
  const questions = await database.questions.toArray();
  return new Set(
    questions
      .filter((question) => question.status !== "unattempted")
      .map((question) => question.goId),
  );
}

async function detailFor(
  slug: string,
  rows: RowRecord[],
  attempts: AttemptRecord[],
  topic: TopicRecord | undefined,
  answered: Set<string>,
): Promise<PaperDetail> {
  return buildPaper({
    slug,
    rows,
    sat: satAttempts(attempts, slug),
    answeredAnywhere: answered,
    totalFromSite: topic?.totalFromSite ?? null,
    totalMarksFromSite: topic?.totalMarksFromSite ?? null,
  });
}

/**
 * Every paper that has been opened, newest first.
 *
 * Built from the `topics` table rather than from the attempt log, so a paper
 * you opened and read without answering anything still appears: "sat none of
 * it" is a state worth seeing, and it is how you find your way back in.
 */
export async function paperOverview(
  database: TrackerDB = db(),
): Promise<ResponseMap[MessageKind.GetPapers]> {
  const topics = await database.topics.toArray();
  const slugs = paperSlugs(topics.map((topic) => topic.slug));
  if (slugs.length === 0) {
    const nothing: ResponseMap[MessageKind.GetPapers] = { papers: [] };
    return nothing;
  }

  const bySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const attempts = await database.attempts.toArray();
  const answered = await answeredAnywhere(database);

  const papers: PaperSummary[] = [];
  for (const slug of slugs) {
    const rows = await database.rows.where(INDEX.rowTopicSlug).equals(slug).toArray();
    papers.push(summarise(await detailFor(slug, rows, attempts, bySlug.get(slug), answered)));
  }

  const overview: ResponseMap[MessageKind.GetPapers] = { papers };
  return overview;
}

/** One paper, with every question it holds. */
export async function paperDetail(
  slug: string,
  database: TrackerDB = db(),
): Promise<ResponseMap[MessageKind.GetPaperDetail]> {
  const [rows, attempts, topic, answered] = await Promise.all([
    database.rows.where(INDEX.rowTopicSlug).equals(slug).toArray(),
    database.attempts.toArray(),
    database.topics.get(slug),
    answeredAnywhere(database),
  ]);

  return await detailFor(slug, R.sortBy(R.prop("ordinal"), rows), attempts, topic, answered);
}
