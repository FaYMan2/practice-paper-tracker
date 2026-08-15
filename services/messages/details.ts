/** Reading one topic's questions, for the dashboard drill-down. */

import * as R from "ramda";
import { db, INDEX } from "../../utils/db";
import { isProvisionalKey } from "../../utils/url";
import type { MessageKind } from "../../utils/messaging";
import type {
  QuestionRecord,
  ResponseMap,
  RowRecord,
  TopicQuestionRow,
} from "../../types";

/** The placement joined to what the attempt log says about the question. */
function toQuestionRow(row: RowRecord, question: QuestionRecord | undefined): TopicQuestionRow {
  const joined: TopicQuestionRow = {
    ordinal: row.ordinal,
    topicSlug: row.topicSlug,
    goId: row.goId,
    examSlug: row.examSlug,
    type: row.type,
    marks: row.marks,
    // A row with no question record has never been indexed as a question,
    // which can only mean it has never been seen — so, unattempted.
    status: question?.status ?? "unattempted",
    attemptCount: question?.attemptCount ?? 0,
    lastAttemptAt: question?.lastAttemptAt ?? null,
    firstVerdict: question?.firstVerdict ?? null,
    provisional: isProvisionalKey(row.goId),
    starred: question?.starred ?? false,
  };
  return joined;
}

/**
 * The topic's own rows, plus those the site files here but that were seen on
 * another topic's page — the same union the summary counts, so the list can
 * never disagree with the figures above it.
 */
async function rowsFor(slug: string): Promise<RowRecord[]> {
  const database = db();
  const own = await database.rows.where(INDEX.rowTopicSlug).equals(slug).toArray();
  const elsewhere = await database.rows.where(INDEX.rowRelatedSlugs).equals(slug).toArray();

  const seen = new Set(own.map((row) => row.goId));
  return [...own, ...elsewhere.filter((row) => !seen.has(row.goId))];
}

/**
 * Every indexed question in a topic.
 *
 * Too large to mirror into `storage.local` alongside the summaries — a single
 * subject runs to several hundred rows — so unlike the topic table this costs
 * a message round trip and is fetched only when a topic is expanded.
 */
export async function topicDetail(
  slug: string,
): Promise<ResponseMap[MessageKind.GetTopicDetail]> {
  const database = db();
  const rows = await rowsFor(slug);

  const goIds = R.uniq(R.pluck("goId", rows));
  const questions = goIds.length
    ? await database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray()
    : [];
  const byGoId = new Map(questions.map((question) => [question.goId, question]));

  const detail: ResponseMap[MessageKind.GetTopicDetail] = {
    slug,
    rows: R.sortBy(R.prop("ordinal"), rows).map((row) =>
      toQuestionRow(row, byGoId.get(row.goId)),
    ),
  };
  return detail;
}
