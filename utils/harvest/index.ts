/**
 * Lazy indexing: every question seen on a page load is recorded, answered or
 * not.
 *
 * This is what lets a topic's numerator be counted in the same unit as the
 * site's own "out of N" denominator — rows, not distinct questions — and it
 * costs nothing beyond a read of markup already in the DOM.
 */

import * as R from "ramda";
import { cleanTopicTitle } from "../format";
import {
  describeQuestions,
  pageTitle,
  totalMarksFromArea,
  totalQuestionsFromStatus,
} from "../selectors";
import type { QuestionDescriptor } from "../selectors";
import type { ObservedRow, PageObservation } from "../../types";

/**
 * The topics the site files this question under, other than the page we are
 * on. On a topic page that is the chapter link beneath the question — a
 * Probability Theory question listed on the Discrete Mathematics page says so
 * itself — which is how progress reaches a topic whose own pages have never
 * been opened.
 */
function relatedSlugsFor(descriptor: QuestionDescriptor, topicSlug: string): string[] {
  return descriptor.relatedSlugs.filter((slug) => slug !== topicSlug);
}

function toObservedRow(descriptor: QuestionDescriptor, topicSlug: string): ObservedRow | null {
  // A row is a position within a topic, so one without an ordinal has no
  // position to record. The question itself is still captured on answer.
  if (descriptor.ordinal === null) return null;

  const row: ObservedRow = {
    ordinal: descriptor.ordinal,
    goId: descriptor.goId,
    examSlug: descriptor.examSlug,
    type: descriptor.type,
    marks: descriptor.marks,
    relatedSlugs: relatedSlugsFor(descriptor, topicSlug),
  };
  return row;
}

export function observePage(
  doc: Document,
  topicSlug: string,
  pageNo: number,
): PageObservation {
  const rows = describeQuestions(doc, topicSlug).map((descriptor) =>
    toObservedRow(descriptor, topicSlug),
  );

  const observation: PageObservation = {
    topicSlug,
    title: cleanTopicTitle(pageTitle(doc)),
    pageNo,
    // Re-read every visit: both totals grow as each new exam year is added.
    totalFromSite: totalQuestionsFromStatus(doc),
    totalMarksFromSite: totalMarksFromArea(doc),
    rows: R.filter(R.isNotNil, rows),
  };
  return observation;
}
