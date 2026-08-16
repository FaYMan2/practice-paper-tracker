/** Reading per-topic summaries. */

import { buildAllSummaries, getSummaries, mergeSummaries } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap, TopicSummary } from "../../types";
import { repairDrift } from "./maintenance";

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
 * Two repairs happen on the way. Anything whose cached projection has drifted
 * from the attempt log is put right first, so the figures are computed from
 * corrected state rather than around it; then the mirror is refreshed with the
 * result, so opening the dashboard also fixes whatever the injected UI had been
 * painting. Neither writes anything when there is nothing to correct, which is
 * what keeps the mirror's change notification from turning into a loop.
 */
export async function dashboardSummaries(): Promise<ResponseMap[MessageKind.GetDashboard]> {
  const repaired = await repairDrift();
  const summaries = await buildAllSummaries();
  await mergeSummaries(summaries);

  const payload: ResponseMap[MessageKind.GetDashboard] = {
    summaries: Object.fromEntries(summaries.map((summary) => [summary.slug, summary])),
    repaired,
  };
  return payload;
}
