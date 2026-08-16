/** Driving export, import and rebuild from the dashboard. */

import { useCallback, useState } from "react";
import { pluralize } from "../../utils/format";
import { BackupRejection } from "../../utils/backup";
import type { ImportReport } from "../../utils/backup";
import type { RebuildAllResponse } from "../../types";
import {
  EXPORT_FAILED,
  IMPORT_FAILED,
  NOTHING_NEW,
  REBUILD_FAILED,
  REJECTION_TEXT,
  ToolTone,
} from "./constants";
import { fetchBackup, readJsonFile, requestRebuild, saveToFile, sendBackup } from "./transfer";

export interface ToolStatus {
  tone: ToolTone;
  text: string;
}

export interface DataTools {
  /** True while one of the three is running; all of them disable meanwhile. */
  busy: boolean;
  status: ToolStatus | null;
  exportAll: () => Promise<void>;
  importFile: (file: File) => Promise<void>;
  rebuild: () => Promise<void>;
}

function info(text: string): ToolStatus {
  const status: ToolStatus = { tone: ToolTone.Info, text };
  return status;
}

function failure(text: string): ToolStatus {
  const status: ToolStatus = { tone: ToolTone.Error, text };
  return status;
}

/**
 * What the merge did, in the units that matter.
 *
 * Answers lead, and are counted separately from everything else, because they
 * are the only part of an import that cannot be reconstructed: rows, topics and
 * question records are all rebuildable from the log, and the log is what this
 * number describes.
 */
function describeImport(report: ImportReport): string {
  const merged =
    report.attemptsAdded === 0
      ? NOTHING_NEW
      : `Merged ${pluralize(report.attemptsAdded, "new answer")}, with ` +
        `${report.attemptsAlreadyHeld} already recorded.`;

  const touched =
    `${pluralize(report.questionsTouched, "question")}, ` +
    `${pluralize(report.rowsTouched, "row")} and ` +
    `${pluralize(report.topicsTouched, "topic")} updated.`;

  const skipped =
    report.skipped === 0
      ? ""
      : ` ${pluralize(report.skipped, "record")} in the file could not be read and were left out.`;

  return `${merged} ${touched}${skipped}`;
}

function describeRebuild(rebuilt: RebuildAllResponse): string {
  return (
    `Rebuilt ${pluralize(rebuilt.questions, "question record")} from the answer log, ` +
    `and ${pluralize(rebuilt.topics, "topic summary", "topic summaries")}.`
  );
}

export function useDataTools(): DataTools {
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<ToolStatus | null>(null);

  /**
   * One lock across all three. They all write to, or read the whole of, the
   * same database, and a rebuild racing an import would report figures for a
   * state that never existed.
   */
  const run = useCallback(async (work: () => Promise<ToolStatus>): Promise<void> => {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await work());
    } finally {
      setBusy(false);
    }
  }, []);

  const exportAll = useCallback(async (): Promise<void> => {
    await run(async () => {
      const result = await fetchBackup();
      if (!result.ok) return failure(`${EXPORT_FAILED} ${result.error}`);

      const name = saveToFile(document, result.data);
      const { questions, attempts, rows, topics } = result.data;
      return info(
        `Saved ${name} — ${pluralize(attempts.length, "answer")}, ` +
          `${questions.length} questions, ${rows.length} rows, ${topics.length} topics.`,
      );
    });
  }, [run]);

  const importFile = useCallback(
    async (file: File): Promise<void> => {
      await run(async () => {
        const parsed = await readJsonFile(file);
        if (!parsed.ok) return failure(REJECTION_TEXT[BackupRejection.NotJson]);

        const result = await sendBackup(parsed.payload);
        if (!result.ok) return failure(`${IMPORT_FAILED} ${result.error}`);
        if (!result.data.ok) return failure(REJECTION_TEXT[result.data.rejection]);

        return info(describeImport(result.data.report));
      });
    },
    [run],
  );

  const rebuild = useCallback(async (): Promise<void> => {
    await run(async () => {
      const result = await requestRebuild();
      if (!result.ok) return failure(`${REBUILD_FAILED} ${result.error}`);

      return info(describeRebuild(result.data));
    });
  }, [run]);

  const tools: DataTools = { busy, status, exportAll, importFile, rebuild };
  return tools;
}
