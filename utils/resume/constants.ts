/** Resume behaviour constants. */

/**
 * LiteSpeed lazy-loads the question images, so the page reflows for a moment
 * after we scroll. A second scroll once things settle keeps the target on
 * screen instead of pushed above the fold.
 */
export const RESCROLL_DELAY_MS = 800;

/** How long the landed-on question stays highlighted. */
export const FOCUS_HIGHLIGHT_MS = 2_500;

export const RESUME_LABEL_PREFIX = "Resume at question";

export const LAST_ATTEMPT_LABEL_PREFIX = "Last attempt: question";

/** Compact forms for the index page, where ~100 topics are listed. */
export const SHORT_LABEL = {
  next: "Resume",
  last: "Last",
} as const;

/** Reported when the fragment names a question that is not on the page. */
export const RESUME_MISS_DIAGNOSTIC = "resume-target-missing";
