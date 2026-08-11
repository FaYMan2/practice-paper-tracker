/**
 * Returning to a topic, by either of the two things "where I left off" can mean.
 *
 * **Resume** aims at the first question with no attempt — where to carry on.
 * **Last attempt** aims at the furthest question answered — where you actually
 * stopped.
 *
 * These are the same question until you skip a hard one, and then they are not:
 * resume keeps pointing back at the gap while your real progress moves on. Both
 * are useful, so both are offered rather than picking a winner.
 */

import { buildResumeUrl, pageForOrdinal } from "../url";
import type { QuestionDescriptor } from "../selectors";
import type { ResumeHashTarget } from "../url";
import type { TopicSummary } from "../../types";
import {
  FOCUS_HIGHLIGHT_MS,
  LAST_ATTEMPT_LABEL_PREFIX,
  RESCROLL_DELAY_MS,
  RESUME_LABEL_PREFIX,
} from "./constants";
import type { ResumeOutcome, ResumePlan, ResumePlanKind } from "./types";

export * from "./constants";
export type * from "./types";

/**
 * Whether a topic has been worked on at all.
 *
 * Both controls require this: with nothing answered, either would just mean
 * page one, which is where the user already is.
 */
export function canResume(summary: TopicSummary | null): summary is TopicSummary {
  return summary !== null && summary.lastAnsweredOrdinal !== null;
}

function buildPlan(
  kind: ResumePlanKind,
  slug: string,
  ordinal: number,
  goId: string | null,
  labelPrefix: string,
): ResumePlan {
  const plan: ResumePlan = {
    kind,
    slug,
    ordinal,
    pageNo: pageForOrdinal(ordinal),
    goId,
    href: buildResumeUrl(slug, { ordinal, goId }),
    label: `${labelPrefix} ${ordinal}`,
  };
  return plan;
}

/**
 * Carry on: the first question with no attempt.
 *
 * Null once the topic is finished, and null before it is started.
 */
export function resumePlan(summary: TopicSummary | null): ResumePlan | null {
  if (!canResume(summary) || summary.firstUnattemptedOrdinal === null) return null;

  return buildPlan(
    "next",
    summary.slug,
    summary.firstUnattemptedOrdinal,
    summary.firstUnattemptedGoId,
    RESUME_LABEL_PREFIX,
  );
}

/**
 * Go back: the furthest question answered.
 *
 * Unlike resume, this keeps moving as you work through a topic even when
 * earlier questions were skipped.
 */
export function lastAttemptPlan(summary: TopicSummary | null): ResumePlan | null {
  if (!canResume(summary)) return null;

  return buildPlan(
    "last",
    summary.slug,
    summary.lastAnsweredOrdinal!,
    summary.lastAnsweredGoId,
    LAST_ATTEMPT_LABEL_PREFIX,
  );
}

/** Both controls, in the order they should be shown. Empty when untouched. */
export function navigationPlans(summary: TopicSummary | null): ResumePlan[] {
  const plans = [resumePlan(summary), lastAttemptPlan(summary)];
  return plans.filter((plan): plan is ResumePlan => plan !== null);
}

/**
 * Finds the question a resume fragment points at.
 *
 * The goId is authoritative; the ordinal is only a fallback, because adding a
 * new exam year shifts every ordinal after it while the GateOverflow id of a
 * question never changes.
 */
export function findResumeTarget(
  questions: QuestionDescriptor[],
  target: ResumeHashTarget,
): ResumeOutcome {
  const byGoId = target.goId
    ? questions.find((question) => question.goId === target.goId)
    : undefined;
  if (byGoId) {
    const matched: ResumeOutcome = { match: "goId", element: byGoId.element };
    return matched;
  }

  const byOrdinal = target.ordinal
    ? questions.find((question) => question.ordinal === target.ordinal)
    : undefined;
  if (byOrdinal) {
    const matched: ResumeOutcome = { match: "ordinal", element: byOrdinal.element };
    return matched;
  }

  const missed: ResumeOutcome = { match: "none", element: null };
  return missed;
}

/**
 * Scrolls twice on purpose: the lazy-loaded question images resolve after the
 * first scroll and push the target off screen, so the position is corrected
 * once the page has settled.
 */
export function scrollToQuestion(element: Element, highlightClass?: string): void {
  const settle = (): void => element.scrollIntoView({ block: "center" });
  settle();
  setTimeout(settle, RESCROLL_DELAY_MS);

  if (!highlightClass) return;
  element.classList.add(highlightClass);
  setTimeout(() => element.classList.remove(highlightClass), FOCUS_HIGHLIGHT_MS);
}
