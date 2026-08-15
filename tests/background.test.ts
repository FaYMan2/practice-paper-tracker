import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TrackerDB, setDb } from "../utils/db";
import { topicDetail } from "../services/messages/details";
import { observePage } from "../services/messages/pages";
import { recordAttempt } from "../services/messages/attempts";
import { buildAllSummaries, buildTopicSummary } from "../utils/summary";
import { recordHierarchy } from "../services/messages/hierarchy";
import { setStar } from "../services/messages/stars";
import { topicPages } from "../services/messages/coverage";
import { rebuildQuestionProjections, questionMarks } from "../utils/db";
import { getSummaries, getSummary, watchSummaries } from "../utils/summary/mirror";
import { refreshAllSummaries } from "../utils/summary";
import type {
  AttemptInput,
  ObservedRow,
  QuestionRecord,
  RowRecord,
  TopicHierarchyEntry,
} from "../types";

let db: TrackerDB;
let dbCount = 0;

function row(ordinal: number, goId: string, overrides: Partial<RowRecord> = {}): RowRecord {
  const base: RowRecord = {
    topicSlug: "stack",
    ordinal,
    goId,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 1,
    relatedSlugs: [],
    lastSeenAt: 1_000,
  };
  return { ...base, ...overrides };
}

function question(goId: string, overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  const base: QuestionRecord = {
    goId,
    status: "correct",
    starred: false,
    type: "MCQ",
    marks: 1,
    firstSeenAt: 1_000,
    lastAttemptAt: 2_000,
    attemptCount: 1,
    firstVerdict: "correct",
  };
  return { ...base, ...overrides };
}

function entry(
  slug: string,
  parentSlug: string | null,
  title: string | null = null,
): TopicHierarchyEntry {
  const built: TopicHierarchyEntry = { slug, parentSlug, title };
  return built;
}

beforeEach(async () => {
  fakeBrowser.reset();
  db = new TrackerDB(`test-services-${dbCount++}`);
  await db.open();
  setDb(db);
});

afterEach(() => {
  setDb(null);
});

describe("recordHierarchy", () => {
  it("creates a topic row for every topic on the site", async () => {
    // One visit to the index page is what makes the dashboard show what is
    // left, not only what has been started.
    await recordHierarchy([
      entry("data-structure", null, "Data Structure"),
      entry("stack", "data-structure", "Stack"),
    ]);

    expect(await db.topics.count()).toBe(2);
    expect((await db.topics.get("stack"))?.parentSlug).toBe("data-structure");
  });

  it("prefers the index page's short name to the page heading", async () => {
    // Every topic page heads itself with the same SEO boilerplate; the index
    // page's link text is the name a person would use.
    await db.topics.add({
      slug: "stack",
      title: "Stack GATE CSE Previous Year Questions",
      parentSlug: null,
      totalFromSite: 34,
      totalMarksFromSite: 44,
      lastAnsweredOrdinal: null,
      lastVisitedPage: null,
      indexedPages: [],
      updatedAt: 1,
    });

    await recordHierarchy([entry("stack", "data-structure", "Stack")]);
    const topic = await db.topics.get("stack");

    expect(topic?.title).toBe("Stack");
    expect(topic?.parentSlug).toBe("data-structure");
    // Patching one field must not wipe what indexing recorded.
    expect(topic?.totalFromSite).toBe(34);
  });

  it("mirrors the untouched topics out so the dashboard can list them", async () => {
    await recordHierarchy([entry("stack", "data-structure", "Stack")]);
    const summaries = await getSummaries();

    expect(summaries["stack"]?.parentSlug).toBe("data-structure");
    expect(summaries["stack"]?.solvedRows).toBe(0);
  });
});

describe("topicDetail", () => {
  it("joins each placement to what the attempt log knows", async () => {
    await db.rows.bulkPut([row(2, "49487"), row(1, "523106")]);
    await db.questions.bulkPut([question("523106", { attemptCount: 3 })]);

    const detail = await topicDetail("stack");

    expect(detail.rows.map((entry) => entry.ordinal)).toEqual([1, 2]);
    expect(detail.rows[0]).toMatchObject({ status: "correct", attemptCount: 3 });
    // Never seen, so never attempted — not an absence to hide.
    expect(detail.rows[1]).toMatchObject({ status: "unattempted", attemptCount: 0 });
  });

  it("carries one question's status onto every row it occupies", async () => {
    // GateOverflow 49487 fills three rows in `stack`; solving it once solves
    // all three, which is why the numerator counts rows.
    await db.rows.bulkPut([row(11, "49487"), row(17, "49487"), row(23, "49487")]);
    await db.questions.put(question("49487"));

    const detail = await topicDetail("stack");

    expect(detail.rows.every((entry) => entry.status === "correct")).toBe(true);
  });

  it("returns nothing for a topic with no pages visited", async () => {
    expect(await topicDetail("queue")).toEqual({ slug: "queue", rows: [] });
  });

  it("flags a row whose identity had to be invented", async () => {
    await db.rows.put(row(4, "pp:stack:4"));

    expect((await topicDetail("stack")).rows[0]?.provisional).toBe(true);
  });
});

