/** Copy for the export, import and rebuild panel. */

export const TOOLS_TITLE = "Your data";

export const TOOLS_NOTE =
  "Everything lives in this browser profile, so clearing extension data or losing the " +
  "profile takes it with it. A backup is one JSON file you can keep anywhere.";

export const EXPORT_LABEL = "Export a backup";

export const IMPORT_LABEL = "Import a backup";

export const REBUILD_LABEL = "Rebuild the figures";

export const EXPORT_HINT = "Every answer, question, row and topic, as one file.";

export const IMPORT_HINT =
  "Merged into what's here — answers are matched on their event id, so importing " +
  "the same file twice changes nothing and nothing is ever removed.";

export const REBUILD_HINT =
  "Recomputes every status and count from the answer log. Safe to run at any time.";

export const BUSY_LABEL = "Working…";

/** Only JSON is offered in the picker, though the contents are still checked. */
export const FILE_ACCEPT = "application/json,.json";

/** Follows the count when opening the dashboard found records out of step. */
export const REPAIRED_NOTE =
  "had drifted from the answer log and were repaired. The figures above are the corrected ones.";
