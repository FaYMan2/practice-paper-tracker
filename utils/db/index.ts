/**
 * IndexedDB access, owned exclusively by the background service worker.
 *
 * This database must never be opened from a content script. An IndexedDB
 * opened there lives in practicepaper.in's origin partition, where the
 * extension's own dashboard page can never read it. Only the background worker
 * and extension pages share the extension origin, which is why every write
 * goes content script -> sendMessage -> background.
 */

import Dexie, { type Table, type Transaction } from "dexie";
import type {
  AttemptRecord,
  DiagnosticRecord,
  QuestionMark,
  QuestionRecord,
  RowRecord,
  TopicRecord,
} from "../../types";
import {
  DB_NAME,
  DIAGNOSTIC_LIMIT,
  INDEX,
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  TableName,
} from "./constants";

export * from "./constants";

async function backfillRelatedSlugs(tx: Transaction): Promise<void> {
  await tx
    .table<RowRecord>(TableName.Rows)
    .toCollection()
    .modify((row) => {
      row.relatedSlugs = row.relatedSlugs ?? [];
    });
}

export class TrackerDB extends Dexie {
  questions!: Table<QuestionRecord, string>;
  attempts!: Table<AttemptRecord, number>;
  rows!: Table<RowRecord, [string, number]>;
  topics!: Table<TopicRecord, string>;
  diagnostics!: Table<DiagnosticRecord, number>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    // Rows written before this version carry no `relatedSlugs`, and a
    // multi-entry index skips a missing field entirely. Backfilling an empty
    // array keeps every row addressable; revisiting a page fills in the real
    // labels.
    this.version(2).stores(SCHEMA_V2).upgrade(backfillRelatedSlugs);
    // Repeated because the version 2 pass left rows behind — see SCHEMA_V3.
    this.version(3).stores(SCHEMA_V3).upgrade(backfillRelatedSlugs);
  }
}

let instance: TrackerDB | null = null;

/**
 * The Dexie handle is the only thing held across service-worker invocations.
 * Opening on a cold start costs single-digit milliseconds, so there is no
 * reason to cache anything else in module scope.
 */
export function db(): TrackerDB {
  instance ??= new TrackerDB();
  return instance;
}

/**
 * The topics a stored row also counts towards.
 *
 * Rows written before the field existed have no array at all, and a crash
 * while reading one takes the whole dashboard with it — so nothing reads the
 * field directly.
 */
export function relatedSlugsOf(row: RowRecord): string[] {
  return row.relatedSlugs ?? [];
}

/** Test seam — lets a suite point at an isolated database. */
export function setDb(next: TrackerDB | null): void {
  instance = next;
}

function projectAnswered(
  goId: string,
  attempts: AttemptRecord[],
  previous: QuestionRecord | undefined,
): QuestionRecord {
  // Callers pass attempts already ordered by `ts`, so ends are chronological.
  const first = attempts[0]!;
  const last = attempts[attempts.length - 1]!;

  const projected: QuestionRecord = {
    goId,
    status: last.verdict,
    // `starred` is user curation, not a projection — never recompute it.
    starred: previous?.starred ?? false,
    type: last.type,
    marks: last.marks,
    firstSeenAt: previous?.firstSeenAt ?? first.ts,
    lastAttemptAt: last.ts,
    attemptCount: attempts.length,
    firstVerdict: first.verdict,
  };
  return projected;
}

function projectUnattempted(question: QuestionRecord): QuestionRecord {
  const reset: QuestionRecord = {
    ...question,
    status: "unattempted",
    attemptCount: 0,
    firstVerdict: null,
    lastAttemptAt: null,
  };
  return reset;
}

/** What is stored against each question, and what the log says it should be. */
interface ProjectionPass {
  stored: Map<string, QuestionRecord>;
  computed: QuestionRecord[];
}

/**
 * Recomputes every `questions` row from the log, keeping the stored copies.
 *
 * Separated from the write below because the same pass answers two questions —
 * what to store, and whether what is stored is still right — and reading these
 * two tables twice over to answer them separately would be the more expensive
 * half of every dashboard load.
 */
