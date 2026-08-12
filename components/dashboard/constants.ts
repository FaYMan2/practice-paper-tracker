/** Labels and chart colours for the dashboard. */

/**
 * Chart fills. Duplicated from the CSS tokens because Recharts takes colours as
 * props rather than from a stylesheet; these three must stay in step with
 * `--correct`, `--wrong` and `--left` in `theme.css`.
 */
export const CHART_COLOR = {
  correct: "#15803d",
  wrong: "#dc2626",
  left: "#d6d3d1",
  accent: "#c15f3c",
} as const;

export const STATUS_LABEL = {
  correct: "Correct",
  wrong: "Wrong",
  left: "Not attempted",
} as const;

export const PAGE_TITLE = "PracticePaper Tracker";

export const PAGE_SUBTITLE = "GATE CSE previous-year progress, kept on this machine.";

export const EMPTY_TITLE = "Nothing recorded yet";

export const EMPTY_BODY =
  "Open the topic-wise practice page on practicepaper.in and every subject appears here. " +
  "Solve a question and its topic starts filling in.";

export const INDEX_PAGE_LABEL = "Open the topic list";

export const LOADING_LABEL = "Reading your progress…";

export const PARTIAL_INDEX_NOTE = "partially indexed";

export const NOT_STARTED = "not started";

export const NO_QUESTIONS_LABEL = "No questions match this filter.";

export const NOT_INDEXED_LABEL =
  "No questions indexed yet — open a page of this topic and they appear here.";

export const LOADING_QUESTIONS_LABEL = "Loading questions…";

export const CLOSE_LABEL = "Close";

/** Shown on a subject card when the site's own question count is unknown. */
export const UNKNOWN_TOTAL = "?";
