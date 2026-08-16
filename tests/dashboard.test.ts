import { describe, expect, it } from "vitest";
import {
  QuestionFilter,
  SubjectView,
  accuracy,
  buildView,
  coverage,
  filterQuestions,
  groupTopics,
  statsOf,
  statusCounts,
  sumStats,
  unattemptedRows,
  visibleGroups,
} from "../utils/dashboard";
import { CHILD, SUBJECT, question, summary, viewOf } from "./factories";

describe("groupTopics", () => {
  it("nests a topic under the subject it names", () => {
    const [group] = groupTopics([CHILD, SUBJECT]);

    expect(group!.parent?.slug).toBe("data-structure");
    expect(group!.children.map((child) => child.slug)).toEqual(["stack"]);
  });

  it("takes a subject's own numbers rather than summing its children", () => {
    // The subject page serves every question its topics serve, so adding the
    // two together would count each answer twice.
    const [group] = groupTopics([CHILD, SUBJECT]);

    expect(group!.stats.solvedRows).toBe(40);
  });

  it("collects topics with no linked parent into one trailing group", () => {
    // "Only For ISRO CSE" is a bare <strong> on the index page, so its topics
    // arrive with no parent and must not vanish between the groups.
    const groups = groupTopics([CHILD, SUBJECT, summary("web-technology")]);
    const last = groups.at(-1)!;

    expect(groups).toHaveLength(2);
    expect(last.parent).toBeNull();
    expect(last.children.map((child) => child.slug)).toEqual(["web-technology"]);
  });

  it("keeps a topic whose parent was never scraped", () => {
    const groups = groupTopics([summary("stack", { parentSlug: "data-structure" })]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.children.map((child) => child.slug)).toEqual(["stack"]);
  });

  it("sums the group totals and nothing else into the overall figures", () => {
    const view = viewOf([CHILD, SUBJECT, summary("web-technology")]);

    expect(view.overall.solvedRows).toBe(40);
    expect(view.topicCount).toBe(3);
    expect(view.empty).toBe(false);
  });

  it("reports an empty view before anything has been recorded", () => {
    expect(buildView({}).empty).toBe(true);
  });
});

describe("stats", () => {
  it("counts what is left against the site's total, not what we have indexed", () => {
    expect(unattemptedRows(statsOf(CHILD))).toBe(22);
  });

  it("falls back to the indexed rows when the site's total is unknown", () => {
    const partial = summary("queue", { solvedRows: 3, indexedRows: 10 });

    expect(unattemptedRows(statsOf(partial))).toBe(7);
  });

  it("has no accuracy to report with nothing attempted", () => {
    expect(accuracy(statsOf(summary("queue")))).toBeNull();
    expect(accuracy(statsOf(CHILD))).toBeCloseTo(9 / 12);
  });

  it("measures coverage against the whole topic", () => {
    expect(coverage(statsOf(CHILD))).toBeCloseTo(12 / 34);
    expect(coverage(statsOf(summary("queue")))).toBe(0);
  });

  it("splits a topic three ways for the charts", () => {
    expect(statusCounts(statsOf(CHILD))).toEqual({ correct: 9, wrong: 3, left: 22 });
  });

  it("keeps a total null only while every part is unknown", () => {
    const known = sumStats([statsOf(CHILD), statsOf(summary("queue"))]);
    const unknown = sumStats([statsOf(summary("queue")), statsOf(summary("heap-tree"))]);

    expect(known.totalFromSite).toBe(34);
    expect(unknown.totalFromSite).toBeNull();
  });

  it("counts a subject with no site total by what it has indexed", () => {
    // Its answers are already in the numerator. Leaving its questions out of
    // the denominator is what showed "≥4 / 465" with the 4 and the 465 coming
    // from different subjects.
    const unopened = summary("computer-organization", {
      solvedRows: 9,
      correctRows: 6,
      indexedRows: 60,
    });

    const total = sumStats([statsOf(CHILD), statsOf(unopened)]);

    expect(total.totalFromSite).toBe(94);
    expect(total.solvedRows).toBe(21);
  });

  it("is only fully indexed when every part is", () => {
    expect(sumStats([statsOf(SUBJECT), statsOf(CHILD)]).fullyIndexed).toBe(false);
    expect(sumStats([statsOf(SUBJECT)]).fullyIndexed).toBe(true);
  });
});

describe("filterQuestions", () => {
  const rows = [
    question(1, { status: "correct" }),
    question(2, { status: "wrong" }),
    question(3),
  ];

  it("shows everything by default", () => {
    expect(filterQuestions(rows, QuestionFilter.All)).toHaveLength(3);
  });

  it("narrows to one status", () => {
    expect(filterQuestions(rows, QuestionFilter.Wrong).map((row) => row.ordinal)).toEqual([2]);
    expect(filterQuestions(rows, QuestionFilter.Unattempted)).toHaveLength(1);
  });
});

describe("which subjects the grid shows", () => {
  it("hides subjects with nothing recorded, and keeps them one click away", () => {
    // The syllabus is thirteen subjects; on any given day most are empty, and
    // rendering them all puts a wall of identical zeroes in front of the few
    // being worked on.
    const groups = viewOf([SUBJECT, CHILD, summary("web-technology")]).groups;

    expect(groups).toHaveLength(2);
    expect(visibleGroups(groups, SubjectView.Started).map((group) => group.key)).toEqual([
      "data-structure",
    ]);
    expect(visibleGroups(groups, SubjectView.All)).toHaveLength(2);
  });

  it("counts a subject you have opened but not answered anything in as started", () => {
    // It knows its own size, which is more than an untouched one does.
    const opened = summary("discrete-mathematics", { indexedRows: 5, totalFromSite: 465 });

    expect(visibleGroups(viewOf([opened]).groups, SubjectView.Started)).toHaveLength(1);
  });
});
