import { describe, expect, it } from "vitest";
import {
  MIN_EVIDENCE,
  rankWeakAreas,
  tooEarlyToSay,
  weakSubjects,
  wilsonBounds,
} from "../utils/weakness";
import type { TopicGroup } from "../utils/dashboard";
import { EMPTY_STATS } from "../utils/dashboard";
import type { TopicSummary } from "../types";

function topic(slug: string, answered: number, firstTryCorrect: number): TopicSummary {
  const summary: TopicSummary = {
    slug,
    title: null,
    parentSlug: "computer-organization",
    solvedRows: answered,
    correctRows: firstTryCorrect,
    wrongRows: answered - firstTryCorrect,
    firstTryCorrectRows: firstTryCorrect,
    distinctSolved: answered,
    totalFromSite: 30,
    indexedRows: 30,
    fullyIndexed: true,
    marksEarned: 0,
    totalMarksFromSite: null,
    lastAnsweredOrdinal: null,
    lastAnsweredGoId: null,
    lastVisitedPage: null,
    firstUnattemptedOrdinal: null,
    firstUnattemptedGoId: null,
    lastActivityAt: null,
  };
  return summary;
}

function group(children: TopicSummary[]): TopicGroup {
  const built: TopicGroup = {
    key: "computer-organization",
    label: "Computer Organization",
    parent: topic("computer-organization", 0, 0),
    children,
    stats: EMPTY_STATS,
  };
  return built;
}

describe("the Wilson interval", () => {
  it("widens as the evidence thins", () => {
    // The property the whole ranking rests on: the same 0% means very
    // different things at one question and at ten.
    const one = wilsonBounds(0, 1);
    const ten = wilsonBounds(0, 10);

    expect(one.high).toBeGreaterThan(ten.high);
    expect(one.high).toBeCloseTo(0.79, 2);
    expect(ten.high).toBeCloseTo(0.28, 2);
  });

  it("never claims certainty at the extremes", () => {
    // The normal approximation gives a zero-width interval here, asserting
    // total confidence exactly where five answers cannot support it.
    const perfect = wilsonBounds(5, 5);

    expect(perfect.rate).toBe(1);
    expect(perfect.low).toBeLessThan(1);
    expect(perfect.low).toBeCloseTo(0.57, 2);
  });

  it("stays inside 0 and 1", () => {
    expect(wilsonBounds(0, 2).low).toBe(0);
    expect(wilsonBounds(2, 2).high).toBe(1);
  });

  it("says nothing at all about a topic with no answers", () => {
    expect(wilsonBounds(0, 0)).toEqual({ rate: 0, low: 0, high: 1 });
  });
});

