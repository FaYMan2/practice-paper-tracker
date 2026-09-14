import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TrackerDB, setDb } from "../utils/db";
import { paperDetail, paperOverview } from "../services/messages/papers";
import { recordAttempt } from "../services/messages/attempts";
import { observePage } from "../services/messages/pages";
import { recordHierarchy } from "../services/messages/hierarchy";
import { buildTopicSummary } from "../utils/summary";
import { reviewQueue } from "../services/messages/review";
import { groupTopics, statsOf } from "../utils/dashboard";
import { subjectsOf } from "../utils/papers";
import type { AttemptInput, ObservedRow } from "../types";

const PAPER = "gate-cse-2019";

let db: TrackerDB;
let dbCount = 0;

function observed(ordinal: number, goId: string, topic: string, marks = 2): ObservedRow {
  const row: ObservedRow = {
    ordinal,
    goId,
    examSlug: PAPER,
    type: "MCQ",
    marks,
    // On a paper page the site labels each question with the topic it belongs
    // to, which is the only place a subject breakdown can come from.
    relatedSlugs: [topic],
  };
  return row;
}

function attempt(overrides: Partial<AttemptInput> & Pick<AttemptInput, "goId" | "topicSlug">): AttemptInput {
  const input: AttemptInput = {
    eventId: `${overrides.goId}:${overrides.topicSlug}`,
    verdict: "correct",
    choices: [],
    ts: 5_000,
    ordinal: 1,
    pageNo: 1,
    examSlug: PAPER,
    type: "MCQ",
    marks: 2,
    pageLoadId: "load-1",
    ...overrides,
  };
  return input;
}

/** One paper page indexed: three questions, from two topics. */
async function sitDownToThePaper(): Promise<void> {
  await recordHierarchy([
    { slug: "computer-organization", parentSlug: null, title: "Computer Organization" },
    { slug: "pipeline-processor", parentSlug: "computer-organization", title: "Pipeline Processor" },
    { slug: "data-structure", parentSlug: null, title: "Data Structure" },
    { slug: "stack", parentSlug: "data-structure", title: "Stack" },
  ]);
  await observePage({
    topicSlug: PAPER,
    title: "GATE CSE 2019",
    pageNo: 1,
    totalFromSite: 3,
    totalMarksFromSite: 6,
    rows: [
      observed(1, "a", "pipeline-processor"),
      observed(2, "b", "pipeline-processor"),
      observed(3, "c", "stack"),
    ],
  });
}

beforeEach(async () => {
  fakeBrowser.reset();
  db = new TrackerDB(`test-papers-${dbCount++}`);
  await db.open();
  setDb(db);
});

afterEach(() => {
  setDb(null);
});

describe("scoring a paper", () => {
  it("counts only the answers given while sitting it", async () => {
    // The point of the whole feature. Answering a 2019 question later, while
    // practising pipelining, is not a test result: counted, the score would
    // climb on its own as unrelated practice covered the same questions.
    await sitDownToThePaper();
    await recordAttempt(attempt({ goId: "a", topicSlug: PAPER, ordinal: 1 }));
    await recordAttempt(
      attempt({ goId: "b", topicSlug: "pipeline-processor", eventId: "b:practice", ordinal: 7 }),
    );

    const detail = await paperDetail(PAPER, db);

    expect(detail.score).toMatchObject({ attempted: 1, correct: 1, marksEarned: 2 });
    // Still reported, just not as part of the paper.
    expect(detail.score.metElsewhere).toBe(1);
  });

  it("scores against what the paper is worth, not what was sat", async () => {
    await sitDownToThePaper();
    await recordAttempt(attempt({ goId: "a", topicSlug: PAPER, ordinal: 1 }));

    const detail = await paperDetail(PAPER, db);

    expect(detail.score.marksAvailable).toBe(6);
    expect(detail.score.total).toBe(3);
  });

  it("takes the latest run when a paper is sat twice", async () => {
    // Sitting it again is a new attempt at the same paper, and the score worth
    // showing is the one from the last time.
    await sitDownToThePaper();
    await recordAttempt(
      attempt({ goId: "a", topicSlug: PAPER, verdict: "wrong", eventId: "a:first", ts: 1_000 }),
    );
    await recordAttempt(
      attempt({ goId: "a", topicSlug: PAPER, verdict: "correct", eventId: "a:second", ts: 9_000 }),
    );

    const detail = await paperDetail(PAPER, db);
    expect(detail.score).toMatchObject({ attempted: 1, correct: 1, wrong: 0 });
  });

  it("lists a paper that has been opened but never answered", async () => {
    // "Sat none of it" is a state worth seeing, and it is the way back in.
    await sitDownToThePaper();

    const { papers } = await paperOverview(db);
    expect(papers.map((paper) => paper.slug)).toEqual([PAPER]);
    expect(papers[0]).toMatchObject({ label: "GATE CSE 2019" });
    expect(papers[0]!.score).toMatchObject({ attempted: 0, accuracy: null });
  });

  it("breaks a paper down by the subject its questions came from", async () => {
    await sitDownToThePaper();
    await recordAttempt(attempt({ goId: "a", topicSlug: PAPER, ordinal: 1 }));

    const detail = await paperDetail(PAPER, db);
    const subjects = subjectsOf(
      detail.questions,
      { "pipeline-processor": "computer-organization", stack: "data-structure" },
      { "computer-organization": "Computer Organization", "data-structure": "Data Structure" },
    );

    // Heaviest first: a paper is a marks budget.
    expect(subjects.map((subject) => subject.label)).toEqual([
      "Computer Organization",
      "Data Structure",
    ]);
    expect(subjects[0]).toMatchObject({ questions: 2, marksAvailable: 4, marksEarned: 2 });
  });
});

describe("what a paper does not disturb", () => {
  it("keeps a paper out of the topic hierarchy", async () => {
    // Left in, the paper shows up as a topic with no subject *and* its
    // questions are counted twice: once here, once under the topic the site
    // labelled them with.
    await sitDownToThePaper();
    // A subject is a subject because a topic names it as one, so the children
    // have to be here too or the subjects read as orphans.
    const summaries = await Promise.all(
      [PAPER, "computer-organization", "pipeline-processor", "data-structure", "stack"].map(
        (slug) => buildTopicSummary(slug, db),
      ),
    );

    const groups = groupTopics(summaries.filter((summary) => summary !== null));

    expect(groups.map((group) => group.key)).not.toContain(PAPER);
    expect(groups.map((group) => group.key).sort()).toEqual([
      "computer-organization",
      "data-structure",
    ]);
  });

  it("still credits the topic a question was sat under", async () => {
    // Progress keeps counting paper answers, because the site labels each
    // question with its topic and cross-topic attribution reads that label.
    await sitDownToThePaper();
    await recordAttempt(attempt({ goId: "a", topicSlug: PAPER, ordinal: 1 }));

    const topic = await buildTopicSummary("pipeline-processor", db);
    expect(topic).toMatchObject({ solvedRows: 1, correctRows: 1 });
    expect(statsOf(topic!).indexedRows).toBe(2);
  });

  it("still schedules a question missed in a paper for review", async () => {
    await sitDownToThePaper();
    await recordAttempt(attempt({ goId: "a", topicSlug: PAPER, verdict: "wrong", ordinal: 1 }));

    const queue = await reviewQueue(db, 5_000 + 2 * 86_400_000);
    expect(queue.due.map((item) => item.goId)).toEqual(["a"]);
  });
});
