/** Reading per-topic summaries. */

import { getSummaries } from "../../utils/summary";
import type { TopicSummary } from "../../types";

/** Every topic's summary, or just the requested slugs. */
export async function summariesFor(slugs?: string[]): Promise<Record<string, TopicSummary>> {
  const all = await getSummaries();
  if (!slugs) return all;

  const wanted = slugs
    .map((slug) => [slug, all[slug]] as const)
    .filter((entry): entry is readonly [string, TopicSummary] => entry[1] !== undefined);

  return Object.fromEntries(wanted);
}
