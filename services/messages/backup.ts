/**
 * Getting the database out to a file, and merging one back in.
 *
 * The asymmetry between the two is the whole design. Export is a dump. Import
 * runs against a database that has kept being used since the file was written,
 * so it is a merge with a stated precedence for every table — and never a
 * replacement, because the one thing that must not happen is an import taking
 * away answers the file predates.
 */

import * as R from "ramda";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  mergeQuestion,
  mergeTopic,
  readBackup,
  rowIsFresher,
} from "../../utils/backup";
import type { Backup, ImportOutcome, ImportReport } from "../../utils/backup";
import { INDEX, SCHEMA_VERSION, db, rebuildQuestionProjections } from "../../utils/db";
import type { TrackerDB } from "../../utils/db";
import { refreshAllSummaries } from "../../utils/summary";
import type { AttemptInput, QuestionRecord, RowRecord, TopicRecord } from "../../types";

/**
 * Everything worth restoring, in one object.
 *
 * `diagnostics` is left out: it records what the site's markup did, is capped
 * at a few hundred entries, and means nothing on another machine.
 */
export async function exportBackup(database: TrackerDB = db()): Promise<Backup> {
  const [questions, attempts, rows, topics] = await Promise.all([
    database.questions.toArray(),
    database.attempts.toArray(),
    database.rows.toArray(),
    database.topics.toArray(),
  ]);

  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    questions,
    // Without `id`. An auto-increment key numbers a row in this database only,
    // and carrying it into another would land on an unrelated attempt.
    attempts: attempts.map(({ id: _id, ...attempt }) => attempt),
    rows,
    topics,
  };
  return backup;
}

/** Which of these answers the log has never seen, and how many it already had. */
interface AttemptSplit {
  fresh: AttemptInput[];
  alreadyHeld: number;
}

/**
 * Splits the file's answers against the log on `eventId`.
 *
 * Deduplicated within the file as well as against the database: `eventId` is
 * uniquely indexed, so a file that somehow held the same event twice would fail
 * the whole bulk write rather than the one row.
 */
async function splitAttempts(
  incoming: AttemptInput[],
  database: TrackerDB,
): Promise<AttemptSplit> {
  const held = new Set(
    (await database.attempts.orderBy(INDEX.attemptEventId).keys()) as string[],
  );
  const distinct = R.uniqBy(R.prop("eventId"), incoming);
  const fresh = distinct.filter((attempt) => !held.has(attempt.eventId));

  const split: AttemptSplit = { fresh, alreadyHeld: distinct.length - fresh.length };
  return split;
}

async function mergeQuestions(
  incoming: QuestionRecord[],
  database: TrackerDB,
): Promise<number> {
  if (incoming.length === 0) return 0;

  const stored = await database.questions.bulkGet(R.pluck("goId", incoming));
  const merged = incoming.map((question, index) => {
    const previous = stored[index];
    return previous ? mergeQuestion(previous, question) : question;
  });

  await database.questions.bulkPut(merged);
  return merged.length;
}

async function mergeRows(incoming: RowRecord[], database: TrackerDB): Promise<number> {
  if (incoming.length === 0) return 0;

  const keys = incoming.map((row): [string, number] => [row.topicSlug, row.ordinal]);
  const stored = await database.rows.bulkGet(keys);
  const fresher = incoming.filter((row, index) => rowIsFresher(row, stored[index]));

  await database.rows.bulkPut(fresher);
  return fresher.length;
}

async function mergeTopics(incoming: TopicRecord[], database: TrackerDB): Promise<number> {
  if (incoming.length === 0) return 0;

  const stored = await database.topics.bulkGet(R.pluck("slug", incoming));
  const merged = incoming.map((topic, index) => {
    const previous = stored[index];
    return previous ? mergeTopic(previous, topic) : topic;
  });

  await database.topics.bulkPut(merged);
  return merged.length;
}

/**
 * Merges a backup into whatever is already here.
 *
 * The order is deliberate. Everything is written inside one transaction, so a
 * failure part-way through leaves the database as it was rather than half
 * merged. Only once that has committed are the projections and summaries
 * rebuilt — from the combined log, which is the only thing that can account for
 * both databases' answers at once. Trusting the file's own `status` fields
 * instead would quietly overwrite a question answered again since the export.
 */
export async function importBackup(
  payload: unknown,
  database: TrackerDB = db(),
): Promise<ImportOutcome> {
  const read = readBackup(payload);
  if (!read.ok) {
    const refused: ImportOutcome = {
      ok: false,
      rejection: read.rejection,
      detail: read.detail,
    };
    return refused;
  }

  const { backup } = read;

  const counts = await database.transaction(
    "rw",
    database.questions,
    database.attempts,
    database.rows,
    database.topics,
    async () => {
      // Read inside the transaction that acts on it. Another tab reporting an
      // answer between the two would otherwise make this list stale, and a
      // stale list means a unique-index collision that aborts the whole import.
      const attempts = await splitAttempts(backup.attempts, database);
      await database.attempts.bulkAdd(attempts.fresh as never[]);

      return {
        attempts,
        questions: await mergeQuestions(backup.questions, database),
        rows: await mergeRows(backup.rows, database),
        topics: await mergeTopics(backup.topics, database),
      };
    },
  );

  const report: ImportReport = {
    attemptsAdded: counts.attempts.fresh.length,
    attemptsAlreadyHeld: counts.attempts.alreadyHeld,
    questionsTouched: counts.questions,
    rowsTouched: counts.rows,
    topicsTouched: counts.topics,
    skipped: read.skipped,
    questionsRebuilt: await rebuildQuestionProjections(database),
  };
  await refreshAllSummaries(database);

  const merged: ImportOutcome = { ok: true, report };
  return merged;
}
