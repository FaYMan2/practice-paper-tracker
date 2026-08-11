/** Types local to URL parsing. */

export type PageKind = "topic" | "year" | "index" | "other";

export interface PageInfo {
  kind: PageKind;
  /** Slug after /gate-cse/, host- and case-normalised. Null when off-section. */
  slug: string | null;
  /** 1-based; absent `page_no` means page 1. Null for non-question pages. */
  pageNo: number | null;
  /** Resume target parsed out of the fragment, if present. */
  resume: ResumeHashTarget | null;
}

/**
 * A decoded `#pptr-resume=` fragment. The goId is preferred and the ordinal is
 * the fallback, because ordinals shift when a new exam year is added.
 */
export interface ResumeHashTarget {
  goId: string | null;
  ordinal: number | null;
}

/** What a caller supplies to build a resume link. */
export interface ResumeLinkTarget {
  ordinal: number;
  goId?: string | null;
}
