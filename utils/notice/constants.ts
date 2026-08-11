/** The in-page notice banner. */

export const NOTICE_ID = "pptr-notice";

/**
 * Inline styles rather than a stylesheet: this has to render correctly even
 * when the page's own CSS is hostile, and it is the one piece of UI whose
 * failure mode is the user silently losing practice records.
 */
export const NOTICE_STYLE = [
  "position:fixed",
  "z-index:2147483647",
  "bottom:16px",
  "left:16px",
  "max-width:360px",
  "padding:12px 14px",
  "border-radius:8px",
  "border:1px solid #7c2d12",
  "background:#fff7ed",
  "color:#7c2d12",
  "font:14px/1.45 system-ui,sans-serif",
  "box-shadow:0 4px 16px rgba(0,0,0,.18)",
].join(";");

export const BUTTON_STYLE = [
  "margin-left:10px",
  "padding:3px 10px",
  "border:1px solid #7c2d12",
  "border-radius:5px",
  "background:#7c2d12",
  "color:#fff",
  "font:inherit",
  "cursor:pointer",
].join(";");

export const CONTEXT_INVALIDATED_MESSAGE =
  "PracticePaper Tracker was updated, so this page is no longer being tracked. Reload to resume.";

export const WRITE_FAILED_MESSAGE =
  "PracticePaper Tracker could not save your last answer.";
