/** What a backup file says about itself, and what we accept back. */

/**
 * Written into every export and checked on every import.
 *
 * An arbitrary JSON file dropped into the import box has to be refused before
 * anything is written, and the only honest way to recognise our own file is to
 * have stamped it.
 */
export const BACKUP_FORMAT = "practice-paper-tracker";

/**
 * The envelope's own version, independent of the Dexie schema.
 *
 * They move for different reasons: a new index bumps `SCHEMA_VERSION` without
 * changing what a backup holds, and a rearranged file would bump this without
 * touching the database. The schema version travels in the file too, as
 * provenance for a future importer that needs to know how a record was shaped.
 */
export const BACKUP_VERSION = 1;

export const BACKUP_FILE_PREFIX = "practice-paper-tracker";

/** Field defaults for records a file describes only partially. */
export const UNKNOWN_TYPE = "UNKNOWN";
