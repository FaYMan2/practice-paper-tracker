/**
 * A single in-page banner for problems the user must act on.
 *
 * The case this exists for: after the extension reloads or updates, content
 * scripts already injected into open tabs are orphaned and every write throws.
 * Silently catching that would mean a study session's answers vanish with no
 * indication, so it becomes visible and offers the reload that fixes it.
 */

import "./Notice.css";

import { CLS } from "../../utils/selectors";
import { NOTICE_ID, UI_CLASS } from "../constants";
import { el } from "../util";
import { RELOAD_LABEL } from "./constants";

export * from "./constants";

function ReloadButton(doc: Document): HTMLElement {
  const button = el(doc, "button", UI_CLASS.noticeAction, RELOAD_LABEL);
  button.setAttribute("type", "button");
  button.addEventListener("click", () => doc.location.reload());
  return button;
}

/** Idempotent: repeated failures update the banner rather than stacking it. */
export function showNotice(doc: Document, message: string, offerReload = false): void {
  const existing = doc.getElementById(NOTICE_ID);
  const banner = existing ?? el(doc, "div", `${CLS.ours} ${UI_CLASS.notice}`);

  if (!existing) {
    banner.id = NOTICE_ID;
    banner.setAttribute("role", "status");
    doc.body?.appendChild(banner);
  }

  banner.replaceChildren(message);
  if (offerReload) banner.appendChild(ReloadButton(doc));
}

export function hideNotice(doc: Document): void {
  doc.getElementById(NOTICE_ID)?.remove();
}
