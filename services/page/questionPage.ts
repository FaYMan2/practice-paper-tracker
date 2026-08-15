/** Everything that happens on a page of questions. */

import { describeQuestions, questionBlocks } from "../../utils/selectors";
import type { PageInfo } from "../../utils/url";
import { reportPageHealth } from "./health";
import { indexPage } from "./indexing";
import { paintMarkers } from "./markers";
import { applyResume, followResumeHash } from "./navigation";
import { followProgress } from "./progress";
import { startTracking } from "./tracking";
import type { QuestionPageContext } from "./types";

function buildContext(doc: Document, href: string, page: PageInfo): QuestionPageContext {
  const topicSlug = page.slug!;
  const context: QuestionPageContext = {
    doc,
    href,
    topicSlug,
    pageNo: page.pageNo ?? 1,
    resume: page.resume,
    questions: describeQuestions(doc, topicSlug),
  };
  return context;
}

/**
 * Capture starts before anything is awaited so a fast answer is never missed,
 * and markers are painted last because indexing this page changes the counts
 * they are drawn from.
 */
export async function runQuestionPage(
  doc: Document,
  href: string,
  page: PageInfo,
): Promise<void> {
  await reportPageHealth(doc, href);
  if (questionBlocks(doc).length === 0) return;

  const context = buildContext(doc, href, page);

  startTracking(context);
  followProgress(doc, context.topicSlug, href);
  followResumeHash(context);
  applyResume(context, context.resume);

  await indexPage(context);
  await paintMarkers(context);
}
