/** Recording which questions this page holds. */

import { observePage } from "../../utils/harvest";
import { MessageKind, sendToBackground } from "../../utils/messaging";
import type { QuestionPageContext } from "./types";

export async function indexPage(context: QuestionPageContext): Promise<void> {
  const observation = observePage(context.doc, context.topicSlug, context.pageNo);
  const result = await sendToBackground({
    kind: MessageKind.ObservePage,
    page: observation,
  });

  if (result.ok) return;
  // Indexing is rebuildable by revisiting the page, so this is logged rather
  // than shown — unlike a lost answer, nothing is permanently gone.
  console.warn("[pptr] could not record page", result.error);
}
