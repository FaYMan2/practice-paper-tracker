import { describe, expect, it } from "vitest";
import { FIXTURES, loadHtml } from "./fixtures";
import {
  CLS,
  examAndTopicLinks,
  goIdForQuestion,
  isOwnMutation,
  lastPageNumber,
  marksForQuestion,
  ordinalForQuestion,
  questionBlocks,
  questionType,
  SEL,
  selfCheck,
  SelfCheckIssueKind,
  stampVerdict,
  totalMarksFromArea,
  totalQuestionsFromStatus,
} from "../utils/selectors";

const goIds = (doc: Document) => questionBlocks(doc).map(goIdForQuestion);

describe("question harvesting", () => {
  it("finds five questions on a full topic page", () => {
    expect(questionBlocks(loadHtml(FIXTURES.dataStructureP1))).toHaveLength(5);
  });

  it("reads topic-global ordinals from a deep page", () => {
    // Page 55 of data-structure starts at 5*54+1.
    expect(questionBlocks(loadHtml(FIXTURES.dataStructureP55)).map(ordinalForQuestion)).toEqual([
      271, 272, 273, 274, 275,
    ]);
  });

  it("extracts one GateOverflow id per question", () => {
    expect(goIds(loadHtml(FIXTURES.dataStructureP1))).toEqual([
      "523106",
      "523107",
      "523126",
      "523145",
      "523028",
    ]);
  });

  it("ignores a bare GateOverflow link in the comment section", () => {
    // probability-theory carries a user comment linking gateoverflow.in/1535
    // outside any question block. A page-wide search would pick it up.
    const doc = loadHtml(FIXTURES.probabilityP1);
    const ids = goIds(doc);
    expect(ids).toHaveLength(5);
    expect(ids).not.toContain("1535");
    expect(doc.body.innerHTML).toContain("gateoverflow.in/1535");
  });

  it("gives the same id to a question that appears under two topics", () => {
    // This is the whole basis of cross-topic starring.
    const probability = new Set(goIds(loadHtml(FIXTURES.probabilityP1)));
    const discrete = new Set(goIds(loadHtml(FIXTURES.discreteMathP1)));
    const shared = [...probability].filter((id) => id && discrete.has(id));
    expect(shared).toEqual(expect.arrayContaining(["523093", "523142"]));
  });

  it("works on year pages, which share the question pool", () => {
    const ids = goIds(loadHtml(FIXTURES.year2024Set1));
    expect(ids).toHaveLength(5);
    expect(ids.every((id) => id && /^\d+$/.test(id))).toBe(true);
  });
});

describe("question metadata", () => {
  it("reads types and marks", () => {
    const blocks = questionBlocks(loadHtml(FIXTURES.dataStructureP1));
    expect(blocks.map(questionType)).toEqual(["MSQ", "MSQ", "NAT", "MCQ", "NAT"]);
    expect(blocks.map(marksForQuestion)).toEqual([2, 2, 1, 1, 2]);
  });

  it("identifies NAT questions on a numeric page", () => {
    const types = questionBlocks(loadHtml(FIXTURES.probabilityP8Nat)).map(questionType);
    expect(types).toContain("NAT");
  });

  it("separates the exam slug from the topic link", () => {
    const first = questionBlocks(loadHtml(FIXTURES.dataStructureP1))[0]!;
    const { examSlug, relatedSlugs } = examAndTopicLinks(first);
    expect(examSlug).toBe("gate-cse-2026-set-2");
    expect(relatedSlugs).toEqual(["stack"]);
  });

  it("finds no exam slug on a year page, which never names its own year", () => {
    const first = questionBlocks(loadHtml(FIXTURES.year2024Set1))[0]!;
    expect(examAndTopicLinks(first).examSlug).toBeNull();
  });
});

describe("topic totals and pagination", () => {
  it("reads the site's own row count and marks", () => {
    const doc = loadHtml(FIXTURES.dataStructureP1);
    expect(totalQuestionsFromStatus(doc)).toBe(298);
    expect(totalMarksFromArea(doc)).toBe(366);
  });

  it("reads the last page from the pager", () => {
    expect(lastPageNumber(loadHtml(FIXTURES.dataStructureP1))).toBe(60);
  });

  it("reports one page when there is no pager", () => {
    expect(lastPageNumber(loadHtml(FIXTURES.stackP99Empty))).toBe(1);
  });
});

describe("stampVerdict", () => {
  // Verdicts come from the site's own stamp so we never reimplement its MSQ
  // countdown or NAT range logic — two copies of that would drift.
  it("reads a newly added stamp class", () => {
    expect(stampVerdict(`x ${CLS.correctStamp}`, "x")).toBe("correct");
    expect(stampVerdict(`x ${CLS.wrongStamp}`, "x")).toBe("wrong");
  });

  it("ignores a class that was already present", () => {
    // Without the oldValue comparison, unrelated attribute writes re-fire.
    expect(stampVerdict(`x ${CLS.correctStamp}`, `x ${CLS.correctStamp}`)).toBeNull();
  });

  it("ignores unrelated class changes", () => {
    expect(stampVerdict("litespeed-loaded", "")).toBeNull();
    expect(stampVerdict("", null)).toBeNull();
  });
});

describe("isOwnMutation", () => {
  // We repaint with our own classes; painting the site's stamp classes would
  // retrigger our observer and record a phantom attempt.
  it("recognises our own repaint", () => {
    expect(isOwnMutation(`foo ${CLS.solved}`, "foo")).toBe(true);
  });

  it("does not swallow a real stamp change", () => {
    expect(isOwnMutation(`foo ${CLS.correctStamp}`, "foo")).toBe(false);
  });

  it("is false when nothing changed", () => {
    expect(isOwnMutation("foo", "foo")).toBe(false);
  });
});

describe("selfCheck", () => {
  it("passes on every real question page", () => {
    for (const name of [
      FIXTURES.dataStructureP1,
      FIXTURES.dataStructureP55,
      FIXTURES.probabilityP1,
      FIXTURES.probabilityP8Nat,
      FIXTURES.discreteMathP1,
      FIXTURES.year2024Set1,
    ]) {
      expect(selfCheck(loadHtml(name)), name).toEqual([]);
    }
  });

  it("stays quiet on an out-of-range page, which is a legitimate empty 200", () => {
    expect(selfCheck(loadHtml(FIXTURES.stackP99Empty))).toEqual([]);
  });

  it("reports a question that has lost its GateOverflow anchor", () => {
    const doc = loadHtml(FIXTURES.dataStructureP1);
    questionBlocks(doc)[0]!.querySelector(SEL.explanation)!.remove();
    expect(selfCheck(doc)).toContainEqual({
      kind: SelfCheckIssueKind.MissingGoId,
      detail: "1/5 blocks",
    });
  });

  it("reports when the question label stops parsing", () => {
    const doc = loadHtml(FIXTURES.dataStructureP1);
    for (const el of doc.querySelectorAll(SEL.questionLabel)) el.textContent = "Q. one";
    expect(selfCheck(doc)).toContainEqual({
      kind: SelfCheckIssueKind.UnparsedOrdinal,
      detail: "5/5 blocks",
    });
  });

  it("reports when the topic total stops parsing", () => {
    const doc = loadHtml(FIXTURES.dataStructureP1);
    // The status div's id is suffixed per page (`mtq_quiz_status-1`), so this
    // has to go through the class selector.
    doc.querySelector(SEL.quizStatus)!.textContent = "nothing useful";
    expect(selfCheck(doc)).toContainEqual({
      kind: SelfCheckIssueKind.UnparsedTotal,
      detail: "no 'out of N Questions'",
    });
  });
});
