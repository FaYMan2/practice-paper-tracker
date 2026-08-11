/** The controls that reopen a topic at a particular question. */

import "./ResumeLink.css";

import { SHORT_LABEL } from "../../utils/resume";
import { CLS } from "../../utils/selectors";
import type { ResumePlan } from "../../utils/resume";
import { UI_CLASS } from "../constants";
import { el } from "../util";

const TOOLTIP: Record<ResumePlan["kind"], string> = {
  next: "The first question you have not attempted",
  last: "The furthest question you have attempted",
};

/**
 * A plain anchor rather than a button with a click handler: the target is a
 * real URL, so middle-click and open-in-new-tab keep working, and no
 * JavaScript is needed for the navigation itself.
 *
 * "Last attempt" renders unfilled so the two controls do not compete.
 */
export function ResumeLink(doc: Document, plan: ResumePlan, label = plan.label): HTMLElement {
  const secondary = plan.kind === "last" ? ` ${UI_CLASS.resumeSecondary}` : "";
  const link = el(doc, "a", `${CLS.ours} ${UI_CLASS.resume}${secondary}`, label);

  link.setAttribute("href", plan.href);
  link.title = `${TOOLTIP[plan.kind]} — page ${plan.pageNo}, question ${plan.ordinal}`;
  return link;
}

/** The compact form used on the index page, where ~100 topics are listed. */
export function CompactResumeLink(doc: Document, plan: ResumePlan): HTMLElement {
  return ResumeLink(doc, plan, SHORT_LABEL[plan.kind]);
}
