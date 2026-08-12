/** Labels for the two navigation controls. */

import type { ResumePlan } from "../../../utils/resume";

export const ACTION_LABEL: Record<ResumePlan["kind"], string> = {
  next: "Resume",
  last: "Last attempt",
};

export const ACTION_TOOLTIP: Record<ResumePlan["kind"], string> = {
  next: "First question with no attempt",
  last: "Furthest question attempted",
};
