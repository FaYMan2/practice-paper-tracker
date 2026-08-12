/** Reading per-topic summaries. */

import { buildAllSummaries, getSummaries, mergeSummaries } from "../../utils/summary";
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

/**
 * Every topic's figures, computed from IndexedDB rather than read from the
 * mirror.
 *
 * The mirror is refreshed with the result, so opening the dashboard also
 * repairs anything that had drifted out of step for the injected UI.
 */
export async function dashboardSummaries(): Promise<Record<string, TopicSummary>> {
  const summaries = await buildAllSummaries();
  await mergeSummaries(summaries);

  return Object.fromEntries(summaries.map((summary) => [summary.slug, summary]));
}
