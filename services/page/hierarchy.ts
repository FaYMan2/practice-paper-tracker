/** Reporting the subject hierarchy the index page lays out. */

import { MessageKind, sendToBackground } from "../../utils/messaging";
import { indexTopicTree } from "../../utils/selectors";

/**
 * The index page is the only place the site states which subject a topic
 * belongs to, so every visit re-reads it — the list grows as topics are added,
 * and re-reading is cheap.
 */
export async function reportHierarchy(doc: Document): Promise<void> {
  const entries = indexTopicTree(doc);
  if (entries.length === 0) return;

  const result = await sendToBackground({ kind: MessageKind.ReportHierarchy, entries });
  if (!result.ok) {
    // Rebuildable on the next visit, and nothing the user did is lost by it.
    console.warn("[pptr] could not record hierarchy", result.error);
    return;
  }

  console.info("[pptr] hierarchy recorded", result.data.topics, "topics");
}
