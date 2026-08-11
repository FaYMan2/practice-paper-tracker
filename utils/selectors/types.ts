/** Types local to DOM extraction and the integrity check. */

import type { SelfCheckIssueKind } from "./constants";

/** The two links under a question, disambiguated by slug shape. */
export interface QuestionLinks {
  /** Null on a year page, which never names its own year. */
  examSlug: string | null;
  relatedSlugs: string[];
}

export interface SelfCheckIssue {
  kind: SelfCheckIssueKind;
  detail: string;
}

/** What one question block looks like to the integrity check. */
export interface BlockInspection {
  goIdCount: number;
  hasOrdinal: boolean;
  hasKnownType: boolean;
}

/** A named predicate over `BlockInspection`, counted across the page. */
export interface BlockCheck {
  kind: SelfCheckIssueKind;
  failed: (inspection: BlockInspection) => boolean;
}
