/**
 * IndexedDB access, owned exclusively by the background service worker.
 *
 * This database must never be opened from a content script. An IndexedDB
 * opened there lives in practicepaper.in's origin partition, where the
 * extension's own dashboard page can never read it. Only the background worker
 * and extension pages share the extension origin, which is why every write
 * goes content script -> sendMessage -> background.
 */

import Dexie, { type Table } from "dexie";
import type {
  AttemptRecord,
  DiagnosticRecord,
  QuestionMark,
  QuestionRecord,
  RowRecord,
  TopicRecord,
  Verdict,
} from "../../types";
import { DB_NAME, DIAGNOSTIC_LIMIT, INDEX, SCHEMA_V1 } from "./constants";

export * from "./constants";

export class TrackerDB extends Dexie {
  questions!: Table<QuestionRecord, string>;
  attempts!: Table<AttemptRecord, number>;
  rows!: Table<RowRecord, [string, number]>;
  topics!: Table<TopicRecord, string>;
  diagnostics!: Table<DiagnosticRecord, number>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
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

/**
 * Recomputes every derived field on `questions` from the `attempts` log alone.
 *
 * Not a repair tool bolted on for emergencies — it is the executable proof that
 * `attempts` really is the source of truth. If any state has quietly come to
 * live only in a mutable field on `questions`, this function's output diverges
 * from what is stored, and the Phase 1 verification catches it.
 */
export async function rebuildQuestionProjections(database: TrackerDB = db()): Promise<number> {
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

  const updates = [...answered, ...unanswered];
  await database.questions.bulkPut(updates);
  return updates.length;
}

/**
 * What is known about each of the given questions, for painting a page.
 *
 * Unattempted questions are omitted, so the caller can treat presence in the
 * result as "this has been answered before". `answeredIn` comes from the
 * attempt log rather than the current topic, which is what lets a page show
 * that a question was already solved under a different topic.
 */
export async function questionMarks(
  goIds: string[],
  database: TrackerDB = db(),
): Promise<Map<string, QuestionMark>> {
  if (goIds.length === 0) return new Map<string, QuestionMark>();

  const questions = await database.questions.where(INDEX.questionGoId).anyOf(goIds).toArray();
  const answered = questions.filter((question) => question.status !== "unattempted");
  if (answered.length === 0) return new Map<string, QuestionMark>();

  const attempts = await database.attempts
    .where(INDEX.attemptGoId)
    .anyOf(answered.map((question) => question.goId))
    .toArray();
  const attemptsByGoId = Map.groupBy(attempts, (attempt) => attempt.goId);

  return new Map(
    answered.map((question) => {
      const topics = (attemptsByGoId.get(question.goId) ?? []).map(
        (attempt) => attempt.topicSlug,
      );
      const mark: QuestionMark = {
        goId: question.goId,
        status: question.status as Verdict,
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
