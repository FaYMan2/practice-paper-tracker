/** Labels for the drill-down. */

import type { QuestionStatus } from "../../../types";

export const STATUS_TEXT: Record<QuestionStatus, string> = {
  correct: "Correct",
  wrong: "Wrong",
  unattempted: "Not attempted",
};