/**
 * The site labels each question with the other topic it is filed under, which
 * is the only reason a topic can show progress before its own pages have ever
 * been opened. Everything below is that path, end to end.
 */
describe("cross-topic attribution", () => {
  function observed(ordinal: number, goId: string, relatedSlugs: string[]): ObservedRow {
    const row: ObservedRow = {
      ordinal,
      goId,
      examSlug: "gate-cse-2026-set-2",
      type: "MCQ",
      marks: 2,
      relatedSlugs,
    };
    return row;
  }

  function attempt(goId: string, ordinal: number): AttemptInput {
    const input: AttemptInput = {
      eventId: `${goId}:load-1`,
      goId,
      verdict: "correct",
      choices: [],
      ts: 3_000,
      topicSlug: "discrete-mathematics",
      ordinal,
      pageNo: 1,
      examSlug: "gate-cse-2026-set-2",
      type: "MCQ",
      marks: 2,
      pageLoadId: "load-1",
    };
    return input;
  }

  /** One page of Discrete Mathematics, two of whose questions are probability. */
  async function solveOnTheParentPage(): Promise<void> {
    await observePage({
      topicSlug: "discrete-mathematics",
      title: "Discrete Mathematics",
      pageNo: 1,
      totalFromSite: 465,
      totalMarksFromSite: 587,
      rows: [
        observed(1, "523093", ["functions"]),
        observed(2, "523142", ["probability-theory"]),
        observed(3, "523150", ["probability-theory"]),
      ],
    });
    await recordAttempt(attempt("523142", 2));
  }

  it("credits a topic for a question answered on another topic's page", async () => {
    await solveOnTheParentPage();
    const summary = await buildTopicSummary("probability-theory", db);

    expect(summary?.solvedRows).toBe(1);
    expect(summary?.correctRows).toBe(1);
    // Both probability questions are known, even though only one was answered.
    expect(summary?.indexedRows).toBe(2);
  });

  it("offers no resume target from a borrowed row", async () => {
    // Ordinal 2 numbers a position in Discrete Mathematics, so following it
    // into Probability Theory would open the wrong page entirely.
    await solveOnTheParentPage();
    const summary = await buildTopicSummary("probability-theory", db);

    expect(summary?.lastAnsweredOrdinal).toBeNull();
    expect(summary?.firstUnattemptedOrdinal).toBeNull();
  });

  it("prefers the topic's own row over a borrowed one for the same question", async () => {
    await solveOnTheParentPage();
    await observePage({
      topicSlug: "probability-theory",
      title: "Probability Theory",
      pageNo: 1,
      totalFromSite: 60,
      totalMarksFromSite: 80,
      rows: [observed(7, "523142", ["discrete-mathematics"])],
    });

    const summary = await buildTopicSummary("probability-theory", db);

    // Two rows, not three: the borrowed copy of 523142 gives way to the real one.
    expect(summary?.indexedRows).toBe(2);
    expect(summary?.solvedRows).toBe(1);
    // And now that the question has a real position, resume works.
    expect(summary?.lastAnsweredOrdinal).toBe(7);
  });

  it("lists a borrowed question against the page it was actually seen on", async () => {
    await solveOnTheParentPage();
    const detail = await topicDetail("probability-theory");

    expect(detail.rows.map((row) => row.goId)).toEqual(["523142", "523150"]);
    expect(detail.rows[0]?.topicSlug).toBe("discrete-mathematics");
  });
});

/**
 * The mirror is what the injected UI paints from, so a topic left out of a
 * refresh reads zero on the page even though the database knows better.
 */
