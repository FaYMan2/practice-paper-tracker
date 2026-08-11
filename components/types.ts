/** Types shared by the injected UI components. */

import type { QuestionMark } from "../types";

/** How a question should be marked, once the current topic is taken into account. */
export type MarkerKind = "solved" | "wrong" | "elsewhere";

export interface MarkerView {
  kind: MarkerKind;
  glyph: string;
  label: string;
  /** Tooltip: attempt count, when, and which other topics it was answered in. */
  tooltip: string;
}

/** A question on the page, reduced to what painting needs. */
export interface PaintTarget {
  element: Element;
  goId: string;
}

export interface PaintMarkersInput {
  /** Every question currently on the page, in document order. */
  questions: PaintTarget[];
  marks: Record<string, QuestionMark>;
  topicSlug: string;
  /** Slug -> display title, for naming the topic a question was solved under. */
  topicTitles: Record<string, string | null>;
}
