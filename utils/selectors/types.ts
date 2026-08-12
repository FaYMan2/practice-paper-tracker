/** Types local to DOM extraction and the integrity check. */

import type { QuestionType } from "../../types";
import type { SelfCheckIssueKind } from "./constants";

/**
 * One question block, read once into the fields every later phase needs.
 *
 * `goId` is the GateOverflow id where one exists and a synthetic `pp:` key
 * where it does not, so a solve is never dropped for want of an identifier.
 */
export interface QuestionDescriptor {
  element: Element;
  goId: string;
  ordinal: number | null;
  type: QuestionType;
  marks: number;
  examSlug: string | null;
  /** Other topics the site files this question under, from its own links. */
  relatedSlugs: string[];
  provisional: boolean;
}

/** A topic anchor on the index page, paired with the slug it points at. */
export interface TopicLink {
  element: Element;
  slug: string;
}

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
