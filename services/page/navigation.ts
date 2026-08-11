/** Acting on a resume link once the page has loaded. */

import { UI_CLASS } from "../../components";
import { reportDiagnostic } from "../../utils/messaging";
import { RESUME_MISS_DIAGNOSTIC, findResumeTarget, scrollToQuestion } from "../../utils/resume";
import { parseResumeHash } from "../../utils/url";
import type { QuestionDescriptor } from "../../utils/selectors";
import type { ResumeHashTarget } from "../../utils/url";
import type { QuestionPageContext } from "./types";

/** Scrolls to the question a resume link pointed at. */
export function applyResume(
  context: QuestionPageContext,
  target: ResumeHashTarget | null,
): void {
  if (!target) return;

  const outcome = findResumeTarget(context.questions, target);
  if (!outcome.element) {
    // Ordinals shift when a new exam year is added, so a stale link is an
    // occasional expectation rather than a bug. Leave the user at the top.
    console.warn("[pptr] resume target not on this page", target);
    void reportDiagnostic(
      RESUME_MISS_DIAGNOSTIC,
      `goId=${target.goId ?? "-"} ordinal=${target.ordinal ?? "-"}`,
      context.href,
    );
    return;
  }

  scrollToQuestion(outcome.element, UI_CLASS.focus);
  console.info("[pptr] resumed by", outcome.match);
}

/**
 * Handles a resume link whose target is already on this page.
 *
 * Clicking it changes only the fragment, so the browser does not reload and
 * the content script never runs again — without this the link would appear to
 * do nothing.
 */
export function followResumeHash(context: QuestionPageContext): void {
  context.doc.defaultView?.addEventListener("hashchange", () => {
    applyResume(context, parseResumeHash(context.doc.location.hash));
  });
}
