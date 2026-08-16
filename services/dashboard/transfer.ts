/**
 * Moving the database in and out of a file.
 *
 * The dashboard is the only surface that can do this: it runs on an extension
 * page, so it has a DOM to download through and a file picker to read from,
 * while the background worker that owns the data has neither.
 */

import { MessageKind, sendToBackground } from "../../utils/messaging";
import { backupFilename } from "../../utils/backup";
import type { Backup, ImportOutcome } from "../../utils/backup";
import type { RebuildAllResponse, SendResult } from "../../types";

const JSON_MIME = "application/json";

/** Two-space indented, because the first thing anyone does is open the file. */
const JSON_INDENT = 2;

export async function fetchBackup(): Promise<SendResult<Backup>> {
  return await sendToBackground({ kind: MessageKind.ExportBackup });
}

/**
 * Hands the file to the browser's own download machinery.
 *
 * A blob URL and an anchor rather than `chrome.downloads`, which would mean
 * asking for a permission at install time for something the page can already
 * do. The URL is released on the next tick — not immediately, since the click
 * has only started the download by the time this returns.
 */
export function saveToFile(doc: Document, backup: Backup): string {
  const name = backupFilename(backup.exportedAt);
  const blob = new Blob([JSON.stringify(backup, null, JSON_INDENT)], { type: JSON_MIME });
  const url = URL.createObjectURL(blob);

  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = name;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}

export type FileRead = { ok: true; payload: unknown } | { ok: false; detail: string };

/**
 * Parses the chosen file here rather than shipping its text to the background.
 *
 * A file that is not JSON at all is not worth a message round trip, and failing
 * at the point the user clicked is a clearer report than a rejection coming
 * back from somewhere else.
 */
export async function readJsonFile(file: File): Promise<FileRead> {
  try {
    const parsed: FileRead = { ok: true, payload: JSON.parse(await file.text()) };
    return parsed;
  } catch (error) {
    const failed: FileRead = {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
    return failed;
  }
}

export async function sendBackup(payload: unknown): Promise<SendResult<ImportOutcome>> {
  return await sendToBackground({ kind: MessageKind.ImportBackup, payload });
}

export async function requestRebuild(): Promise<SendResult<RebuildAllResponse>> {
  return await sendToBackground({ kind: MessageKind.RebuildAll });
}
