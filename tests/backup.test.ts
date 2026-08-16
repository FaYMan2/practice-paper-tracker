import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TrackerDB, setDb } from "../utils/db";
import { exportBackup, importBackup } from "../services/messages/backup";
import { dashboardSummaries } from "../services/messages/summaries";
import { observePage } from "../services/messages/pages";
import { recordAttempt } from "../services/messages/attempts";
import { setStar } from "../services/messages/stars";
import { buildTopicSummary } from "../utils/summary";
import { BACKUP_FORMAT, BACKUP_VERSION, BackupRejection, backupFilename } from "../utils/backup";
import type { Backup } from "../utils/backup";
import type { AttemptInput, ObservedRow, RowRecord, TopicRecord } from "../types";

let db: TrackerDB;
let dbCount = 0;

function observed(ordinal: number, goId: string, relatedSlugs: string[] = []): ObservedRow {
  const row: ObservedRow = {
    ordinal,
    goId,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 2,
    relatedSlugs,
  };
  return row;
}

function attempt(goId: string, overrides: Partial<AttemptInput> = {}): AttemptInput {
  const base: AttemptInput = {
    eventId: `${goId}:load-1`,
    goId,
    verdict: "correct",
    choices: [{ kind: "option", label: "C", correct: true, ts: 1_000 }],
    ts: 1_000,
    topicSlug: "stack",
    ordinal: 1,
    pageNo: 1,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 2,
    pageLoadId: "load-1",
  };
  return { ...base, ...overrides };
}

/** One page indexed, one question answered, one starred. */
async function recordSomeWork(): Promise<void> {
  await observePage({
    topicSlug: "stack",
    title: "Stack",
    pageNo: 1,
    totalFromSite: 34,
    totalMarksFromSite: 44,
    rows: [observed(1, "523106", ["data-structure"]), observed(2, "49487")],
  });
  await recordAttempt(attempt("523106"));
  await setStar("49487", true);
}

/** A second, empty database, standing in for another machine or a wiped profile. */
async function freshDatabase(): Promise<TrackerDB> {
  const next = new TrackerDB(`test-backup-target-${dbCount++}`);
  await next.open();
  setDb(next);
  return next;
}

beforeEach(async () => {
  fakeBrowser.reset();
  db = new TrackerDB(`test-backup-${dbCount++}`);
  await db.open();
  setDb(db);
});

afterEach(() => {
  setDb(null);
});

describe("export", () => {
  it("carries every table worth restoring", async () => {
    await recordSomeWork();
    const backup = await exportBackup(db);

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.attempts).toHaveLength(1);
    expect(backup.rows).toHaveLength(2);
    expect(backup.topics.map((topic) => topic.slug)).toContain("stack");
    expect(backup.questions.find((question) => question.goId === "49487")?.starred).toBe(true);
  });

  it("leaves the auto-increment key behind", async () => {
    // That id numbers a row in one database. Carried into another it would
    // land on top of somebody else's attempt.
    await recordSomeWork();
    const backup = await exportBackup(db);

    expect(backup.attempts[0]).not.toHaveProperty("id");
    // The identity that does travel.
    expect(backup.attempts[0]?.eventId).toBe("523106:load-1");
  });

  it("names the file by the day it was written", () => {
    expect(backupFilename(Date.UTC(2026, 7, 16, 9, 30))).toBe(
      "practice-paper-tracker-2026-08-16.json",
    );
  });
});

describe("import into an empty database", () => {
  it("puts the answers, the counts and the stars back", async () => {
    await recordSomeWork();
    const before = await buildTopicSummary("stack", db);
    const backup = await exportBackup(db);

    const restored = await freshDatabase();
    const outcome = await importBackup(backup, restored);

    expect(outcome.ok).toBe(true);
    expect(await buildTopicSummary("stack", restored)).toEqual(before);
    expect((await restored.questions.get("49487"))?.starred).toBe(true);
    // The chosen option is the part no rebuild could reconstruct.
    expect((await restored.attempts.toArray())[0]?.choices[0]).toMatchObject({ label: "C" });
  });

  it("reports what it merged", async () => {
    await recordSomeWork();
    const backup = await exportBackup(db);
    const restored = await freshDatabase();

    const outcome = await importBackup(backup, restored);

    expect(outcome.ok && outcome.report).toMatchObject({
      attemptsAdded: 1,
      attemptsAlreadyHeld: 0,
      rowsTouched: 2,
      topicsTouched: 1,
      skipped: 0,
    });
  });
});

