/** Labels and chart colours for the dashboard. */

import { SubjectView } from "../../utils/dashboard";
import type { SegmentedOption } from "./ui";

/**
 * Chart fills. Duplicated from the CSS tokens because Recharts takes colours as
 * props rather than from a stylesheet; these three must stay in step with
 * `--correct`, `--wrong` and `--left` in `theme.css`.
 */
/*
 * Chart colours as tokens, not hex.
 *
 * Recharts writes these straight into `fill`, and a literal `#15803d` cannot
 * know the page went dark. These are the same variables every other surface
 * paints from, so the donut and the bars follow the theme without a second
 * palette to keep in step.
 */
export const CHART_COLOR = {
  correct: "var(--color-correct)",
  wrong: "var(--color-wrong)",
  warn: "var(--color-warn)",
  left: "var(--color-remaining)",
  accent: "var(--color-accent)",
  axis: "var(--color-muted)",
  label: "var(--color-faint)",
} as const;

export const STATUS_LABEL = {
  correct: "Correct",
  wrong: "Wrong",
  left: "Not attempted",
} as const;

/** Target of the skip link, and the landmark it jumps to. */
export const MAIN_ID = "dashboard-main";

export const SKIP_LABEL = "Skip to content";

export const PAGE_TITLE = "PracticePaper Tracker";

export const PAGE_SUBTITLE = "GATE CSE previous-year progress, kept on this machine.";

export const EMPTY_TITLE = "Nothing recorded yet";

export const EMPTY_BODY =
  "Open the topic-wise practice page on practicepaper.in and every subject appears here. " +
  "Solve a question and its topic starts filling in.";

export const INDEX_PAGE_LABEL = "Open the topic list";

export const LOADING_LABEL = "Reading your progress…";

/**
 * Said in a tooltip rather than printed on every row.
 *
 * It used to be the words "partially indexed" in warning amber beside five
 * topics out of seven, which spent an attention colour on the normal state of
 * a lazily indexed site. The "≥" in front of the count already says it.
 */
export const PARTIAL_INDEX_TITLE = (seen: number, total: number | string): string =>
  `${seen} of ${total} questions have been seen, so these counts are a floor rather than a total.`;

/**
 * The label under an average time, carrying its own sample size.
 *
 * "avg of 11 timed" rather than a bare "avg time", because most questions are
 * never timed and an average over three of them is a different claim from one
 * over thirty. Putting the count in the label costs no column and means the
 * figure cannot be read without it.
 */
export const TIMED_STAT_LABEL = (timed: number): string => `avg of ${timed} timed`;

/** Says how much evidence an average rests on, since most questions are untimed. */
export const AVERAGED_OVER_TITLE = (timed: number): string =>
  `Averaged over ${timed} timed ${timed === 1 ? "question" : "questions"}.`;

export const NOT_TIMED_TITLE = "Nothing here has been timed yet.";

/** Column headings for the topic table. */
export const COLUMNS = {
  topic: "Topic",
  coverage: "Coverage",
  accuracy: "Accuracy",
  firstTry: "First try",
  avgTime: "Avg time",
  avgTimeTitle:
    "Average of the questions here you timed with the stopwatch on the page. Questions you never timed are left out rather than counted as instant.",
  lastSolved: "Last solved",
  actions: "Actions",
} as const;

export const NOT_STARTED = "not started";

export const NO_QUESTIONS_LABEL = "No questions match this filter.";

export const NOT_INDEXED_LABEL =
  "No questions indexed yet. Open a page of this topic and they appear here.";

export const LOADING_QUESTIONS_LABEL = "Loading questions…";

export const CLOSE_LABEL = "Close";

/** Shown on a subject card when the site's own question count is unknown. */
export const UNKNOWN_TOTAL = "?";

/**
 * The two ways to look at the subject grid.
 *
 * "Started" rather than "In progress": a subject you have finished is still one
 * you want to see, and "in progress" would read as excluding it.
 */
export const SUBJECT_VIEWS: SegmentedOption<SubjectView>[] = [
  { value: SubjectView.Started, label: "Started" },
  { value: SubjectView.All, label: "All subjects" },
];

export const SUBJECT_VIEW_LABEL = "Which subjects to show";

/** Follows the count of subjects the "Started" view is leaving out. */
export const UNSTARTED_HINT = "not started yet";

/** Follows the count when opening the dashboard found records out of step. */
export const REPAIRED_NOTE =
  "had drifted from the answer log and were repaired. The figures below are the corrected ones.";
