/**
 * Routes a page to the service that handles its shape.
 *
 * The content script entrypoint only calls this; everything it does lives in a
 * service beside this file.
 */

import { detectPage } from "../../utils/url";
import { runQuestionPage } from "./questionPage";
import { runTopicIndexPage } from "./topicIndexPage";

export type * from "./types";

export async function runOnPage(doc: Document, href: string): Promise<void> {
  const page = detectPage(href);
  // A slug is all we need; `kind` is only a hint, and the real test for a
  // question page is whether a question area exists.
  if (!page.slug || page.kind === "other") return;

  if (page.kind === "index") {
    await runTopicIndexPage(doc);
    return;
  }

  await runQuestionPage(doc, href, page);
}
