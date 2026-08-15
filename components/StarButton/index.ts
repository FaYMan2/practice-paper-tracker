/**
 * The flag beside a question, for the ones worth coming back to.
 *
 * The only piece of state in the extension the user sets directly: everything
 * else is derived from what the site reported when a question was answered.
 */

import "./StarButton.css";

import { CLS } from "../../utils/selectors";
import { UI_CLASS } from "../constants";
import { el } from "../util";
import { STAR_GLYPH, STAR_TITLE } from "./constants";

export * from "./constants";

export function StarButton(
  doc: Document,
  goId: string,
  starred: boolean,
  onStar: (goId: string, starred: boolean) => void,
): HTMLElement {
  const on = starred ? ` ${UI_CLASS.starOn}` : "";
  const button = el(
    doc,
    "button",
    `${CLS.ours} ${UI_CLASS.star}${on}`,
    starred ? STAR_GLYPH.on : STAR_GLYPH.off,
  );

  button.setAttribute("type", "button");
  button.setAttribute("aria-pressed", String(starred));
  button.title = starred ? STAR_TITLE.on : STAR_TITLE.off;

  // Repainting is left to the caller, which re-reads what the background
  // actually stored rather than assuming the write landed.
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onStar(goId, !starred);
  });

  return button;
}
