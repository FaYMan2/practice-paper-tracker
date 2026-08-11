/**
 * A single in-page banner for problems the user must act on.
 *
 * The case this exists for: after the extension reloads or updates, content
 * scripts already injected into open tabs are orphaned and every write throws.
 * Silently catching that would mean a study session's answers vanish with no
 * indication, so it becomes visible and offers the reload that fixes it.
 */

import { BUTTON_STYLE, NOTICE_ID, NOTICE_STYLE } from "./constants";

export * from "./constants";

/** Idempotent: repeated failures update the banner rather than stacking it. */
export function showNotice(doc: Document, message: string, offerReload = false): void {
  const existing = doc.getElementById(NOTICE_ID);
  const banner = existing ?? doc.createElement("div");

  if (!existing) {
    banner.id = NOTICE_ID;
    banner.setAttribute("style", NOTICE_STYLE);
    banner.setAttribute("role", "status");
    doc.body?.appendChild(banner);
  }

  banner.textContent = message;
  if (!offerReload) return;

  const reload = doc.createElement("button");
  reload.type = "button";
  reload.textContent = "Reload";
  reload.setAttribute("style", BUTTON_STYLE);
  reload.addEventListener("click", () => doc.location.reload());
  banner.appendChild(reload);
}

export function hideNotice(doc: Document): void {
  doc.getElementById(NOTICE_ID)?.remove();
}
