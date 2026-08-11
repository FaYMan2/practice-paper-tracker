/** Shared topic-row writing, used by both the attempt and indexing services. */

import type { TrackerDB } from "../../utils/db";
import type { TopicRecord } from "../../types";
import { BLANK_TOPIC } from "./constants";

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
