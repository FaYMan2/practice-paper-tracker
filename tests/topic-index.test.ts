import { beforeEach, describe, expect, it } from "vitest";
import { UI_CLASS, paintIndexProgress } from "../components";
import { indexTopicLinks } from "../utils/selectors";
import type { TopicSummary } from "../types";
import { FIXTURES, loadHtml } from "./fixtures";

function mountIndex(): ReturnType<typeof indexTopicLinks> {
  document.body.innerHTML = loadHtml(FIXTURES.indexTopicwise).body.innerHTML;
  return indexTopicLinks(document);
}

function summary(slug: string, overrides: Partial<TopicSummary> = {}): TopicSummary {
  const base: TopicSummary = {
    slug,
    title: null,
    parentSlug: null,
    solvedRows: 12,
    correctRows: 9,
    wrongRows: 3,
    distinctSolved: 12,
    totalFromSite: 34,
    indexedRows: 34,
    fullyIndexed: true,
    marksEarned: 14,
    totalMarksFromSite: 40,
    lastAnsweredOrdinal: 12,
    lastAnsweredGoId: "1035",
    lastVisitedPage: 3,
    firstUnattemptedOrdinal: 13,
    firstUnattemptedGoId: "1035",
    lastActivityAt: null,
  };
  return { ...base, ...overrides };
}

const badges = () => [...document.querySelectorAll(`.${UI_CLASS.topicBadge}`)];

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("indexTopicLinks", () => {
  it("finds the topic links in the page's lists", () => {
    const links = mountIndex();
    const slugs = links.map((link) => link.slug);

    expect(slugs).toContain("data-structure");
    expect(slugs).toContain("stack");
    expect(slugs).toContain("probability-theory");
    expect(links.length).toBeGreaterThan(80);
  });

  it("normalises the www host the index page links with", () => {
    // The index links as www.practicepaper.in while topic pages use the bare
    // host, so an unnormalised comparison would match nothing at all.
    const links = mountIndex();
    const stack = links.find((link) => link.slug === "stack");

    expect(stack?.element.getAttribute("href")).toContain("www.practicepaper.in");
    expect(stack?.slug).toBe("stack");
  });

  it("skips links that are not question topics", () => {
    const slugs = mountIndex().map((link) => link.slug);

    expect(slugs).not.toContain("gate-cse-syllabus");
    expect(slugs).not.toContain("gate-cse-notes");
    expect(slugs).not.toContain("topic-wise-practice-of-gate-cse-previous-year-papers");
    expect(slugs.filter((slug) => slug.startsWith("gate-cse-20"))).toEqual([]);
  });

  it("returns each topic once", () => {
    const slugs = mountIndex().map((link) => link.slug);
    expect(slugs).toEqual([...new Set(slugs)]);
  });
});

describe("paintIndexProgress", () => {
  it("badges only the topics with recorded progress", () => {
    const links = mountIndex();
    const painted = paintIndexProgress(document, links, {
      stack: summary("stack"),
      queue: summary("queue"),
    });

    expect(painted).toBe(2);
    expect(badges()).toHaveLength(2);
  });

  it("shows counts and both navigation links", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, {
      stack: summary("stack", { lastAnsweredOrdinal: 12, lastAnsweredGoId: "aaa" }),
    });

    const badge = badges()[0]!;
    expect(badge.textContent).toContain("12 / 34");

    const actions = [...badge.querySelectorAll(`.${UI_CLASS.resume}`)];
    expect(actions.map((link) => link.textContent)).toEqual(["Resume", "Last"]);
    // Ordinals 13 and 12 both sit on page 3 at five questions per page.
    expect(actions[0]!.getAttribute("href")).toBe(
      "https://practicepaper.in/gate-cse/stack?page_no=3#pptr-resume=1035",
    );
    expect(actions[1]!.getAttribute("href")).toBe(
      "https://practicepaper.in/gate-cse/stack?page_no=3#pptr-resume=aaa",
    );
  });

  it("marks the last-attempt link as the lesser action", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, { stack: summary("stack") });

    const actions = [...badges()[0]!.querySelectorAll(`.${UI_CLASS.resume}`)];
    expect(actions[0]!.classList.contains(UI_CLASS.resumeSecondary)).toBe(false);
    expect(actions[1]!.classList.contains(UI_CLASS.resumeSecondary)).toBe(true);
  });

  it("marks a partly indexed count as a floor", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, {
      stack: summary("stack", { fullyIndexed: false, indexedRows: 20 }),
    });

    expect(badges()[0]!.textContent).toContain("≥12 / 34");
  });

  it("omits both links for a topic with nothing answered", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, {
      stack: summary("stack", { lastAnsweredOrdinal: null }),
    });

    expect(badges()).toHaveLength(1);
    expect(badges()[0]!.querySelector(`.${UI_CLASS.resume}`)).toBeNull();
  });

  it("drops the resume link once a topic is finished", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, {
      stack: summary("stack", { firstUnattemptedOrdinal: null, firstUnattemptedGoId: null }),
    });

    const actions = [...badges()[0]!.querySelectorAll(`.${UI_CLASS.resume}`)];
    expect(actions.map((link) => link.textContent)).toEqual(["Last"]);
  });

  it("leaves untouched topics unbadged", () => {
    const links = mountIndex();
    // ~100 topics on this page; badging every one would be noise.
    expect(paintIndexProgress(document, links, {})).toBe(0);
    expect(badges()).toEqual([]);
  });

  it("replaces rather than stacks when repainted", () => {
    const links = mountIndex();
    const summaries = { stack: summary("stack") };

    paintIndexProgress(document, links, summaries);
    paintIndexProgress(document, links, summaries);
    expect(badges()).toHaveLength(1);
  });

  it("removes a badge when the topic's progress disappears", () => {
    const links = mountIndex();
    paintIndexProgress(document, links, { stack: summary("stack") });
    paintIndexProgress(document, links, {});

    expect(badges()).toEqual([]);
  });
});