describe("summary fan-out", () => {
  function observed(ordinal: number, goId: string, relatedSlugs: string[]): ObservedRow {
    const row: ObservedRow = {
      ordinal,
      goId,
      examSlug: "gate-cse-2026-set-2",
      type: "MCQ",
      marks: 2,
      relatedSlugs,
    };
    return row;
  }

  async function indexTheParentPage(): Promise<void> {
    await observePage({
      topicSlug: "discrete-mathematics",
      title: "Discrete Mathematics",
      pageNo: 1,
      totalFromSite: 465,
      totalMarksFromSite: 587,
      rows: [observed(5, "523200", ["propositional-logic"])],
    });
  }

  it("mirrors the child topic when the parent's page is indexed", async () => {
    await indexTheParentPage();

    expect((await getSummary("propositional-logic"))?.indexedRows).toBe(1);
  });

  it("mirrors the child topic when a question is answered on the parent's page", async () => {
    // The bug this exists for: answering a propositional-logic question on the
    // Discrete Mathematics page refreshed only Discrete Mathematics, so
    // Propositional Logic read "not started" until something rebuilt the lot.
    await indexTheParentPage();
    await recordAttempt({
      eventId: "523200:load-9",
      goId: "523200",
      verdict: "correct",
      choices: [],
      ts: 5_000,
      topicSlug: "discrete-mathematics",
      ordinal: 5,
      pageNo: 1,
      examSlug: "gate-cse-2026-set-2",
      type: "MCQ",
      marks: 2,
      pageLoadId: "load-9",
    });

    const child = await getSummary("propositional-logic");
    expect(child?.solvedRows).toBe(1);
    expect(child?.correctRows).toBe(1);
    expect((await getSummary("discrete-mathematics"))?.correctRows).toBe(1);
  });
});

describe("mirror writes", () => {
  it("stays quiet when a recomputed summary is identical", async () => {
    // The dashboard re-reads the database on every mirror change and writes
    // what it computed, so a no-op write would notify it into a loop.
    await recordHierarchy([entry("stack", "data-structure", "Stack")]);

    let notifications = 0;
    const unwatch = watchSummaries(() => {
      notifications += 1;
    });

    await refreshAllSummaries(db);
    await refreshAllSummaries(db);
    unwatch();

    expect(notifications).toBe(0);
  });
});

describe("starring", () => {
  it("stars a question that has never been answered", async () => {
    // Most of the point: flagging something to come back to before attempting it.
    await setStar("523093", true);

    expect((await db.questions.get("523093"))?.starred).toBe(true);
  });

  it("survives a rebuild of everything derived from the attempt log", async () => {
    // `starred` is the one field no amount of replaying answers can reproduce.
    await db.rows.put(row(1, "523093"));
    await db.questions.put(question("523093"));
    await setStar("523093", true);

    await rebuildQuestionProjections(db);

    expect((await db.questions.get("523093"))?.starred).toBe(true);
  });

  it("paints a starred question even with nothing attempted", async () => {
    await setStar("523093", true);
    const marks = await questionMarks(["523093"], db);

    expect(marks.get("523093")).toMatchObject({ starred: true, status: "unattempted" });
  });

  it("unstars", async () => {
    await setStar("523093", true);
    await setStar("523093", false);

    expect((await db.questions.get("523093"))?.starred).toBe(false);
  });
});

describe("topicPages", () => {
  it("reports the pages a crawl can skip", async () => {
    await observePage({
      topicSlug: "stack",
      title: "Stack",
      pageNo: 4,
      totalFromSite: 34,
      totalMarksFromSite: 44,
      rows: [
        { ordinal: 16, goId: "1", examSlug: null, type: "MCQ", marks: 1, relatedSlugs: [] },
      ],
    });

    expect(await topicPages("stack")).toEqual({ slug: "stack", pages: [4] });
  });

  it("reports nothing for a topic never visited", async () => {
    expect((await topicPages("queue")).pages).toEqual([]);
  });
});

describe("summaries over rows written before cross-topic attribution", () => {
  it("computes every topic without tripping over a missing label list", async () => {
    // This is what took the dashboard down: one row from an older version, and
    // the whole rebuild threw before a single topic was computed.
    await observePage({
      topicSlug: "discrete-mathematics",
      title: "Discrete Mathematics",
      pageNo: 1,
      totalFromSite: 465,
      totalMarksFromSite: 587,
      rows: [
        {
          ordinal: 1,
          goId: "523093",
          examSlug: null,
          type: "MCQ",
          marks: 2,
          relatedSlugs: ["functions"],
        },
      ],
    });
    await db.rows.put({
      topicSlug: "stack",
      ordinal: 9,
      goId: "49487",
      examSlug: null,
      type: "MCQ",
      marks: 1,
      lastSeenAt: 1,
    } as never);

    const summaries = await buildAllSummaries(db);

    expect(summaries.map((summary) => summary.slug).sort()).toEqual([
      "discrete-mathematics",
      "functions",
      "stack",
    ]);
  });
});