async function projectionPass(database: TrackerDB): Promise<ProjectionPass> {
  const attempts = await database.attempts.orderBy(INDEX.attemptTs).toArray();
  const existing = await database.questions.toArray();

  const attemptsByGoId = Map.groupBy(attempts, (attempt) => attempt.goId);
  const existingByGoId = new Map(existing.map((question) => [question.goId, question]));

  const answered = [...attemptsByGoId].map(([goId, list]) =>
    projectAnswered(goId, list, existingByGoId.get(goId)),
  );

  // A question seen but never answered keeps its row, reset to unattempted.
  const unanswered = existing
    .filter((question) => !attemptsByGoId.has(question.goId))
    .map(projectUnattempted);

  const pass: ProjectionPass = {
    stored: existingByGoId,
    computed: [...answered, ...unanswered],
  };
  return pass;
}

/**
 * Recomputes every derived field on `questions` from the `attempts` log alone.
 *
 * Not a repair tool bolted on for emergencies — it is the executable proof that
 * `attempts` really is the source of truth. If any state has quietly come to
 * live only in a mutable field on `questions`, this function's output diverges
 * from what is stored, and the Phase 1 verification catches it.
 */
export async function rebuildQuestionProjections(database: TrackerDB = db()): Promise<number> {
  const { computed } = await projectionPass(database);
  await database.questions.bulkPut(computed);
  return computed.length;
}

/**
 * The four fields the log decides on its own.
 *
 * `type` and `marks` are left out deliberately. They describe the question
 * rather than the answering of it, a row and an attempt can disagree about them
 * for innocent reasons, and treating that as damage would report a repair on
 * every single load.
 */
function sameProjection(stored: QuestionRecord, computed: QuestionRecord): boolean {
  return (
    stored.status === computed.status &&
    stored.attemptCount === computed.attemptCount &&
    stored.firstVerdict === computed.firstVerdict &&
    stored.lastAttemptAt === computed.lastAttemptAt
  );
}

/**
 * Questions whose cached state no longer matches the log.
 *
 * Phase 1 was built on the promise that `questions` is only ever a cache and
 * can be reconstructed from `attempts` at any time. This is that promise
 * checked rather than assumed: anything returned here is a row that would have
 * gone on quietly reporting the wrong status — a solve not showing on the page,
 * a topic reading one short — until something happened to rebuild it.
 */
export async function driftedProjections(
  database: TrackerDB = db(),
): Promise<QuestionRecord[]> {
  const { stored, computed } = await projectionPass(database);

  return computed.filter((question) => {
    const previous = stored.get(question.goId);
    return previous === undefined || !sameProjection(previous, question);
  });
}

/**
 * What is known about each of the given questions, for painting a page.
 *
 * Questions with nothing recorded against them are omitted — but a starred
 * question counts as something recorded, even with no attempt, because the
 * star still has to be painted. `answeredIn` comes from the attempt log rather
 * than the current topic, which is what lets a page show that a question was
 * already solved under a different topic.
 */
export async function questionMarks(
  goIds: string[],
  database: TrackerDB = db(),
): Promise<Map<string, QuestionMark>> {
  if (goIds.length === 0) return new Map<string, QuestionMark>();

  const questions = await database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray();
  const known = questions.filter(
    (question) => question.status !== "unattempted" || question.starred,
  );
  if (known.length === 0) return new Map<string, QuestionMark>();

  const attempts = await database.attempts
    .where(INDEX.attemptGoId)
    .anyOf(known.map((question) => question.goId))
    .toArray();
  const attemptsByGoId = Map.groupBy(attempts, (attempt) => attempt.goId);

  return new Map(
    known.map((question) => {
      const topics = (attemptsByGoId.get(question.goId) ?? []).map(
        (attempt) => attempt.topicSlug,
      );
      const mark: QuestionMark = {
        goId: question.goId,
        status: question.status,
        starred: question.starred,
        attemptCount: question.attemptCount,
        lastAttemptAt: question.lastAttemptAt,
        answeredIn: [...new Set(topics)],
      };
      return [question.goId, mark];
    }),
  );
}

export async function recordDiagnostic(
  entry: Omit<DiagnosticRecord, "id">,
  database: TrackerDB = db(),
): Promise<void> {
  await database.diagnostics.add(entry);
  await trimDiagnostics(database);
}

async function trimDiagnostics(database: TrackerDB): Promise<void> {
  const excess = (await database.diagnostics.count()) - DIAGNOSTIC_LIMIT;
  if (excess <= 0) return;

  const stale = await database.diagnostics
    .orderBy(INDEX.diagnosticTs)
    .limit(excess)
    .primaryKeys();
  await database.diagnostics.bulkDelete(stale);
}
