/** Keeping the progress strip in step with what has been recorded. */

import { paintProgressStrip } from "../../components";
import type { CrawlProgress } from "../../utils/crawl";
import { getSummaries, watchSummaries } from "../../utils/summary/mirror";
import type { TopicSummary } from "../../types";
import { startCrawl, type CrawlSession } from "./crawling";

/**
 * Paints from the mirrored summary, then keeps it live.
 *
 * Reading `storage.local` avoids waiting on a cold service worker, and
 * watching it means both answering a question and indexing a page update the
 * strip without a reload.
 */
export function followProgress(doc: Document, topicSlug: string, href: string): void {
  let summary: TopicSummary | null = null;
  let progress: CrawlProgress | null = null;
  let session: CrawlSession | null = null;

  const render = (): void => {
    paintProgressStrip(doc, {
      summary,
      progress,
      onStartCrawl: () => void begin(),
      onCancelCrawl: () => session?.cancel(),
    });
  };

  const begin = async (): Promise<void> => {
    if (session) return;

    session = await startCrawl(topicSlug, href, (next) => {
      progress = next;
      render();
    });
  };

  const onSummaries = (summaries: Record<string, TopicSummary>): void => {
    summary = summaries[topicSlug] ?? null;
    render();
  };

  void getSummaries().then(onSummaries);
  watchSummaries(onSummaries);
}
