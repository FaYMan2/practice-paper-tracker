import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canResume,
  findResumeTarget,
  lastAttemptPlan,
  navigationPlans,
  resumePlan,
  scrollToQuestion,
} from "../utils/resume";
import { describeQuestions } from "../utils/selectors";
import { parseResumeHash } from "../utils/url";
import type { TopicSummary } from "../types";
import { FIXTURES, loadHtml } from "./fixtures";

function summary(overrides: Partial<TopicSummary> = {}): TopicSummary {
  const base: TopicSummary = {
    slug: "data-structure",
    title: "Data Structure",
    parentSlug: null,
    solvedRows: 12,
    correctRows: 9,
    wrongRows: 3,
    distinctSolved: 12,
    totalFromSite: 298,
    indexedRows: 298,
    fullyIndexed: true,
    marksEarned: 14,
    totalMarksFromSite: 366,
    lastAnsweredOrdinal: 271,
    lastAnsweredGoId: "523106",
    lastVisitedPage: 55,
    firstUnattemptedOrdinal: 272,
    firstUnattemptedGoId: "523107",
    lastActivityAt: null,
  };
  return { ...base, ...overrides };
}

describe("canResume", () => {
  it("offers a resume point once something has been answered", () => {
    expect(canResume(summary())).toBe(true);
  });

  it("declines a topic with nothing recorded", () => {
    // Resuming would just mean page one, which is where the user already is.
    expect(canResume(summary({ lastAnsweredOrdinal: null }))).toBe(false);
    expect(canResume(null)).toBe(false);
  });

  it("counts a finished topic as worked on", () => {
    expect(canResume(summary({ firstUnattemptedOrdinal: null }))).toBe(true);
  });
});

describe("resumePlan", () => {
  it("points at the first question with no attempt", () => {
    expect(resumePlan(summary())).toMatchObject({
      kind: "next",
      slug: "data-structure",
      ordinal: 272,
      pageNo: 55,
      goId: "523107",
      href: "https://practicepaper.in/gate-cse/data-structure?page_no=55#pptr-resume=523107",
      label: "Resume at question 272",
    });
  });

  it("returns nothing once the topic is finished", () => {
    expect(resumePlan(summary({ firstUnattemptedOrdinal: null }))).toBeNull();
  });

  it("returns nothing before the topic is started", () => {
    expect(resumePlan(summary({ lastAnsweredOrdinal: null }))).toBeNull();
  });
});

describe("lastAttemptPlan", () => {
  it("points at the furthest question answered", () => {
    expect(lastAttemptPlan(summary())).toMatchObject({
      kind: "last",
      ordinal: 271,
      pageNo: 55,
      goId: "523106",
      label: "Last attempt: question 271",
    });
  });

  it("keeps moving when earlier questions were skipped", () => {
    // The reported case: answering 19 after 16, with 17 and 18 skipped. Resume
    // stays on 17; this control has to follow the real progress.
    const skipped = summary({
      lastAnsweredOrdinal: 19,
      lastAnsweredGoId: "460041",
      firstUnattemptedOrdinal: 17,
      firstUnattemptedGoId: "c",
    });

    expect(resumePlan(skipped)?.ordinal).toBe(17);
    expect(lastAttemptPlan(skipped)?.ordinal).toBe(19);
  });

  it("falls back to an ordinal when the question id is unknown", () => {
    // The topic's high-water mark can exceed anything indexed, in which case
    // there is no row to read an id from.
    const plan = lastAttemptPlan(summary({ lastAnsweredOrdinal: 13, lastAnsweredGoId: null }))!;

    expect(plan.pageNo).toBe(3);
    expect(parseResumeHash(new URL(plan.href).hash)).toEqual({ goId: null, ordinal: 13 });
  });

  it("returns nothing before the topic is started", () => {
    expect(lastAttemptPlan(summary({ lastAnsweredOrdinal: null }))).toBeNull();
  });
});

describe("navigationPlans", () => {
  it("offers resume first, then last attempt", () => {
    expect(navigationPlans(summary()).map((plan) => plan.kind)).toEqual(["next", "last"]);
  });

  it("offers only the last attempt once the topic is finished", () => {
    expect(
      navigationPlans(summary({ firstUnattemptedOrdinal: null })).map((plan) => plan.kind),
    ).toEqual(["last"]);
  });

  it("offers nothing for an untouched topic", () => {
    expect(navigationPlans(summary({ lastAnsweredOrdinal: null }))).toEqual([]);
    expect(navigationPlans(null)).toEqual([]);
  });
});

describe("findResumeTarget", () => {
  const questions = () =>
    describeQuestions(loadHtml(FIXTURES.dataStructureP55), "data-structure");

  it("matches on the question id", () => {
    const all = questions();
    const outcome = findResumeTarget(all, { goId: all[1]!.goId, ordinal: null });

    expect(outcome.match).toBe("goId");
    expect(outcome.element).toBe(all[1]!.element);
  });

  it("falls back to the ordinal when the id is not on the page", () => {
    // Adding a new exam year shifts ordinals, so a stored id may no longer sit
    // where the link expects it.
    const all = questions();
    const outcome = findResumeTarget(all, { goId: "does-not-exist", ordinal: 273 });

    expect(outcome.match).toBe("ordinal");
    expect(outcome.element).toBe(all[2]!.element);
  });

  it("prefers the id over the ordinal when both are present", () => {
    const all = questions();
    const outcome = findResumeTarget(all, { goId: all[4]!.goId, ordinal: 271 });
    expect(outcome.match).toBe("goId");
    expect(outcome.element).toBe(all[4]!.element);
  });

  it("reports a miss when neither matches", () => {
    expect(findResumeTarget(questions(), { goId: "nope", ordinal: 9999 })).toEqual({
      match: "none",
      element: null,
    });
  });

  it("handles a page with no questions", () => {
    expect(findResumeTarget([], { goId: "523106", ordinal: 1 }).match).toBe("none");
  });
});

describe("scrollToQuestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  it("scrolls again after the lazy images reflow the page", () => {
    document.body.innerHTML = "<div id='q'></div>";
    const question = document.getElementById("q")!;
    const scroll = vi.fn();
    question.scrollIntoView = scroll;

    scrollToQuestion(question);
    expect(scroll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it("highlights the question briefly, then clears it", () => {
    document.body.innerHTML = "<div id='q'></div>";
    const question = document.getElementById("q")!;
    question.scrollIntoView = vi.fn();

    scrollToQuestion(question, "pptr-focus");
    expect(question.classList.contains("pptr-focus")).toBe(true);

    vi.advanceTimersByTime(5_000);
    expect(question.classList.contains("pptr-focus")).toBe(false);
  });
});
