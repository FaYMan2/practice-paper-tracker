/**
 * Reading and writing the backup file.
 *
 * Everything here is pure — no database, no DOM — so the merge rules can be
 * tested as arithmetic rather than as a sequence of writes. The rules matter
 * more than the plumbing: an import runs against a database that has kept
 * working since the file was written, and the wrong precedence silently
 * destroys the newer half.
 */

import * as R from "ramda";
// From `../db/constants` rather than `../db`, so this module stays free of
// Dexie and can be tested as plain functions over plain objects.
import { BLANK_TOPIC } from "../db/constants";
import type {
  AttemptInput,
  Choice,
  QuestionRecord,
  QuestionStatus,
  QuestionType,
  RowRecord,
  TopicRecord,
  Verdict,
} from "../../types";
import { BACKUP_FILE_PREFIX, BACKUP_FORMAT, BACKUP_VERSION, UNKNOWN_TYPE } from "./constants";
import { BackupRejection } from "./types";
import type { Backup, BackupRead } from "./types";

export * from "./constants";
export * from "./types";

type Unknown = Record<string, unknown>;

function isRecord(value: unknown): value is Unknown {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

function verdictOf(value: unknown): Verdict | null {
  return value === "correct" || value === "wrong" ? value : null;
}

function statusOf(value: unknown): QuestionStatus {
  return verdictOf(value) ?? "unattempted";
}

function typeOf(value: unknown): QuestionType {
  const known: QuestionType[] = ["MCQ", "MSQ", "NAT", "UNKNOWN"];
  return known.find((entry) => entry === value) ?? UNKNOWN_TYPE;
}

function choicesOf(value: unknown): Choice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((raw) => {
    const choice: Choice = {
      kind: raw["kind"] === "numeric" ? "numeric" : "option",
      ts: num(raw["ts"], 0),
      ...(typeof raw["label"] === "string" ? { label: raw["label"] } : {}),
      ...(typeof raw["value"] === "string" ? { value: raw["value"] } : {}),
      ...(typeof raw["correct"] === "boolean" ? { correct: raw["correct"] } : {}),
    };
    return choice;
  });
}

/**
 * Reads one attempt, or nothing.
 *
 * Only the fields that make an attempt *an attempt* are required — which of
 * your questions, answered when, right or wrong, under what event id. The rest
 * are defaulted, because dropping a real answer over a missing `marks` field
 * would be the exact failure this whole feature exists to prevent.
 */
function readAttempt(value: unknown): AttemptInput | null {
  if (!isRecord(value)) return null;

  const eventId = nullableStr(value["eventId"]);
  const goId = nullableStr(value["goId"]);
  const verdict = verdictOf(value["verdict"]);
  const ts = nullableNum(value["ts"]);
  const topicSlug = nullableStr(value["topicSlug"]);
  if (!eventId || !goId || !verdict || ts === null || !topicSlug) return null;

  const attempt: AttemptInput = {
    eventId,
    goId,
    verdict,
    choices: choicesOf(value["choices"]),
    ts,
    topicSlug,
    ordinal: nullableNum(value["ordinal"]),
    pageNo: num(value["pageNo"], 1),
    examSlug: nullableStr(value["examSlug"]),
    type: typeOf(value["type"]),
    marks: num(value["marks"], 0),
    pageLoadId: str(value["pageLoadId"], eventId),
    ...(value["provisional"] === true ? { provisional: true } : {}),
  };
  return attempt;
}

/**
 * Reads one question.
 *
 * Everything except `starred` is a projection of the attempt log and gets
 * recomputed after the merge, so the stored values are read leniently: they are
 * a starting point that the rebuild immediately overwrites.
 */
function readQuestion(value: unknown): QuestionRecord | null {
  if (!isRecord(value)) return null;
  const goId = nullableStr(value["goId"]);
  if (!goId) return null;

  const question: QuestionRecord = {
    goId,
    status: statusOf(value["status"]),
    starred: value["starred"] === true,
    type: typeOf(value["type"]),
    marks: num(value["marks"], 0),
    firstSeenAt: num(value["firstSeenAt"], 0),
    lastAttemptAt: nullableNum(value["lastAttemptAt"]),
    attemptCount: num(value["attemptCount"], 0),
    firstVerdict: verdictOf(value["firstVerdict"]),
  };
  return question;
}

function readRow(value: unknown): RowRecord | null {
  if (!isRecord(value)) return null;

  const topicSlug = nullableStr(value["topicSlug"]);
  const goId = nullableStr(value["goId"]);
  const ordinal = nullableNum(value["ordinal"]);
  if (!topicSlug || !goId || ordinal === null) return null;

  const row: RowRecord = {
    topicSlug,
    ordinal,
    goId,
    examSlug: nullableStr(value["examSlug"]),
    type: typeOf(value["type"]),
    marks: num(value["marks"], 0),
    relatedSlugs: strings(value["relatedSlugs"]),
    lastSeenAt: num(value["lastSeenAt"], 0),
  };
  return row;
}

function readTopic(value: unknown): TopicRecord | null {
  if (!isRecord(value)) return null;
  const slug = nullableStr(value["slug"]);
  if (!slug) return null;

  const topic: TopicRecord = {
    ...BLANK_TOPIC,
    slug,
    title: nullableStr(value["title"]),
    parentSlug: nullableStr(value["parentSlug"]),
    totalFromSite: nullableNum(value["totalFromSite"]),
    totalMarksFromSite: nullableNum(value["totalMarksFromSite"]),
    lastAnsweredOrdinal: nullableNum(value["lastAnsweredOrdinal"]),
    lastVisitedPage: nullableNum(value["lastVisitedPage"]),
    indexedPages: Array.isArray(value["indexedPages"])
      ? value["indexedPages"].filter((page): page is number => typeof page === "number")
      : [],
    updatedAt: num(value["updatedAt"], 0),
  };
  return topic;
}

