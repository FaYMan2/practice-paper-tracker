import { describe, expect, it } from "vitest";
import { computeTopicSummary } from "../utils/summary";
import type { SummaryInputs, TopicRowInput } from "../utils/summary";
import type { QuestionStatus } from "../types";

function rows(...specs: [ordinal: number, goId: string, marks?: number][]): TopicRowInput[] {
  return specs.map(([ordinal, goId, marks = 1]) => ({ ordinal, goId, marks, borrowed: false }));
}

function inputs(overrides: Partial<SummaryInputs> = {}): SummaryInputs {
  const base: SummaryInputs = {
    slug: "stack",
    title: "Stack",
    parentSlug: "data-structure",
    totalFromSite: null,
    totalMarksFromSite: null,
    lastAnsweredOrdinal: null,
    lastVisitedPage: null,
    rows: [],
    statusByGoId: new Map<string, QuestionStatus>(),
    lastActivityAt: null,
  };
  return { ...base, ...overrides };
}

describe("computeTopicSummary", () => {
  it("counts rows, not distinct questions, against the site's total", () => {
    // GateOverflow 49487 genuinely occupies three rows in `stack`. Counting
    // distinct questions here would strand a solved topic at N-2 of N forever.
    const summary = computeTopicSummary(
      inputs({
        totalFromSite: 4,
        rows: rows([1, "49487"], [2, "49487"], [3, "49487"], [4, "1035"]),
        statusByGoId: new Map<string, QuestionStatus>([
          ["49487", "correct"],
          ["1035", "correct"],
        ]),
      }),
    );

    expect(summary.solvedRows).toBe(4);
    expect(summary.distinctSolved).toBe(2);
    expect(summary.solvedRows).toBeLessThanOrEqual(summary.totalFromSite!);
  });

  it("splits correct from wrong and only awards marks for correct", () => {
    const summary = computeTopicSummary(
      inputs({
        rows: rows([1, "a", 2], [2, "b", 1], [3, "c", 2]),
        statusByGoId: new Map<string, QuestionStatus>([
          ["a", "correct"],
          ["b", "wrong"],
        ]),
      }),
    );

    expect(summary).toMatchObject({
      solvedRows: 2,
      correctRows: 1,
      wrongRows: 1,
      marksEarned: 2,
    });
  });

  it("resumes at the lowest-ordinal unattempted row regardless of input order", () => {
    const summary = computeTopicSummary(
      inputs({
        rows: rows([9, "i"], [3, "c"], [7, "g"]),
        statusByGoId: new Map<string, QuestionStatus>([["c", "correct"]]),
      }),
    );

    expect(summary.firstUnattemptedOrdinal).toBe(7);
    expect(summary.firstUnattemptedGoId).toBe("g");
  });

  it("marks a topic fully indexed only once every row is known", () => {
    const partial = computeTopicSummary(
      inputs({ totalFromSite: 34, rows: rows([1, "a"], [2, "b"]) }),
    );
    expect(partial.fullyIndexed).toBe(false);
    expect(partial.indexedRows).toBe(2);

    const complete = computeTopicSummary(
      inputs({ totalFromSite: 2, rows: rows([1, "a"], [2, "b"]) }),
    );
    expect(complete.fullyIndexed).toBe(true);
  });

  it("estimates past the furthest answer when the index has gaps", () => {
    // Every known row is solved, but we know the topic holds more, so the true
    // next question has simply not been seen yet.
    const summary = computeTopicSummary(
      inputs({
        totalFromSite: 34,
        lastAnsweredOrdinal: 12,
        rows: rows([11, "a"], [12, "b"]),
        statusByGoId: new Map<string, QuestionStatus>([
          ["a", "correct"],
          ["b", "wrong"],
        ]),
      }),
    );

    expect(summary.firstUnattemptedOrdinal).toBe(13);
    expect(summary.firstUnattemptedGoId).toBeNull();
  });

  it("offers no resume target once a fully indexed topic is finished", () => {
    const summary = computeTopicSummary(
      inputs({
        totalFromSite: 1,
        lastAnsweredOrdinal: 1,
        rows: rows([1, "a"]),
        statusByGoId: new Map<string, QuestionStatus>([["a", "correct"]]),
      }),
    );

    expect(summary.firstUnattemptedOrdinal).toBeNull();
  });

  it("tracks the furthest answered question, skipped ones and all", () => {
    // The reported case: page 4 holds ordinals 16-20, and 16 then 19 were
    // answered. Resume must follow 19, not stall on the skipped 17.
    const summary = computeTopicSummary(
      inputs({
        lastAnsweredOrdinal: 19,
        rows: rows([16, "460830"], [17, "c"], [18, "d"], [19, "460041"], [20, "e"]),
        statusByGoId: new Map<string, QuestionStatus>([
          ["460830", "correct"],
          ["460041", "wrong"],
        ]),
      }),
    );

    expect(summary.lastAnsweredOrdinal).toBe(19);
    expect(summary.lastAnsweredGoId).toBe("460041");
    // Still reported, just not used for resume.
    expect(summary.firstUnattemptedOrdinal).toBe(17);
  });

  it("prefers the topic's high-water mark when it exceeds the indexed rows", () => {
    // An answer recorded on a page we have not indexed yet.
    const summary = computeTopicSummary(
      inputs({
        lastAnsweredOrdinal: 40,
        rows: rows([1, "a"]),
        statusByGoId: new Map<string, QuestionStatus>([["a", "correct"]]),
      }),
    );

    expect(summary.lastAnsweredOrdinal).toBe(40);
    expect(summary.lastAnsweredGoId).toBeNull();
  });

  it("reports no last-answered question for an untouched topic", () => {
    const summary = computeTopicSummary(inputs({ rows: rows([1, "a"], [2, "b"]) }));
    expect(summary.lastAnsweredOrdinal).toBeNull();
    expect(summary.lastAnsweredGoId).toBeNull();
  });

  it("treats an unknown question as unattempted rather than throwing", () => {
    const summary = computeTopicSummary(inputs({ rows: rows([1, "never-seen"]) }));
    expect(summary.solvedRows).toBe(0);
    expect(summary.firstUnattemptedOrdinal).toBe(1);
  });
});
