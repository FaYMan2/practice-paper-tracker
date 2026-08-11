/**
 * The progress header above the question list.
 *
 * Replaces the site's own counters, which live in `sessionStorage`, are shared
 * across every topic, and are divided by a per-topic denominator — so they go
 * wrong the moment you open a second topic.
 */

import { CLS, SEL } from "../selectors";
import type { TopicSummary } from "../../types";
import {
  NO_PROGRESS_NOTE,
  OVERLAY_CLASS,
  PARTIAL_INDEX_NOTE,
  STRIP_ID,
  STRIP_LABEL,
} from "./constants";
import { el, mountBefore } from "./util";

function StripLabel(doc: Document): HTMLElement {
  return el(doc, "span", OVERLAY_CLASS.stripLabel, STRIP_LABEL);
}

function StripItem(doc: Document, value: string, label: string): HTMLElement {
  const item = el(doc, "span", OVERLAY_CLASS.stripItem);
  item.append(el(doc, "b", undefined, value), ` ${label}`);
  return item;
}

function StripNote(doc: Document, text: string, tooltip?: string): HTMLElement {
  const note = el(doc, "span", OVERLAY_CLASS.stripNote, text);
  if (tooltip) note.title = tooltip;
  return note;
}

/** "12 / 465", or "at least 12 / 465" while rows are still being discovered. */
function attemptedValue(summary: TopicSummary): string {
  const solved = summary.fullyIndexed
    ? `${summary.solvedRows}`
    : `at least ${summary.solvedRows}`;
  return summary.totalFromSite === null ? solved : `${solved} / ${summary.totalFromSite}`;
}

function CountItems(doc: Document, summary: TopicSummary): HTMLElement[] {
  const items = [
    StripItem(doc, attemptedValue(summary), "attempted"),
    StripItem(doc, `${summary.correctRows}`, "correct"),
    StripItem(doc, `${summary.wrongRows}`, "wrong"),
  ];

  if (summary.totalMarksFromSite !== null) {
    items.push(
      StripItem(doc, `${summary.marksEarned} / ${summary.totalMarksFromSite}`, "marks"),
    );
  }
  return items;
}

function PartialIndexNote(doc: Document, summary: TopicSummary): HTMLElement {
  return StripNote(
    doc,
    PARTIAL_INDEX_NOTE,
    `${summary.indexedRows} of ${summary.totalFromSite ?? "?"} questions in this topic ` +
      "have been seen, so counts are a floor rather than a total.",
  );
}

function stripChildren(doc: Document, summary: TopicSummary | null): HTMLElement[] {
  if (!summary || summary.solvedRows === 0) {
    return [StripLabel(doc), StripNote(doc, NO_PROGRESS_NOTE)];
  }

  return [
    StripLabel(doc),
    ...CountItems(doc, summary),
    ...(summary.fullyIndexed ? [] : [PartialIndexNote(doc, summary)]),
  ];
}

/** Builds a detached strip. Exported so it can be rendered without mounting. */
export function renderProgressStrip(
  doc: Document,
  summary: TopicSummary | null,
): HTMLElement {
  const strip = el(doc, "div", `${CLS.ours} ${OVERLAY_CLASS.strip}`);
  strip.id = STRIP_ID;
  strip.append(...stripChildren(doc, summary));
  return strip;
}

/** Mounts the strip above the question list, replacing any previous one. */
export function paintProgressStrip(doc: Document, summary: TopicSummary | null): void {
  const area = doc.querySelector(SEL.quizArea);
  if (!area) return;
  mountBefore(doc, STRIP_ID, area, renderProgressStrip(doc, summary));
}
