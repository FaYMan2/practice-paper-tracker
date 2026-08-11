/** Recording selector failures and surfacing them on the toolbar. */

import { browser } from "wxt/browser";
import { recordDiagnostic } from "../../utils/db";
import type { MessageKind } from "../../utils/messaging";
import type { DiagnosticRecord, ResponseMap } from "../../types";
import { BADGE_WARNING_COLOR, BADGE_WARNING_TEXT } from "./constants";

async function setBadge(warn: boolean): Promise<void> {
  try {
    await browser.action.setBadgeText({ text: warn ? BADGE_WARNING_TEXT : "" });
    if (warn) await browser.action.setBadgeBackgroundColor({ color: BADGE_WARNING_COLOR });
  } catch {
    // The badge is a nicety; never let it break a write path.
  }
}

export async function reportDiagnostic(
  entry: Omit<DiagnosticRecord, "id">,
): Promise<ResponseMap[MessageKind.ReportDiagnostic]> {
  await recordDiagnostic(entry);
  await setBadge(true);

  const acknowledged: ResponseMap[MessageKind.ReportDiagnostic] = { ok: true };
  return acknowledged;
}
