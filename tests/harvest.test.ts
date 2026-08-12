import { describe, expect, it } from "vitest";
import { observePage } from "../utils/harvest";
import { SEL } from "../utils/selectors";
import { FIXTURES, loadHtml } from "./fixtures";

describe("observePage", () => {
  it("records every question on the page, answered or not", () => {
    const observation = observePage(loadHtml(FIXTURES.dataStructureP1), "data-structure", 1);

    expect(observation.rows).toHaveLength(5);
    expect(observation.rows.map((row) => row.goId)).toEqual([
      "523106",
      "523107",
      "523126",
      "523145",
      "523028",
    ]);
  });

  it("carries the topic totals the site publishes", () => {
    const observation = observePage(loadHtml(FIXTURES.dataStructureP1), "data-structure", 1);

    expect(observation).toMatchObject({
      topicSlug: "data-structure",
      pageNo: 1,
      totalFromSite: 298,
      totalMarksFromSite: 366,
    });
    expect(observation.title).toContain("Data Structures");
  });

  it("takes the topic's name out of the page's SEO heading", () => {
    // Real headings: "GATE CSE Discrete Mathematics Previous Year Questions
    // (Solved)" and "GATE CSE Data Structures Previous Year Questions – Solved
    // PYQs". Every topic page says the same thing, so none of it is the name.
    const dm = observePage(loadHtml(FIXTURES.discreteMathP1), "discrete-mathematics", 1);
    const ds = observePage(loadHtml(FIXTURES.dataStructureP1), "data-structure", 1);

    expect(dm.title).toBe("Discrete Mathematics");
    expect(ds.title).toBe("Data Structures");
  });

  it("keeps topic-global ordinals on a deep page", () => {
    const observation = observePage(loadHtml(FIXTURES.dataStructureP55), "data-structure", 55);
    expect(observation.rows.map((row) => row.ordinal)).toEqual([271, 272, 273, 274, 275]);
  });

  it("captures type, marks and exam slug per row", () => {
    const observation = observePage(loadHtml(FIXTURES.dataStructureP1), "data-structure", 1);

    expect(observation.rows[0]).toEqual({
      ordinal: 1,
      goId: "523106",
      examSlug: "gate-cse-2026-set-2",
      type: "MSQ",
      marks: 2,
      relatedSlugs: ["stack"],
    });
  });

  it("records the child topic the site files each question under", () => {
    // This is what lets Probability Theory show progress from questions
    // answered on the Discrete Mathematics page, without ever being opened.
    const observation = observePage(
      loadHtml(FIXTURES.discreteMathP1),
      "discrete-mathematics",
      1,
    );

    expect(observation.rows.map((row) => row.relatedSlugs)).toEqual([
      ["functions"],
      ["probability-theory"],
      ["relation"],
      ["probability-theory"],
      ["propositional-logic"],
    ]);
  });

  it("never files a question under the topic it was already seen in", () => {
    // A child page names its parent subject, and the parent page names the
    // child — but neither should name itself.
    const observation = observePage(loadHtml(FIXTURES.probabilityP1), "probability-theory", 1);

    expect(observation.rows.every((row) => !row.relatedSlugs.includes("probability-theory"))).toBe(
      true,
    );
    expect(observation.rows[0]?.relatedSlugs).toEqual(["discrete-mathematics"]);
  });

  it("indexes a year page the same way, since it shares the question pool", () => {
    const observation = observePage(loadHtml(FIXTURES.year2024Set1), "gate-cse-2024-set-1", 1);

    expect(observation.rows).toHaveLength(5);
    // A year page never names its own year, so there is no exam slug to read.
    expect(observation.rows.every((row) => row.examSlug === null)).toBe(true);
  });

  it("returns nothing for an out-of-range page", () => {
    const observation = observePage(loadHtml(FIXTURES.stackP99Empty), "stack", 99);
    expect(observation.rows).toEqual([]);
  });

  it("falls back to a synthetic key rather than dropping a question", () => {
    // A future paper GateOverflow has not linked yet must still be trackable.
    const doc = loadHtml(FIXTURES.dataStructureP1);
    doc.querySelectorAll(SEL.question)[0]!.querySelector(SEL.explanation)!.remove();

    const observation = observePage(doc, "data-structure", 1);
    expect(observation.rows).toHaveLength(5);
    expect(observation.rows[0]!.goId).toBe("pp:data-structure:1");
  });
});
