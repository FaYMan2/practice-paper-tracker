/** Keeping the progress strip in step with what has been recorded. */

import { paintProgressStrip } from "../../components";
import { getSummaries, watchSummaries } from "../../utils/summary/mirror";
import type { TopicSummary } from "../../types";

/**
 * Paints from the mirrored summary, then keeps it live.
 *
 * Reading `storage.local` avoids waiting on a cold service worker, and
 * watching it means answering a question updates the strip without a reload.
 */
export function followProgress(doc: Document, topicSlug: string): void {
  const render = (summaries: Record<string, TopicSummary>): void => {
    paintProgressStrip(doc, summaries[topicSlug] ?? null);
  };

  void getSummaries().then(render);
  watchSummaries(render);
}
