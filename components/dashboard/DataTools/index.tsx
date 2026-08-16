/**
 * Getting your data out, and back in.
 *
 * Its own section rather than a strip under the dashboard: it is the part you
 * need twice a year, and putting it beside the daily figures made both worse.
 * It is still one click away rather than behind a settings screen, because a
 * backup you have to go looking for is a backup nobody takes.
 */

import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Download, RefreshCw, Upload } from "lucide-react";
import { ToolTone, useDataTools } from "../../../services/dashboard";
import { Button, Card, CardBody, CardNote, CardTitle, cn } from "../ui";
import {
  BUSY_LABEL,
  EXPORT_HINT,
  EXPORT_LABEL,
  FILE_ACCEPT,
  IMPORT_HINT,
  IMPORT_LABEL,
  REBUILD_HINT,
  REBUILD_LABEL,
  TOOLS_NOTE,
  TOOLS_TITLE,
} from "./constants";

export * from "./constants";

function Action({
  icon,
  label,
  hint,
  busy,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" disabled={busy} onClick={onClick}>
        {icon}
        {label}
      </Button>
      <p className="m-0 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function DataTools() {
  const { busy, status, exportAll, importFile, rebuild } = useDataTools();
  const picker = useRef<HTMLInputElement>(null);

  const onPick = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Cleared straight away, so choosing the same file twice still fires.
    event.target.value = "";
    if (file) void importFile(file);
  };

  return (
    <Card>
      <CardBody>
        <CardTitle>{TOOLS_TITLE}</CardTitle>
        <CardNote className="mb-5">{TOOLS_NOTE}</CardNote>

        <div className="grid gap-5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[760px]:grid-cols-1">
          <Action
            icon={<Download />}
            label={EXPORT_LABEL}
            hint={EXPORT_HINT}
            busy={busy}
            onClick={() => void exportAll()}
          />
          <Action
            icon={<Upload />}
            label={IMPORT_LABEL}
            hint={IMPORT_HINT}
            busy={busy}
            onClick={() => picker.current?.click()}
          />
          <Action
            icon={<RefreshCw className={busy ? "animate-spin" : undefined} />}
            label={REBUILD_LABEL}
            hint={REBUILD_HINT}
            busy={busy}
            onClick={() => void rebuild()}
          />
        </div>

        {/* Opened through the button beside it, so it is never seen. */}
        <input ref={picker} className="hidden" type="file" accept={FILE_ACCEPT} onChange={onPick} />

        {busy ? (
          <p className="mt-5 mb-0 border-t border-line pt-4 text-sm text-muted">{BUSY_LABEL}</p>
        ) : null}

        {!busy && status ? (
          <p
            role="status"
            className={cn(
              "mt-5 mb-0 border-t border-line pt-4 text-sm",
              status.tone === ToolTone.Error ? "text-wrong" : "text-ink",
            )}
          >
            {status.text}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
