/** The shape of an export, and what reading one back can produce. */

import type { AttemptInput, QuestionRecord, RowRecord, TopicRecord } from "../../types";
import type { BACKUP_FORMAT } from "./constants";

/**
 * One file, holding everything worth restoring.
 *
 * `diagnostics` is deliberately absent: it is a capped signal channel about the
 * site's markup, not something a person would want back after a profile wipe.
 *
 * Attempts travel as `AttemptInput` — without their auto-increment `id` — for a
 * reason that matters. That id numbers a row in one particular database, and
 * carrying it into another would land on top of an unrelated attempt. Identity
 * across databases is `eventId`, which is what the import deduplicates on.
 */
export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** The Dexie schema version that wrote it. Provenance, not a gate. */
  schemaVersion: number;
  exportedAt: number;
  questions: QuestionRecord[];
  attempts: AttemptInput[];
  rows: RowRecord[];
  topics: TopicRecord[];
}

/**
 * Why a file was refused outright.
 *
 * An enum because it is a dispatch key: the dashboard selects the sentence it
 * shows from it, and a refused import that explained nothing would leave the
 * user guessing whether their data was safe.
 */
export enum BackupRejection {
  NotJson = "not-json",
  NotABackup = "not-a-backup",
  FutureVersion = "future-version",
}

/**
 * Reading a file either yields a backup or refuses it.
 *
 * `skipped` counts records inside an accepted file that could not be read.
 * A single malformed row must not cost the user the other four thousand, so
 * they are dropped individually and reported rather than failing the import.
 */
export type BackupRead =
  | { ok: true; backup: Backup; skipped: number }
  | { ok: false; rejection: BackupRejection; detail: string };

/** What an import actually did, in the units the user cares about. */
export interface ImportReport {
  /** Attempts the log did not already hold. The only irreplaceable number here. */
  attemptsAdded: number;
  /** Attempts already present under the same `eventId`, so re-importing is safe. */
  attemptsAlreadyHeld: number;
  questionsTouched: number;
  rowsTouched: number;
  topicsTouched: number;
  /** Records in the file that could not be read, and were left out. */
  skipped: number;
  /** Question projections recomputed from the merged log afterwards. */
  questionsRebuilt: number;
}

export type ImportOutcome =
  | { ok: true; report: ImportReport }
  | { ok: false; rejection: BackupRejection; detail: string };