/** Reads a table, reporting how many of its entries were unusable. */
function readTable<T>(value: unknown, read: (entry: unknown) => T | null): [T[], number] {
  const entries = Array.isArray(value) ? value : [];
  const parsed = R.filter(R.isNotNil, entries.map(read));
  return [parsed, entries.length - parsed.length];
}

/** The earlier of two timestamps, treating 0 as "not recorded" rather than 1970. */
function earliest(a: number, b: number): number {
  if (a === 0) return b;
  if (b === 0) return a;
  return Math.min(a, b);
}

/** The highest of the known values, or null when neither side has one. */
function highest(values: (number | null)[]): number | null {
  const known = R.filter(R.isNotNil, values);
  return known.length === 0 ? null : Math.max(...known);
}

function reject(rejection: BackupRejection, detail: string): BackupRead {
  const refused: BackupRead = { ok: false, rejection, detail };
  return refused;
}

/**
 * Turns whatever was in the file into a backup, or refuses it.
 *
 * Refusal is whole-file and happens before a single write: a file that is not
 * ours, or one written by a version whose records we cannot be sure we
 * understand, is not something to make a best effort with.
 */
export function readBackup(value: unknown): BackupRead {
  if (!isRecord(value)) {
    return reject(BackupRejection.NotJson, "the file did not contain a JSON object");
  }
  if (value["format"] !== BACKUP_FORMAT) {
    return reject(BackupRejection.NotABackup, "the file is not a tracker backup");
  }

  const version = num(value["version"], 0);
  if (version > BACKUP_VERSION) {
    return reject(
      BackupRejection.FutureVersion,
      `the file is version ${version}; this build reads up to ${BACKUP_VERSION}`,
    );
  }

  const [questions, badQuestions] = readTable(value["questions"], readQuestion);
  const [attempts, badAttempts] = readTable(value["attempts"], readAttempt);
  const [rows, badRows] = readTable(value["rows"], readRow);
  const [topics, badTopics] = readTable(value["topics"], readTopic);

  const backup: Backup = {
    format: BACKUP_FORMAT,
    version,
    schemaVersion: num(value["schemaVersion"], 0),
    exportedAt: num(value["exportedAt"], 0),
    questions,
    attempts,
    rows,
    topics,
  };

  const accepted: BackupRead = {
    ok: true,
    backup,
    skipped: badQuestions + badAttempts + badRows + badTopics,
  };
  return accepted;
}

/**
 * Merges one question's non-derived state.
 *
 * Only two fields survive the trip. `starred` is the one thing in the database
 * no replay of the answer log can reproduce, and it is unioned rather than
 * overwritten: getting back a star you had removed costs one click, while
 * losing one you set is silent and unnoticeable. `firstSeenAt` takes the
 * earlier of the two, since both sides genuinely saw the question.
 *
 * Everything else the file claims is ignored — `rebuildQuestionProjections()`
 * recomputes it from the merged log a moment later, and that is the only source
 * that can account for both databases' attempts at once.
 */
export function mergeQuestion(existing: QuestionRecord, incoming: QuestionRecord): QuestionRecord {
  const merged: QuestionRecord = {
    ...existing,
    starred: existing.starred || incoming.starred,
    firstSeenAt: earliest(existing.firstSeenAt, incoming.firstSeenAt),
  };
  return merged;
}

/**
 * Whether an imported row should replace the one already stored.
 *
 * `rows` is a rebuildable cache keyed off `lastSeenAt`, so the fresher sighting
 * wins outright. An equal timestamp keeps what is stored: nothing to gain from
 * a write, and the local copy is the one the rest of the database was built
 * against.
 */
export function rowIsFresher(incoming: RowRecord, existing: RowRecord | undefined): boolean {
  return existing === undefined || incoming.lastSeenAt > existing.lastSeenAt;
}

/**
 * Merges a topic field by field rather than picking a winning record.
 *
 * The two sides know different things and neither is wholly newer. One machine
 * may have crawled pages 1–40 while the other did 41–90, so `indexedPages` is
 * unioned; `lastAnsweredOrdinal` is a high-water mark, so it maxes. Only the
 * fields that describe the topic as the site presents it — its name, its place
 * in the hierarchy, its totals — follow whichever record was written later, and
 * even then a known value is never replaced by a null.
 */
export function mergeTopic(existing: TopicRecord, incoming: TopicRecord): TopicRecord {
  const newer = incoming.updatedAt > existing.updatedAt ? incoming : existing;
  const older = newer === incoming ? existing : incoming;
  const settled = <K extends keyof TopicRecord>(key: K): TopicRecord[K] =>
    newer[key] ?? older[key];

  const merged: TopicRecord = {
    slug: existing.slug,
    title: settled("title"),
    parentSlug: settled("parentSlug"),
    totalFromSite: settled("totalFromSite"),
    totalMarksFromSite: settled("totalMarksFromSite"),
    lastAnsweredOrdinal: highest([
      existing.lastAnsweredOrdinal,
      incoming.lastAnsweredOrdinal,
    ]),
    lastVisitedPage: settled("lastVisitedPage"),
    indexedPages: R.sort(R.subtract, R.union(existing.indexedPages, incoming.indexedPages)),
    updatedAt: Math.max(existing.updatedAt, incoming.updatedAt),
  };
  return merged;
}

/** "practice-paper-tracker-2026-08-16.json" — sorts chronologically in a folder. */
export function backupFilename(exportedAt: number): string {
  const day = new Date(exportedAt).toISOString().slice(0, 10);
  return `${BACKUP_FILE_PREFIX}-${day}.json`;
}
