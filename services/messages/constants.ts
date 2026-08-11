/** Defaults and literals used by the background message services. */

import type { TopicRecord } from "../../types";

/** A topic row before anything is known about it. */
export const BLANK_TOPIC: Omit<TopicRecord, "slug"> = {
  title: null,
  parentSlug: null,
  totalFromSite: null,
  totalMarksFromSite: null,
  lastAnsweredOrdinal: null,
  lastVisitedPage: null,
  indexedPages: [],
  updatedAt: 0,
};

export const BADGE_WARNING_TEXT = "!";

export const BADGE_WARNING_COLOR = "#c2410c";
