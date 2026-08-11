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
    });
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
