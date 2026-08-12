import { describe, expect, it } from "vitest";
import { indexTopicTree } from "../utils/selectors";
import type { TopicHierarchyEntry } from "../types";
import { FIXTURES, loadHtml } from "./fixtures";

function tree(): TopicHierarchyEntry[] {
  return indexTopicTree(loadHtml(FIXTURES.indexTopicwise));
}

function childrenOf(entries: TopicHierarchyEntry[], parentSlug: string): string[] {
  return entries.filter((entry) => entry.parentSlug === parentSlug).map((entry) => entry.slug);
}

function find(entries: TopicHierarchyEntry[], slug: string): TopicHierarchyEntry {
  const entry = entries.find((candidate) => candidate.slug === slug);
  expect(entry, `no entry for ${slug}`).toBeDefined();
  return entry!;
}

describe("indexTopicTree", () => {
  it("reads every topic on the index page exactly once", () => {
    const entries = tree();
    const slugs = entries.map((entry) => entry.slug);

    expect(entries.length).toBeGreaterThan(100);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps Algorithms' children together across the split lists", () => {
    // The nine children sit in two sibling <ul> elements and only the second
    // carries the wp-block-list class, so taking "the first nested list" would
    // lose eight of them.
    const children = childrenOf(tree(), "algorithm");

    expect(children).toContain("asymptotic-notation");
    expect(children).toContain("dynamic-programming");
    expect(children).toHaveLength(9);
  });

  it("treats a subject as a subject rather than as its own child", () => {
    const entries = tree();

    expect(find(entries, "algorithm").parentSlug).toBeNull();
    expect(find(entries, "data-structure").parentSlug).toBeNull();
  });

  it("puts each topic under the subject it is listed beneath", () => {
    const entries = tree();

    expect(find(entries, "stack").parentSlug).toBe("data-structure");
    expect(find(entries, "probability-theory").parentSlug).toBe("discrete-mathematics");
    expect(find(entries, "cache-memory").parentSlug).toBe("computer-organization");
  });

  it("keeps the ISRO topics, whose group heading is not a link", () => {
    // "Only For ISRO CSE" is a bare <strong>, so there is no parent topic to
    // attach these to — but dropping them would hide two whole topics.
    const entries = tree();

    expect(find(entries, "software-engg").parentSlug).toBeNull();
    expect(find(entries, "web-technology").parentSlug).toBeNull();
  });

  it("handles the inverted <li><a><strong>> heading shape", () => {
    expect(find(tree(), "general-aptitude").parentSlug).toBeNull();
  });

  it("names each topic from its link text", () => {
    const entries = tree();

    expect(find(entries, "stack").title).toBe("Stack");
    expect(find(entries, "binary-search-tree").title).toBe("Binary Search Tree");
  });

  it("ignores links to other exams and to non-question pages", () => {
    const slugs = tree().map((entry) => entry.slug);

    // The same list links /gate-me/ and /gate-ce/ aptitude pages, and a
    // full-course sales page, none of which carry GATE CSE questions.
    expect(slugs).not.toContain("engineering-mathematics-full-course");
    expect(slugs.every((slug) => slug.length > 0)).toBe(true);
  });
});
