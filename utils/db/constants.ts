/** Database identity, schema and index names. */

export const DB_NAME = "practice-paper-tracker";

export const SCHEMA_VERSION = 1;

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

/** Index names used in queries, so a rename is caught in one place. */
export const INDEX = {
  attemptTs: "ts",
  attemptGoId: "goId",
  questionGoId: "goId",
  rowTopicSlug: "topicSlug",
  diagnosticTs: "ts",
} as const;

/** The diagnostics log is a signal channel, not an archive. */
export const DIAGNOSTIC_LIMIT = 500;
