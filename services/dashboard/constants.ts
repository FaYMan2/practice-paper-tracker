/** What the data tools say back after doing something. */

import { BackupRejection } from "../../utils/backup";

/**
 * How the status line reads.
 *
 * An enum because it is a dispatch key: the component picks a colour from it,
 * and a failed import that rendered in the ordinary colour would look like it
 * had worked.
 */
export enum ToolTone {
  Info = "info",
  Error = "error",
}

/**
 * Why a file was refused, in a sentence.
 *
 * Every one of these says that nothing was changed, because that is the first
 * thing a person wants to know when an import of their only backup fails.
 */
export const REJECTION_TEXT: Record<BackupRejection, string> = {
  [BackupRejection.NotJson]: "That file isn't JSON, so there was nothing to read from it.",
  [BackupRejection.NotABackup]:
    "That file isn't a tracker backup. Nothing in your data was changed.",
  [BackupRejection.FutureVersion]:
    "That backup was written by a newer version of the extension than this one. " +
    "Nothing was changed — update the extension and try again.",
};

export const EXPORT_FAILED = "Could not read the database.";

export const IMPORT_FAILED = "Could not merge that backup.";

export const REBUILD_FAILED = "Could not rebuild.";

export const NOTHING_NEW = "Nothing new — every answer in that file was already recorded.";
