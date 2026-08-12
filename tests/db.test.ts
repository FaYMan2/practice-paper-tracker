import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { questionMarks, rebuildQuestionProjections, TrackerDB } from "../utils/db";
import type { AttemptInput, QuestionRecord } from "../types";

let db: TrackerDB;
let dbCount = 0;

function attempt(overrides: Partial<AttemptInput> & Pick<AttemptInput, "goId">): AttemptInput {
  const base: AttemptInput = {
    eventId: `${overrides.goId}:load-1`,
    goId: overrides.goId,
    verdict: "correct",
    choices: [],
    ts: 1_000,
    topicSlug: "stack",
    ordinal: 1,
    pageNo: 1,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 1,
    pageLoadId: "load-1",
  };
  return { ...base, ...overrides };
}

beforeEach(async () => {
  // A fresh database per test; Dexie caches by name.
  db = new TrackerDB(`test-${dbCount++}`);
  await db.open();
});

describe("schema", () => {
  it("opens with every store the app expects", () => {
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      "attempts",
      "diagnostics",
      "questions",
      "rows",
      "topics",
    ]);
  });

  it("keys rows by topic and ordinal together", async () => {
    // One question occupies several rows across topics, so the row key cannot
    // be the question id.
    await db.rows.bulkPut([
      { topicSlug: "stack", ordinal: 11, goId: "49487", examSlug: null, type: "MCQ", marks: 1, relatedSlugs: [], lastSeenAt: 1 },
      { topicSlug: "stack", ordinal: 17, goId: "49487", examSlug: null, type: "MCQ", marks: 1, relatedSlugs: [], lastSeenAt: 1 },
      { topicSlug: "data-structure", ordinal: 3, goId: "49487", examSlug: null, type: "MCQ", marks: 1, relatedSlugs: [], lastSeenAt: 1 },
    ]);
    expect(await db.rows.count()).toBe(3);
    expect(await db.rows.where("goId").equals("49487").count()).toBe(3);
  });
});

describe("append-only attempts", () => {
  it("rejects a replay of the same page load", async () => {
    // This is what makes a retry after a lost acknowledgement safe.
    await db.attempts.add(attempt({ goId: "523106" }));
    await expect(db.attempts.add(attempt({ goId: "523106" }))).rejects.toThrow();
    expect(await db.attempts.count()).toBe(1);
  });

  it("appends when the same question is answered in a later page load", async () => {
    await db.attempts.add(
      attempt({ goId: "523106", verdict: "wrong", eventId: "523106:load-1", ts: 1_000 }),
    );
    await db.attempts.add(
      attempt({
        goId: "523106",
        verdict: "correct",
        eventId: "523106:load-2",
        pageLoadId: "load-2",
        ts: 2_000,
      }),
    );

    const stored = await db.attempts.where("goId").equals("523106").sortBy("ts");
    expect(stored.map((row) => row.verdict)).toEqual(["wrong", "correct"]);
  });

  it("keeps the options chosen on each separate attempt", async () => {
    await db.attempts.add(
      attempt({
        goId: "1035",
        verdict: "wrong",
        eventId: "1035:load-1",
        ts: 1_000,
        choices: [{ kind: "option", label: "C", correct: false, ts: 1_000 }],
      }),
    );
    await db.attempts.add(
      attempt({
        goId: "1035",
        verdict: "correct",
        eventId: "1035:load-2",
        ts: 2_000,
        choices: [{ kind: "option", label: "A", correct: true, ts: 2_000 }],
      }),
    );

    const stored = await db.attempts.where("goId").equals("1035").sortBy("ts");
    // The wrong answer the user originally picked is still there — that is the
    // whole point of the log, and spaced repetition depends on it later.
    expect(stored.map((row) => row.choices[0]?.label)).toEqual(["C", "A"]);
  });
});