describe("ranking weak areas", () => {
  it("puts a well-evidenced bad topic above a single unlucky answer", () => {
    // The reason this exists. Sorting on the raw fraction puts "0%, one
    // question" first, which is advice to revise something you have barely met.
    const subjects = weakSubjects([group([topic("hashing", 15, 6), topic("cache", 5, 0)])], {});
    const ranked = rankWeakAreas(subjects);

    expect(ranked.map((area) => area.slug)).toEqual(["cache", "hashing"]);
    // Five straight misses is real evidence; the optimistic reading is still poor.
    expect(ranked[0]!.firstTry.high).toBeLessThan(ranked[1]!.firstTry.high);
  });

  it("does not let one miss outrank a topic missed nine times", () => {
    // A single wrong answer is not a weak area, and putting it on a list
    // headed "work on these" is how a diagnosis becomes a distraction.
    const subjects = weakSubjects(
      [group([topic("hashing", 15, 6), topic("paging", 1, 0)])],
      {},
    );

    expect(rankWeakAreas(subjects).map((area) => area.slug)).toEqual(["hashing"]);
    expect(tooEarlyToSay(subjects).map((area) => area.slug)).toEqual(["paging"]);
  });

  it("ranks on first-try accuracy, not on where the topic stands now", () => {
    // Both topics are at 100% today. One of them needed two goes at everything,
    // which is exactly what an exam will not give you.
    const struggled = topic("pipelining", 10, 3);
    struggled.correctRows = 10;
    struggled.wrongRows = 0;
    const clean = topic("boolean-algebra", 10, 10);
    clean.correctRows = 10;

    const ranked = rankWeakAreas(weakSubjects([group([clean, struggled])], {}));

    expect(ranked[0]!.slug).toBe("pipelining");
    expect(ranked[0]!.accuracy.rate).toBe(1);
    expect(ranked[0]!.firstTry.rate).toBeCloseTo(0.3, 5);
  });

  it("prefers thirty questions at 20% to four questions at 0%", () => {
    // The case that separates this from sorting on the fraction: 0% *is* the
    // lower number, and four answers is not enough to act on. Rank by the raw
    // rate and the four-question topic wins, which is the whole bug.
    const subjects = weakSubjects([group([topic("thin", 4, 0), topic("thick", 30, 6)])], {});

    expect(rankWeakAreas(subjects).map((area) => area.slug)).toEqual(["thick", "thin"]);
  });

  it("leaves out a topic nobody could call weak", () => {
    // A page headed "where to spend your time" that recommends something you
    // get right eleven times in twelve is a leaderboard, not advice.
    const subjects = weakSubjects([group([topic("boolean-algebra", 12, 11)])], {});

    expect(rankWeakAreas(subjects)).toEqual([]);
  });

  it("holds back a topic with too little answered to judge", () => {
    const subjects = weakSubjects([group([topic("cache", MIN_EVIDENCE - 1, 0)])], {});

    expect(rankWeakAreas(subjects)).toEqual([]);
    // Held back, not dropped: "not enough yet" is worth being told.
    expect(tooEarlyToSay(subjects).map((area) => area.slug)).toEqual(["cache"]);
  });

  it("leaves an untouched topic out of both lists", () => {
    const subjects = weakSubjects([group([topic("cache", 0, 0)])], {});

    expect(rankWeakAreas(subjects)).toEqual([]);
    expect(tooEarlyToSay(subjects)).toEqual([]);
  });

  it("offers the better-established of two equally poor topics first", () => {
    const subjects = weakSubjects([group([topic("a", 4, 0), topic("b", 12, 0)])], {});

    expect(rankWeakAreas(subjects)[0]!.slug).toBe("b");
  });
});

describe("the heatmap", () => {
  it("sums a subject from its own topics, so the row cannot disagree with its cells", () => {
    const subjects = weakSubjects([group([topic("hashing", 10, 4), topic("cache", 10, 8)])], {});

    expect(subjects[0]!.answered).toBe(20);
    expect(subjects[0]!.firstTry?.rate).toBeCloseTo(0.6, 5);
  });

  it("reports no figure for a subject nothing has been answered in", () => {
    // Null, not zero: zero would paint an untouched subject as a total failure.
    const subjects = weakSubjects([group([topic("cache", 0, 0)])], {});

    expect(subjects[0]!.firstTry).toBeNull();
  });

  it("names each topic by the subject it sits under", () => {
    const subjects = weakSubjects([group([topic("cache", 3, 1)])], {
      cache: "Cache Memory",
      "computer-organization": "Computer Organization",
    });

    expect(subjects[0]!.topics[0]).toMatchObject({
      label: "Cache Memory",
      subjectLabel: "Computer Organization",
    });
  });
});

/**
 * The dashboard reads summaries the background computed. A page can be newer
 * than the worker answering it — every extension reload passes through that
 * state — so a field added this release arrives absent.
 */
describe("a summary from an older worker", () => {
  function withoutFirstTry(slug: string, answered: number, correct: number): TopicSummary {
    const { firstTryCorrectRows: _absent, ...older } = topic(slug, answered, correct);
    return older as TopicSummary;
  }

  it("falls back to the current-status count rather than reading zero", () => {
    // Zero is the lazy default and the harmful one: it would paint every topic
    // as catastrophic and fill "where to spend your time" with the whole
    // syllabus. The old reading is merely optimistic, and self-corrects.
    const subjects = weakSubjects([group([withoutFirstTry("cache", 10, 8)])], {});

    expect(subjects[0]!.topics[0]!.firstTry.rate).toBeCloseTo(0.8, 5);
    expect(subjects[0]!.firstTry?.rate).toBeCloseTo(0.8, 5);
  });

  it("produces no NaN anywhere in the ranking", () => {
    const subjects = weakSubjects([group([withoutFirstTry("cache", 10, 2)])], {});
    const ranked = rankWeakAreas(subjects);

    expect(Number.isFinite(ranked[0]!.firstTry.rate)).toBe(true);
    expect(Number.isFinite(ranked[0]!.firstTry.high)).toBe(true);
  });
});
