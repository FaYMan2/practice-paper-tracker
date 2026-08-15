/** Database identity, schema and index names. */

export const DB_NAME = "practice-paper-tracker";

export const SCHEMA_VERSION = 3;

export enum TableName {
  Questions = "questions",
  Attempts = "attempts",
  Rows = "rows",
  Topics = "topics",
  Diagnostics = "diagnostics",
}

/**
 * Dexie schema strings. Never edit a shipped version in place — add a new
 * `.version(n).stores({...}).upgrade()` block and bump `SCHEMA_VERSION`.
 *
 * `&eventId` is the idempotency guard: a message retried after a lost
 * acknowledgement hits the unique constraint instead of appending a phantom
 * second attempt.
 */
export const SCHEMA_V1: Record<TableName, string> = {
  [TableName.Questions]: "goId, status, starred, lastAttemptAt",
  [TableName.Attempts]: "++id, &eventId, goId, ts, topicSlug, [goId+ts]",
  [TableName.Rows]: "[topicSlug+ordinal], goId, topicSlug, lastSeenAt",
  [TableName.Topics]: "slug, parentSlug",
  [TableName.Diagnostics]: "++id, ts, kind",
};

/**
 * Adds `*relatedSlugs`, the multi-entry index behind cross-topic attribution:
 * a question answered on the Discrete Mathematics page is labelled
 * "Probability Theory" by the site, and this is what lets Probability Theory
 * find it without its own pages ever having been opened.
 */
export const SCHEMA_V2: Pick<Record<TableName, string>, TableName.Rows> = {
  [TableName.Rows]: "[topicSlug+ordinal], goId, topicSlug, lastSeenAt, *relatedSlugs",
};

/**
 * No schema change — the same stores as version 2, re-declared so the backfill
 * below runs again.
 *
 * The version 2 upgrade was meant to give every existing row a `relatedSlugs`
 * array and did not reliably do so: rows survived into version 2 without the
 * field, and reading one crashed the dashboard. Repeating it is cheap, and the
 * read path no longer trusts it either.
 */
export const SCHEMA_V3: Pick<Record<TableName, string>, TableName.Rows> = SCHEMA_V2;

/** Index names used in queries, so a rename is caught in one place. */
export const INDEX = {
  attemptTs: "ts",
  attemptGoId: "goId",
  questionGoId: "goId",
  rowGoId: "goId",
  rowTopicSlug: "topicSlug",
  rowRelatedSlugs: "relatedSlugs",
  diagnosticTs: "ts",
} as const;

/** The diagnostics log is a signal channel, not an archive. */
export const DIAGNOSTIC_LIMIT = 500;
