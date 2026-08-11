/** Capture wiring constants. */

/**
 * `attributeOldValue` is not optional. Without comparing against the previous
 * class list, LiteSpeed's lazy-image class flips and the ad containers inside
 * the question area fire this observer constantly.
 */
export const STAMP_OBSERVER_OPTIONS: MutationObserverInit = {
  subtree: true,
  attributes: true,
  attributeFilter: ["class"],
  attributeOldValue: true,
};

/**
 * The click listener runs in the capture phase so it sees the option *before*
 * the site's own bubble-phase handler marks the question answered.
 */
export const CLICK_LISTENER_OPTIONS: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

/** The site's marker for "this question already counted". */
export const ANSWERED = "true";

/** The site's marker for "this NAT answer already checked". */
export const NAT_CHECKED = "1";

/** `tr.mtq_clickable[data-value]` value meaning the option is correct. */
export const CORRECT_OPTION = "1";
