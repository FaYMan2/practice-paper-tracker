/**
 * Class names and element ids shared across the injected UI.
 *
 * Every class is namespaced `pptr-`, which matters beyond tidiness: the
 * capture observer uses that prefix to tell our own repaints apart from the
 * site marking a question answered.
 */

export const STRIP_ID = "pptr-progress";
export const NOTICE_ID = "pptr-notice";

export const UI_CLASS = {
  badge: "pptr-badge",
  strip: "pptr-strip",
  stripItem: "pptr-strip-item",
  stripLabel: "pptr-strip-label",
  stripNote: "pptr-strip-note",
  stripActions: "pptr-strip-actions",
  resume: "pptr-resume",
  /** The "last attempt" link, styled as the lesser of the two actions. */
  resumeSecondary: "pptr-resume-secondary",
  topicBadge: "pptr-topic-badge",
  notice: "pptr-notice",
  noticeAction: "pptr-notice-action",
  /** Briefly outlines the question a resume link landed on. */
  focus: "pptr-focus",
} as const;