describe("rebuildQuestionProjections", () => {
  it("reconstructs status from the log after the cache is destroyed", async () => {
    await db.attempts.bulkAdd([
      attempt({ goId: "a", verdict: "wrong", eventId: "a:1", ts: 1_000 }),
      attempt({ goId: "a", verdict: "correct", eventId: "a:2", ts: 2_000 }),
      attempt({ goId: "b", verdict: "wrong", eventId: "b:1", ts: 3_000 }),
    ]);
    await rebuildQuestionProjections(db);

    const before = await db.questions.orderBy("goId").toArray();
    await db.questions.clear();
    await rebuildQuestionProjections(db);
    const after = await db.questions.orderBy("goId").toArray();

    // If any state lived only as a mutable field on `questions`, this is where
    // it would show up as a difference.
    expect(after).toEqual(before);
    expect(after.map((q) => [q.goId, q.status, q.attemptCount, q.firstVerdict])).toEqual([
      ["a", "correct", 2, "wrong"],
      ["b", "wrong", 1, "wrong"],
    ]);
  });

  it("keeps starred, which is user curation and not derived", async () => {
    await db.attempts.add(attempt({ goId: "a", eventId: "a:1" }));
    await rebuildQuestionProjections(db);
    await db.questions.update("a", { starred: true });

    await rebuildQuestionProjections(db);
    expect((await db.questions.get("a"))?.starred).toBe(true);
  });

  it("resets a question whose attempts have been removed", async () => {
    await db.attempts.add(attempt({ goId: "a", eventId: "a:1" }));
    await rebuildQuestionProjections(db);
    await db.attempts.clear();
    await rebuildQuestionProjections(db);

    expect(await db.questions.get("a")).toMatchObject({
      status: "unattempted",
      attemptCount: 0,
      firstVerdict: null,
      lastAttemptAt: null,
    });
  });

  it("leaves a seen-but-unanswered question alone", async () => {
    const seen: QuestionRecord = {
      goId: "unseen",
      status: "unattempted",
      starred: false,
      type: "MCQ",
      marks: 1,
      firstSeenAt: 500,
      lastAttemptAt: null,
      attemptCount: 0,
      firstVerdict: null,
    };
    await db.questions.put(seen);
    await rebuildQuestionProjections(db);

    expect(await db.questions.get("unseen")).toEqual(seen);
  });
});

describe("questionMarks", () => {
  it("returns only questions that have been answered", async () => {
    await db.attempts.bulkAdd([
      attempt({ goId: "a", verdict: "correct", eventId: "a:1" }),
      attempt({ goId: "b", verdict: "wrong", eventId: "b:1" }),
    ]);
    await rebuildQuestionProjections(db);
    await db.questions.put({
      goId: "c",
      status: "unattempted",
      starred: false,
      type: "MCQ",
      marks: 1,
      firstSeenAt: 1,
      lastAttemptAt: null,
      attemptCount: 0,
      firstVerdict: null,
    });

    const marks = await questionMarks(["a", "b", "c"], db);
    expect([...marks.keys()].sort()).toEqual(["a", "b"]);
    expect(marks.get("a")).toMatchObject({ status: "correct", attemptCount: 1 });
  });

  it("reports every topic a question was answered under", async () => {
    // The cross-topic case: one question, answered in two different topics.
    await db.attempts.bulkAdd([
      attempt({ goId: "523093", eventId: "523093:1", topicSlug: "probability-theory" }),
      attempt({
        goId: "523093",
        eventId: "523093:2",
        topicSlug: "discrete-mathematics",
        ts: 2_000,
      }),
    ]);
    await rebuildQuestionProjections(db);

    const mark = (await questionMarks(["523093"], db)).get("523093");
    expect(mark?.answeredIn.sort()).toEqual(["discrete-mathematics", "probability-theory"]);
    expect(mark?.attemptCount).toBe(2);
  });

  it("names the other topic when a question was answered only elsewhere", async () => {
    await db.attempts.add(
      attempt({ goId: "523142", eventId: "523142:1", topicSlug: "probability-theory" }),
    );
    await rebuildQuestionProjections(db);

    const mark = (await questionMarks(["523142"], db)).get("523142");
    // Viewed under discrete-mathematics, this set excludes the current topic,
    // which is what makes it render as "solved elsewhere".
    expect(mark?.answeredIn).toEqual(["probability-theory"]);
  });

  it("handles an empty request without touching the database", async () => {
    expect(await questionMarks([], db)).toEqual(new Map());
  });
});
