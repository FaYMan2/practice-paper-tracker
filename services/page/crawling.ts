/** Running an opt-in index of the whole topic from the page you are on. */

import { crawlTopic } from "../../utils/crawl";
import type { CrawlHandle, CrawlProgress } from "../../utils/crawl";
import { observePage } from "../../utils/harvest";
import { CRAWL_FAILED_DIAGNOSTIC } from "../../utils/crawl";
import { MessageKind, reportDiagnostic, sendToBackground } from "../../utils/messaging";

/** Pages already recorded, so re-running only fetches what is missing. */
async function indexedPages(slug: string): Promise<number[]> {
  const result = await sendToBackground({ kind: MessageKind.GetTopicPages, slug });
  return result.ok ? result.data.pages : [];
}

/**
 * Records one fetched page through the same writer the live page uses.
 *
 * A crawl only ever reports that a question exists. It cannot record an
 * attempt, because it never answers anything — which is what makes it safe to
 * run over a topic you are part-way through.
 */
async function recordPage(slug: string, doc: Document, pageNo: number): Promise<number> {
  const observation = observePage(doc, slug, pageNo);
  const result = await sendToBackground({ kind: MessageKind.ObservePage, page: observation });

  if (result.ok) return result.data.rows;
  console.warn("[pptr] could not record crawled page", pageNo, result.error);
  return 0;
}

export interface CrawlSession {
  cancel: () => void;
}

/**
 * Starts a crawl and reports its progress back to the caller, which owns the
 * UI. Returns once the crawl is under way, not once it has finished.
 */
export async function startCrawl(
  slug: string,
  href: string,
  onProgress: (progress: CrawlProgress) => void,
): Promise<CrawlSession> {
  const skip = await indexedPages(slug);

  const handle: CrawlHandle = crawlTopic(slug, {
    skip,
    onProgress,
    record: (doc, pageNo) => recordPage(slug, doc, pageNo),
  });

  void handle.finished.then((progress) => {
    if (progress.error === undefined) return;
    // A crawl that dies part-way is worth knowing about: it usually means the
    // site changed how it paginates.
    void reportDiagnostic(CRAWL_FAILED_DIAGNOSTIC, `page ${progress.pageNo}: ${progress.error}`, href);
  });

  const session: CrawlSession = { cancel: handle.cancel };
  return session;
}
