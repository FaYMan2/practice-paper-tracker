import { describe, expect, it } from "vitest";
import {
  buildResumeUrl,
  canonicalUrl,
  detectPage,
  ordinalRangeForPage,
  pageForOrdinal,
  parseGoId,
  parseOrdinal,
  parsePageNo,
  parseResumeHash,
  provisionalKey,
  topicSlugFromHref,
  topicUrl,
} from "../utils/url";

describe("host normalisation", () => {
  // The index page links with www., the topic pages without. Any comparison
  // that skips normalisation silently matches nothing.
  it("treats both hosts as the same page", () => {
    expect(canonicalUrl("https://www.practicepaper.in/gate-cse/stack/")).toBe(
      canonicalUrl("https://practicepaper.in/gate-cse/stack"),
    );
  });

  it("extracts the same slug from either host", () => {
    expect(topicSlugFromHref("https://www.practicepaper.in/gate-cse/data-structure")).toBe(
      "data-structure",
    );
    expect(topicSlugFromHref("https://practicepaper.in/gate-cse/data-structure/")).toBe(
      "data-structure",
    );
  });

  it("ignores queries and fragments when extracting a slug", () => {
    expect(
      topicSlugFromHref("https://practicepaper.in/gate-cse/er-model?_gl=1*1omh23q#x"),
    ).toBe("er-model");
  });

  it("rejects off-site and off-section links", () => {
    expect(topicSlugFromHref("https://gateoverflow.in/523106/foo")).toBeNull();
    expect(topicSlugFromHref("https://practicepaper.in/gate-ee/stack")).toBeNull();
    expect(topicSlugFromHref("https://practicepaper.in/gate-cse/a/b")).toBeNull();
    expect(topicSlugFromHref("not a url")).toBeNull();
  });
});

describe("detectPage", () => {
  it("classifies a topic page and its pagination", () => {
    expect(detectPage("https://practicepaper.in/gate-cse/data-structure?page_no=55")).toMatchObject(
      { kind: "topic", slug: "data-structure", pageNo: 55 },
    );
  });

  it("defaults to page 1 when page_no is absent or junk", () => {
    expect(detectPage("https://practicepaper.in/gate-cse/stack").pageNo).toBe(1);
    // The site itself returns a question-less 200 for these rather than erroring.
    expect(detectPage("https://practicepaper.in/gate-cse/stack?page_no=abc").pageNo).toBe(1);
    expect(parsePageNo("0")).toBe(1);
    expect(parsePageNo(null)).toBe(1);
  });

  it("classifies year pages separately from topics", () => {
    expect(detectPage("https://practicepaper.in/gate-cse/gate-cse-2024-set-1").kind).toBe("year");
    expect(detectPage("https://practicepaper.in/gate-cse/isro-cse-2016").kind).toBe("year");
    expect(detectPage("https://practicepaper.in/gate-cse/gate-cse-1997").kind).toBe("year");
  });

  it("classifies listing pages as index", () => {
    expect(
      detectPage(
        "https://practicepaper.in/gate-cse/topic-wise-practice-of-gate-cse-previous-year-papers",
      ).kind,
    ).toBe("index");
  });

  it("excludes non-question pages under the same section", () => {
    expect(detectPage("https://practicepaper.in/gate-cse/gate-cse-syllabus").kind).toBe("other");
    expect(detectPage("https://practicepaper.in/gate-cse/gate-cse-notes").kind).toBe("other");
  });

  it("ignores other sites entirely", () => {
    expect(detectPage("https://example.com/gate-cse/stack").kind).toBe("other");
  });
});

describe("parseGoId", () => {
  it("takes the id and discards the varying slug", () => {
    // The same id carries different slugs on different rows.
    expect(parseGoId("https://gateoverflow.in/1236/gate2007-38#a_list")).toBe("1236");
    expect(parseGoId("https://gateoverflow.in/1236/gate2007-38-isro2016-27")).toBe("1236");
    expect(parseGoId("https://gateoverflow.in/49487/isro2007-16-isro2009-30-isro2014-43")).toBe(
      "49487",
    );
  });

  it("returns null for non-GateOverflow links", () => {
    expect(parseGoId("https://practicepaper.in/gate-cse/stack")).toBeNull();
    expect(parseGoId(null)).toBeNull();
  });
});

describe("ordinals", () => {
  it("parses the topic-global question label", () => {
    expect(parseOrdinal("Question 271")).toBe(271);
    expect(parseOrdinal("  question:1 ")).toBe(1);
    expect(parseOrdinal("Explanation")).toBeNull();
    expect(parseOrdinal(null)).toBeNull();
  });

  it("maps ordinals to pages at five per page", () => {
    expect(pageForOrdinal(1)).toBe(1);
    expect(pageForOrdinal(5)).toBe(1);
    expect(pageForOrdinal(6)).toBe(2);
    // Verified against the live site: page 55 opens with "Question 271".
    expect(pageForOrdinal(271)).toBe(55);
    expect(ordinalRangeForPage(55)).toEqual([271, 275]);
  });
});

describe("resume links", () => {
  it("round-trips a goId target", () => {
    const url = buildResumeUrl("data-structure", { ordinal: 271, goId: "523106" });
    expect(url).toBe(
      "https://practicepaper.in/gate-cse/data-structure?page_no=55#pptr-resume=523106",
    );
    expect(parseResumeHash(new URL(url).hash)).toEqual({ goId: "523106", ordinal: null });
  });

  it("falls back to an ordinal when the goId is unknown", () => {
    // Ordinals shift when a new exam year is added, so goId is preferred.
    const url = buildResumeUrl("stack", { ordinal: 12 });
    expect(url).toBe("https://practicepaper.in/gate-cse/stack?page_no=3#pptr-resume=ord%3A12");
    expect(parseResumeHash(new URL(url).hash)).toEqual({ goId: null, ordinal: 12 });
  });

  it("omits page_no on page one", () => {
    expect(topicUrl("stack", 1)).toBe("https://practicepaper.in/gate-cse/stack");
  });

  it("ignores unrelated fragments", () => {
    expect(parseResumeHash("#a_list")).toBeNull();
    expect(parseResumeHash("")).toBeNull();
    expect(parseResumeHash("#pptr-resume=")).toBeNull();
  });

  it("is picked up by detectPage", () => {
    const page = detectPage(buildResumeUrl("stack", { ordinal: 12, goId: "1035" }));
    expect(page).toMatchObject({ slug: "stack", pageNo: 3 });
    expect(page.resume).toEqual({ goId: "1035", ordinal: null });
  });
});

describe("provisional keys", () => {
  it("namespaces synthetic ids away from GateOverflow ids", () => {
    expect(provisionalKey("stack", 7)).toBe("pp:stack:7");
    expect(parseGoId(provisionalKey("stack", 7))).toBeNull();
  });
});
