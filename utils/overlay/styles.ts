/** The single stylesheet backing every overlay component. */

import { OVERLAY_CSS, STYLE_ID } from "./constants";
import { el } from "./util";

export function injectStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = el(doc, "style");
  style.id = STYLE_ID;
  style.textContent = OVERLAY_CSS;
  (doc.head ?? doc.documentElement).appendChild(style);
}
