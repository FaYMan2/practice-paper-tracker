/**
 * Getting your data out, and back in.
 *
 * At the foot of the page rather than the top: it is the section you need twice
 * a year, and putting it above the progress would suggest otherwise. It is
 * still on the main page rather than behind a settings screen, because a backup
 * you have to go looking for is a backup nobody takes.
 */

import "./DataTools.css";

import { useRef, type ChangeEvent } from "react";
import { useDataTools } from "../../../services/dashboard";
import { pluralize } from "../../../utils/format";
import {
  BUSY_LABEL,
  EXPORT_HINT,
  EXPORT_LABEL,
  FILE_ACCEPT,
  IMPORT_HINT,
  IMPORT_LABEL,
  REBUILD_HINT,
  REBUILD_LABEL,
  REPAIRED_NOTE,
  TOOLS_NOTE,
  TOOLS_TITLE,
} from "./constants";

export * from "./constants";

export interface DataToolsProps {
  /** Question records the last load found out of step with the log, if any. */
  repaired: number;
}

export function DataTools({ repaired }: DataToolsProps) {
  const { busy, status, exportAll, importFile, rebuild } = useDataTools();
  const picker = useRef<HTMLInputElement>(null);

  const onPick = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Cleared straight away, so choosing the same file twice still fires.
    event.target.value = "";
    if (file) void importFile(file);
  };

  return (
    <section className="tools">
      <h2 className="tools-title">{TOOLS_TITLE}</h2>
      <p className="tools-note">{TOOLS_NOTE}</p>

      <div className="tools-actions">
        <div className="tools-action">
          <button type="button" className="tools-button" disabled={busy} onClick={() => void exportAll()}>
            {EXPORT_LABEL}
          </button>
          <p className="tools-hint">{EXPORT_HINT}</p>
        </div>

        <div className="tools-action">
          <button
            type="button"
            className="tools-button"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            {IMPORT_LABEL}
          </button>
          <p className="tools-hint">{IMPORT_HINT}</p>
        </div>

        <div className="tools-action">
          <button type="button" className="tools-button" disabled={busy} onClick={() => void rebuild()}>
            {REBUILD_LABEL}
          </button>
          <p className="tools-hint">{REBUILD_HINT}</p>
        </div>
      </div>

      <input
        ref={picker}
        className="tools-picker"
        type="file"
        accept={FILE_ACCEPT}
        onChange={onPick}
      />

      {busy ? <p className="tools-status">{BUSY_LABEL}</p> : null}

      {!busy && status ? (
        <p className={`tools-status tools-status-${status.tone}`} role="status">
          {status.text}
        </p>
      ) : null}

      {repaired > 0 ? (
        <p className="tools-repaired" role="status">
          {pluralize(repaired, "question record")} {REPAIRED_NOTE}
        </p>
      ) : null}
    </section>
  );
}