describe("import into a database that has kept being used", () => {
  it("changes nothing when the same file is imported twice", async () => {
    // The property that makes importing safe to try: `eventId` is the identity
    // of an answer across databases, not the row it happens to occupy.
    await recordSomeWork();
    const backup = await exportBackup(db);

    await importBackup(backup, db);
    const second = await importBackup(backup, db);

    expect(await db.attempts.count()).toBe(1);
    expect(second.ok && second.report.attemptsAdded).toBe(0);
    expect(second.ok && second.report.attemptsAlreadyHeld).toBe(1);
  });

  it("keeps both sides' answers rather than choosing one", async () => {
    await recordSomeWork();
    const backup = await exportBackup(db);

    // Meanwhile, on this machine, the same question was answered again.
    await recordAttempt(
      attempt("523106", {
        eventId: "523106:load-9",
        pageLoadId: "load-9",
        ts: 9_000,
        verdict: "wrong",
      }),
    );
    await importBackup(backup, db);

    expect(await db.attempts.count()).toBe(2);
    expect(await db.questions.get("523106")).toMatchObject({ attemptCount: 2 });
  });

  it("recomputes status from the merged log rather than believing the file", async () => {
    // 523106 was answered correctly here. The file was written on another
    // machine where it was answered again, later, and got wrong — and the file
    // carries a `questions` record from *before* that, still saying correct.
    //
    // Nothing but a rebuild over the combined log can get this right: neither
    // side's cached projection has seen both answers.
    await recordSomeWork();
    await importBackup(
      backupOf({
        attempts: [
          attempt("523106", {
            eventId: "523106:elsewhere",
            pageLoadId: "elsewhere",
            ts: 9_000,
            verdict: "wrong",
          }),
        ],
        questions: [
          {
            goId: "523106",
            status: "correct",
            starred: false,
            type: "MCQ",
            marks: 2,
            firstSeenAt: 1,
            lastAttemptAt: 1_000,
            attemptCount: 1,
            firstVerdict: "correct",
          },
        ],
      }),
      db,
    );

    expect(await db.questions.get("523106")).toMatchObject({
      status: "wrong",
      attemptCount: 2,
      firstVerdict: "correct",
    });
  });

  it("does not roll a row back to an older sighting of it", async () => {
    const stale: RowRecord = {
      topicSlug: "stack",
      ordinal: 1,
      goId: "523106",
      examSlug: null,
      type: "MCQ",
      marks: 1,
      relatedSlugs: [],
      lastSeenAt: 1,
    };
    await recordSomeWork();
    const backup = await exportBackup(db);
    backup.rows = [stale];

    await importBackup(backup, db);

    // The 2-mark row this database saw last week, not the 1-mark row the file
    // remembers from a year ago.
    expect((await db.rows.get(["stack", 1]))?.marks).toBe(2);
  });

  it("keeps a star this database set and the file knows nothing about", async () => {
    await recordSomeWork();
    const backup = await exportBackup(db);

    await setStar("523106", true);
    await importBackup(backup, db);

    expect((await db.questions.get("523106"))?.starred).toBe(true);
  });

  it("merges what each side knows about a topic", async () => {
    // Two machines crawled different halves of the same topic.
    await db.topics.put({
      slug: "stack",
      title: "Stack",
      parentSlug: "data-structure",
      totalFromSite: 34,
      totalMarksFromSite: 44,
      lastAnsweredOrdinal: 12,
      lastVisitedPage: 3,
      indexedPages: [1, 2, 3],
      updatedAt: 5_000,
    });
    const incoming: TopicRecord = {
      slug: "stack",
      title: "Stack",
      parentSlug: "data-structure",
      totalFromSite: 34,
      totalMarksFromSite: 44,
      lastAnsweredOrdinal: 4,
      lastVisitedPage: 7,
      indexedPages: [6, 7],
      updatedAt: 1_000,
    };
    await importBackup(backupOf({ topics: [incoming] }), db);

    const topic = await db.topics.get("stack");
    expect(topic?.indexedPages).toEqual([1, 2, 3, 6, 7]);
    // A high-water mark, so the higher of the two survives regardless of which
    // record was written later.
    expect(topic?.lastAnsweredOrdinal).toBe(12);
  });
});

/** A backup holding only what a test cares about. */
function backupOf(parts: Partial<Backup>): Backup {
  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: 3,
    exportedAt: 1_000,
    questions: [],
    attempts: [],
    rows: [],
    topics: [],
    ...parts,
  };
  return backup;
}

describe("a file that cannot be trusted", () => {
  it("refuses anything that is not one of ours, before writing", async () => {
    await recordSomeWork();
    const outcome = await importBackup({ hello: true }, db);

    expect(outcome).toMatchObject({ ok: false, rejection: BackupRejection.NotABackup });
    expect(await db.attempts.count()).toBe(1);
  });

  it("refuses a file from a newer version rather than guessing at it", async () => {
    const outcome = await importBackup(
      backupOf({ version: BACKUP_VERSION + 1 }),
      db,
    );

    expect(outcome).toMatchObject({ ok: false, rejection: BackupRejection.FutureVersion });
  });

  it("drops an unreadable record rather than the whole file", async () => {
    // One corrupt line must not cost the user the other four thousand answers.
    const outcome = await importBackup(
      backupOf({
        attempts: [attempt("523106"), { goId: "nope" } as unknown as AttemptInput],
      }),
      db,
    );

    expect(outcome.ok && outcome.report).toMatchObject({ attemptsAdded: 1, skipped: 1 });
    expect(await db.attempts.count()).toBe(1);
  });
});

/**
 * `questions` is a cache of the attempt log. Phase 1 was built on the promise
 * that it can always be rebuilt from the log, and this is that promise checked
 * rather than assumed.
 */
describe("drift between the cache and the log", () => {
  it("repairs a question whose stored status no longer matches its answers", async () => {
    await recordSomeWork();
    // As if a write had been lost half-way: the answer is in the log, but the
    // projection of it says the question was never attempted.
    await db.questions.update("523106", {
      status: "unattempted",
      attemptCount: 0,
      firstVerdict: null,
      lastAttemptAt: null,
    });

    const payload = await dashboardSummaries();

    expect(payload.repaired).toBe(1);
    expect((await db.questions.get("523106"))?.status).toBe("correct");
    expect(payload.summaries["stack"]?.correctRows).toBe(1);
  });

  it("reports nothing and writes nothing when the cache is right", async () => {
    await recordSomeWork();

    expect((await dashboardSummaries()).repaired).toBe(0);
  });

  it("leaves the star alone while putting the rest right", async () => {
    // The one field no replay of the log can reproduce.
    await recordSomeWork();
    await setStar("523106", true);
    await db.questions.update("523106", { status: "unattempted", attemptCount: 0 });

    await dashboardSummaries();

    expect(await db.questions.get("523106")).toMatchObject({
      status: "correct",
      starred: true,
    });
  });
});
