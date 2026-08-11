/**
 * Lazy indexing: every question seen on a page load is recorded, answered or
 * not.
 *
 * This is what lets a topic's numerator be counted in the same unit as the
 * site's own "out of N" denominator — rows, not distinct questions — and it
 * costs nothing beyond a read of markup already in the DOM.
 */

import * as R from "ramda";
import {
  describeQuestions,
  pageTitle,
  totalMarksFromArea,
  totalQuestionsFromStatus,
} from "../selectors";
import type { QuestionDescriptor } from "../selectors";
import type { ObservedRow, PageObservation } from "../../types";

function toObservedRow(descriptor: QuestionDescriptor): ObservedRow | null {
  // A row is a position within a topic, so one without an ordinal has no
  // position to record. The question itself is still captured on answer.
  if (descriptor.ordinal === null) return null;

  const row: ObservedRow = {
    ordinal: descriptor.ordinal,
    goId: descriptor.goId,
    examSlug: descriptor.examSlug,
    type: descriptor.type,
    marks: descriptor.marks,
  };
  return row;
}

export function observePage(
  doc: Document,
  topicSlug: string,
  pageNo: number,
): PageObservation {
  const rows = describeQuestions(doc, topicSlug).map(toObservedRow);

  const observation: PageObservation = {
    topicSlug,
    title: pageTitle(doc),
    pageNo,
    // Re-read every visit: both totals grow as each new exam year is added.
    totalFromSite: totalQuestionsFromStatus(doc),
    totalMarksFromSite: totalMarksFromArea(doc),
    rows: R.filter(R.isNotNil, rows),
  };
  return observation;
}
