/** Labels for the drill-down. */

import type { QuestionStatus } from "../../../types";

export const STATUS_TEXT: Record<QuestionStatus, string> = {
  correct: "Correct",
  wrong: "Wrong",
  unattempted: "Not attempted",
};

export const STARRED_TITLE = "Starred on the page";

export const TIMED_TITLE = "How long this took, the last time you timed it";
