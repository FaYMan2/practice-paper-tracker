import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TrackerDB, setDb } from "../utils/db";
import { observePage } from "../services/messages/pages";
import { recordAttempt } from "../services/messages/attempts";
import { setStar } from "../services/messages/stars";
import { provisionalKey } from "../utils/url";
import type { AttemptInput, ObservedRow } from "../types";

let db: TrackerDB;
let dbCount = 0;

const PROVISIONAL = provisionalKey("stack", 3);
const REAL = "49487";

function observed(goId: string): ObservedRow {
  const row: ObservedRow = {
    ordinal: 3,
    goId,
    examSlug: "gate-cse-2026-set-2",
    type: "MCQ",
    marks: 2,
    relatedSlugs: [],
  };
  return row;
}

function page(goId: string) {
  return {
    topicSlug: "stack",
    title: "Stack",
    pageNo: 1,
    totalFromSite: 34,
    totalMarksFromSite: 44,
    rows: [observed(goId)],
  };
}

function attempt(goId: string, overrides: Partial<AttemptInput> = {}): AttemptInput {
  const base: AttemptInput = {
    eventId: `${goId}:load-1`,
    goId,
    verdict: "wrong",
    choices: [{ kind: "option", label: "B", correct: false, ts: 1_000 }],
    ts: 1_000,
    topicSlug: "stack",
    ordinal: 3,
    pageNo: 1,
    examSlug: "gate-cse-2026-set-2",
    type: "MCQ",
    marks: 2,
    pageLoadId: "load-1",
    provisional: true,
  };
  return { ...base, ...overrides };
}

/** A question answered while the site printed no GateOverflow link for it. */
async function answerWithoutAnAnchor(): Promise<void> {
  await observePage(page(PROVISIONAL));
  await recordAttempt(attempt(PROVISIONAL));
}

beforeEach(async () => {
  fakeBrowser.reset();
  db = new TrackerDB(`test-reconcile-${dbCount++}`);
  await db.open();
  setDb(db);
});

afterEach(() => {
  setDb(null);
});

describe("provisional reconciliation", () => {
  it("moves the attempt history onto the real question id", async () => {
    await answerWithoutAnAnchor();
    await observePage(page(REAL));

    const attempts = await db.attempts.toArray();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ goId: REAL, verdict: "wrong", provisional: false });
    // The chosen option is the part that cannot be recovered any other way.
    expect(attempts[0]?.choices[0]).toMatchObject({ label: "B" });
  });

  it("leaves nothing behind under the placeholder key", async () => {
    await answerWithoutAnAnchor();
    await observePage(page(REAL));

    expect(await db.questions.get(PROVISIONAL)).toBeUndefined();
    expect(await db.attempts.where("goId").equals(PROVISIONAL).count()).toBe(0);
    expect((await db.rows.get(["stack", 3]))?.goId).toBe(REAL);
  });

  it("carries the projection across, so the question still reads as attempted", async () => {
    await answerWithoutAnAnchor();
    await observePage(page(REAL));

    expect(await db.questions.get(REAL)).toMatchObject({
      status: "wrong",
      attemptCount: 1,
      firstVerdict: "wrong",
    });
  });

  it("keeps a star set while the question was provisional", async () => {
    await answerWithoutAnAnchor();
    await setStar(PROVISIONAL, true);
    await observePage(page(REAL));

    expect((await db.questions.get(REAL))?.starred).toBe(true);
  });

  it("merges into a history the real id already had elsewhere", async () => {
    // The same question, answered under another topic where the anchor was
    // printed. Neither history may be lost.
    await db.questions.put({
      goId: REAL,
      status: "correct",
      starred: false,
      type: "MCQ",
      marks: 2,
      firstSeenAt: 500,
      lastAttemptAt: 2_000,
      attemptCount: 1,
      firstVerdict: "correct",
    });
    await db.attempts.add(
      attempt(REAL, { eventId: `${REAL}:other`, pageLoadId: "other", ts: 2_000, verdict: "correct" }),
    );

    await answerWithoutAnAnchor();
    await observePage(page(REAL));

    expect(await db.attempts.where("goId").equals(REAL).count()).toBe(2);
    expect(await db.questions.get(REAL)).toMatchObject({
      attemptCount: 2,
      // The later attempt is the one that decides the current state.
      status: "correct",
      firstSeenAt: 500,
    });
  });

  it("is idempotent, so a second visit changes nothing", async () => {
    await answerWithoutAnAnchor();
    await observePage(page(REAL));
    await observePage(page(REAL));
    await observePage(page(REAL));

    expect(await db.attempts.count()).toBe(1);
    expect(await db.questions.get(REAL)).toMatchObject({ attemptCount: 1 });
  });

  it("leaves an ordinary question alone", async () => {
    await observePage(page(REAL));
    await recordAttempt(attempt(REAL, { provisional: false }));
    await observePage(page(REAL));

    expect(await db.attempts.count()).toBe(1);
    expect(await db.questions.count()).toBe(1);
  });
});
