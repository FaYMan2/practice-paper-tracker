import { describe, expect, it, vi } from "vitest";
import { CrawlState, MAX_PAGES, crawlTopic } from "../utils/crawl";
import type { CrawlProgress } from "../utils/crawl";
import { FIXTURES, loadHtml } from "./fixtures";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "fixtures");

function html(name: (typeof FIXTURES)[keyof typeof FIXTURES]): string {
  // The crawler parses raw markup, so unlike `loadHtml` this keeps it as text.
  return readFileSync(join(DIR, name), "utf8")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

const PAGE = html(FIXTURES.discreteMathP1);
const EMPTY = html(FIXTURES.stackP99Empty);

/** A page reduced to the one thing the crawler reads, for the long loops. */
const TINY = "<div class='allquestionarea'><div class='question'></div></div>";

interface Run {
  progress: CrawlProgress;
  fetched: string[];
  recorded: number[];
}

/** Runs a crawl over a fake site of `pages` question pages. */
async function crawl(
  pages: number,
  options: {
    skip?: number[];
    cancelAfter?: number;
    fail?: number;
    body?: string;
    empty?: string;
  } = {},
): Promise<Run> {
  const fetched: string[] = [];
  const recorded: number[] = [];
  const updates: CrawlProgress[] = [];

  const handle = crawlTopic("discrete-mathematics", {
    skip: options.skip ?? [],
    onProgress: (progress) => updates.push(progress),
    record: (_doc, pageNo) => {
      recorded.push(pageNo);
      return Promise.resolve(5);
    },
    wait: () => Promise.resolve(),
    fetchPage: (url) => {
      fetched.push(url);
      const pageNo = Number(new URL(url).searchParams.get("page_no") ?? 1);
      if (options.fail === pageNo) return Promise.reject(new Error("HTTP 503"));
      if (options.cancelAfter !== undefined && fetched.length >= options.cancelAfter) {
        handle.cancel();
      }
      return Promise.resolve(pageNo > pages ? (options.empty ?? EMPTY) : (options.body ?? PAGE));
    },
  });

  return { progress: await handle.finished, fetched, recorded };
}

describe("crawlTopic", () => {
  it("walks pages until one comes back with no questions", async () => {
    // The site answers an out-of-range page_no with a 200 and an empty list, so
    // the empty list is the only reliable end of a topic.
    const run = await crawl(3);

    expect(run.recorded).toEqual([1, 2, 3]);
    expect(run.fetched).toHaveLength(4);
    expect(run.progress.state).toBe(CrawlState.Done);
    expect(run.progress.recorded).toBe(15);
  });

  it("addresses each page the way the site does", async () => {
    const run = await crawl(2);

    expect(run.fetched[0]).toBe("https://practicepaper.in/gate-cse/discrete-mathematics");
    expect(run.fetched[1]).toBe(
      "https://practicepaper.in/gate-cse/discrete-mathematics?page_no=2",
    );
  });

  it("skips pages already indexed", async () => {
    const run = await crawl(4, { skip: [1, 2] });

    expect(run.recorded).toEqual([3, 4]);
    expect(run.fetched.some((url) => url.includes("page_no=2"))).toBe(false);
  });

  it("stops within one request of being cancelled", async () => {
    const run = await crawl(10, { cancelAfter: 2 });

    expect(run.progress.state).toBe(CrawlState.Cancelled);
    expect(run.fetched).toHaveLength(2);
  });

  it("reports a failed page instead of carrying on past it", async () => {
    const run = await crawl(5, { fail: 3 });

    expect(run.progress.state).toBe(CrawlState.Failed);
    expect(run.progress.error).toContain("503");
    expect(run.recorded).toEqual([1, 2]);
  });

  it("paces itself between requests", async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    const handle = crawlTopic("stack", {
      skip: [],
      onProgress: () => undefined,
      record: () => Promise.resolve(5),
      wait,
      fetchPage: (url) =>
        Promise.resolve(url.includes("page_no=3") ? EMPTY : PAGE),
    });
    await handle.finished;

    // Three requests, two gaps: the first costs nothing to start.
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("cannot run away past a sane page count", async () => {
    // Termination is not trusted on its own; this is the backstop that keeps a
    // markup change from turning into thousands of requests.
    // Parsing a real page four hundred times measures the fixture, not the
    // loop, so this one runs on the smallest markup the crawler recognises.
    const run = await crawl(MAX_PAGES + 50, { body: TINY, empty: "<html></html>" });

    expect(run.fetched).toHaveLength(MAX_PAGES);
    expect(run.progress.state).toBe(CrawlState.Done);
  });

  it("parses a fetched page exactly as the live one is parsed", async () => {
    const seen: number[] = [];
    const handle = crawlTopic("discrete-mathematics", {
      skip: [],
      onProgress: () => undefined,
      record: (doc) => {
        seen.push(doc.querySelectorAll("div.question").length);
        return Promise.resolve(0);
      },
      wait: () => Promise.resolve(),
      fetchPage: (url) => Promise.resolve(url.includes("page_no=2") ? EMPTY : PAGE),
    });
    await handle.finished;

    expect(seen).toEqual([loadHtml(FIXTURES.discreteMathP1).querySelectorAll("div.question").length]);
  });
});
