/** Which pages of a topic have already been indexed. */

import { db } from "../../utils/db";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap } from "../../types";

/*
 * Read from the topic record rather than derived from row ordinals: a page that
 * legitimately holds no questions — the last one, often — is still a page we
 * have visited, and a crawl must not fetch it again on every run.
 */
export async function topicPages(
  slug: string,
): Promise<ResponseMap[MessageKind.GetTopicPages]> {
  const topic = await db().topics.get(slug);

  const known: ResponseMap[MessageKind.GetTopicPages] = {
    slug,
    pages: topic?.indexedPages ?? [],
  };
  return known;
}
