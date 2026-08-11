/** Types local to resuming a topic. */

/** How the question on the page was matched to the fragment. */
export type ResumeMatch = "goId" | "ordinal" | "none";

export interface ResumeOutcome {
  match: ResumeMatch;
  element: Element | null;
}

/**
 * Which question a navigation control aims at.
 *
 * `next` is the first question with no attempt — where to carry on.
 * `last` is the furthest question answered — where you actually stopped.
 * They diverge as soon as a hard question is skipped, which is why both exist.
 */
export type ResumePlanKind = "next" | "last";

/** Everything the resume UI needs about a topic, derived from its summary. */
export interface ResumePlan {
  kind: ResumePlanKind;
  slug: string;
  ordinal: number;
  /** The page holding `ordinal`, at five questions per page. */
  pageNo: number;
  goId: string | null;
  href: string;
  label: string;
}
