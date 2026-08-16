/** Shared topic-row writing, used by both the attempt and indexing services. */

import * as R from "ramda";
import { BLANK_TOPIC, type TrackerDB } from "../../utils/db";
import type { TopicRecord } from "../../types";

/**
 * The given topics, plus the subject each one sits under.
 *
 * A subject counts every question its topics carry, so a subject's figures
 * change the moment one of its topics does. Refreshing only the topics is what
 * leaves a subject reading its old numbers on the page until something rebuilds
 * everything — the same fan-out failure as cross-topic labels, one level up.
 */
export async function withParents(database: TrackerDB, slugs: string[]): Promise<string[]> {
  const wanted = R.uniq(slugs);
  const topics = await database.topics.bulkGet(wanted);
  const parents = R.filter(
    R.isNotNil,
    topics.map((topic) => topic?.parentSlug ?? null),
  );
  return [...wanted, ...parents];
}

/**
 * Writes only the fields a caller owns.
 *
 * Recording an answer and indexing a page both touch a topic, in separate
 * transactions. A full `put` from either would carry a stale copy of the
 * other's fields, so each patches its own and leaves the rest alone.
 */
export async function upsertTopic(
  database: TrackerDB,
  slug: string,
  changes: Partial<TopicRecord>,
): Promise<void> {
  const updated = await database.topics.update(slug, changes);
  if (updated === 0) await database.topics.add({ ...BLANK_TOPIC, ...changes, slug });
}
