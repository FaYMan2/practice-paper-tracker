/** Everything that happens on the topic index page. */

import { paintIndexProgress } from "../../components";
import { indexTopicLinks } from "../../utils/selectors";
import { getSummaries, watchSummaries } from "../../utils/summary/mirror";
import type { TopicSummary } from "../../types";

/** Badges each topic that has progress recorded, and keeps them current. */
export async function runTopicIndexPage(doc: Document): Promise<void> {
  const links = indexTopicLinks(doc);
  if (links.length === 0) return;

  const render = (summaries: Record<string, TopicSummary>): void => {
    paintIndexProgress(doc, links, summaries);
  };

  render(await getSummaries());
  watchSummaries(render);
}
