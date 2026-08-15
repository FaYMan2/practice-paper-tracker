/**
 * Indexing a whole topic, one page at a time.
 *
 * This runs in the content script rather than the background worker, which is
 * not a preference: an MV3 service worker has no `DOMParser`, and every DOM
 * assumption in this codebase lives in `utils/selectors`. Parsing fetched HTML
 * any other way would be a second, worse copy of that file. A content script on
 * practicepaper.in can fetch the remaining pages same-origin and hand each one
 * to the same parser the live page uses.
 *
 * The cost is that the crawl belongs to the tab: close it and the crawl stops.
 * Nothing is lost when it does — pages already recorded stay recorded, and
 * running it again picks up from there.
 */

import { questionBlocks } from "../selectors";
import { topicUrl } from "../url";
import { MAX_PAGES, REQUEST_DELAY_MS } from "./constants";
import { CrawlState } from "./types";
import type { CrawlHandle, CrawlOptions, CrawlProgress } from "./types";

export * from "./constants";
export * from "./types";

async function defaultFetch(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.text();
}

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * Walks a topic's pages until one comes back empty.
 *
 * Termination is on **zero question blocks**, never on status code: an
 * out-of-range `page_no` answers 200 with an empty list, so a crawler watching
 * for an error would never stop.
 */
export function crawlTopic(slug: string, options: CrawlOptions): CrawlHandle {
  const fetchPage = options.fetchPage ?? defaultFetch;
  const wait = options.wait ?? defaultWait;
  const skip = new Set(options.skip);

  let cancelled = false;

  const run = async (): Promise<CrawlProgress> => {
    const progress: CrawlProgress = {
      slug,
      state: CrawlState.Running,
      pageNo: 0,
      fetched: 0,
      recorded: 0,
    };

    const report = (state: CrawlState, error?: string): CrawlProgress => {
      const next: CrawlProgress = { ...progress, state, ...(error ? { error } : {}) };
      options.onProgress(next);
      return next;
    };

    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
      if (cancelled) return report(CrawlState.Cancelled);

      progress.pageNo = pageNo;
      if (skip.has(pageNo)) continue;

      report(CrawlState.Running);

      let doc: Document;
      try {
        // Paced before the request rather than after, so cancelling during the
        // wait costs the site nothing.
        if (progress.fetched > 0) await wait(REQUEST_DELAY_MS);
        if (cancelled) return report(CrawlState.Cancelled);
        doc = parse(await fetchPage(topicUrl(slug, pageNo)));
      } catch (error) {
        return report(CrawlState.Failed, error instanceof Error ? error.message : String(error));
      }

      progress.fetched += 1;

      // The end of the topic, and the only reliable sign of it.
      if (questionBlocks(doc).length === 0) return report(CrawlState.Done);

      progress.recorded += await options.record(doc, pageNo);
    }

    return report(CrawlState.Done);
  };

  const handle: CrawlHandle = {
    finished: run(),
    cancel: () => {
      cancelled = true;
    },
  };
  return handle;
}
