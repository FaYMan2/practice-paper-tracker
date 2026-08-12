/** Recording which subject each topic belongs to. */

import { db, type TrackerDB } from "../../utils/db";
import { refreshAllSummaries } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap, TopicHierarchyEntry, TopicRecord } from "../../types";
import { upsertTopic } from "./topics";

/**
 * The index page names a topic by its link text — "Data Structure" — while a
 * topic page heads itself "GATE CSE Data Structures Previous Year Questions –
 * Solved PYQs". The short navigational name is the one a person recognises, so
 * it wins; the heading only fills a gap for topics the index page never listed.
 */
async function mergeEntry(
  database: TrackerDB,
  entry: TopicHierarchyEntry,
  now: number,
): Promise<void> {
  const existing = await database.topics.get(entry.slug);
  const changes: Partial<TopicRecord> = {
    parentSlug: entry.parentSlug,
    title: entry.title ?? existing?.title ?? null,
    updatedAt: now,
  };
  await upsertTopic(database, entry.slug, changes);
}

/**
 * Writes the scraped hierarchy.
 *
 * This is also what makes the dashboard complete rather than a list of topics
 * that happen to have progress: a topic row is created for every topic on the
 * site, so one visit to the index page is enough to see everything left to do.
 */
export async function recordHierarchy(
  entries: TopicHierarchyEntry[],
): Promise<ResponseMap[MessageKind.ReportHierarchy]> {
  const database = db();
  const now = Date.now();

  await database.transaction("rw", database.topics, async () => {
    await Promise.all(entries.map((entry) => mergeEntry(database, entry, now)));
  });

  // Topics with no rows have no summary until now, so this is what puts the
  // untouched ones into the mirror.
  await refreshAllSummaries(database);

  const recorded: ResponseMap[MessageKind.ReportHierarchy] = { topics: entries.length };
  return recorded;
}
