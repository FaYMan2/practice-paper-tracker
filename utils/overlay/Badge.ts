/**
 * The marker shown beside a question that has been answered before.
 *
 * Never writes the site's `mtq_correct_stamp` / `mtq_wrong_stamp` classes: the
 * capture observer watches those, so painting them would record a phantom
 * attempt for a question the user never answered.
 */

import { formatDate, pluralize, topicDisplayName } from "../format";
import { CLS, SEL } from "../selectors";
import type { QuestionMark, Verdict } from "../../types";
import { GLYPH, OVERLAY_CLASS } from "./constants";
import type { MarkerKind, MarkerView, PaintMarkersInput, PaintTarget } from "./types";
import { el } from "./util";

const MARKER_CLASS: Record<MarkerKind, string> = {
  solved: CLS.solved,
  wrong: CLS.wrong,
  elsewhere: CLS.elsewhere,
};

function verdictLabel(status: Verdict): string {
  return status === "correct" ? "Correct" : "Wrong";
}

function verdictGlyph(status: Verdict): string {
  return status === "correct" ? GLYPH.correct : GLYPH.wrong;
}

/** "2 attempts, last 11 Aug 2026". */
function attemptHistory(mark: QuestionMark): string {
  const attempts = pluralize(mark.attemptCount, "attempt");
  const when = formatDate(mark.lastAttemptAt);
  return when ? `${attempts}, last ${when}` : attempts;
}

/** Display names of the topics this question was answered under, bar the current one. */
function otherTopicNames(
  mark: QuestionMark,
  topicSlug: string,
  titles: Record<string, string | null>,
): string[] {
  return mark.answeredIn
    .filter((slug) => slug !== topicSlug)
    .map((slug) => topicDisplayName(slug, titles));
}

/**
 * Answered under a different topic only — the cross-topic case the whole
 * GateOverflow-id identity scheme exists for.
 */
function describeElsewhere(mark: QuestionMark, others: string[]): MarkerView {
  const view: MarkerView = {
    kind: "elsewhere",
    glyph: GLYPH.elsewhere,
    label: mark.status === "correct" ? "Solved elsewhere" : "Attempted elsewhere",
    tooltip: `${verdictLabel(mark.status)} in ${others.join(", ")} — ${attemptHistory(mark)}`,
  };
  return view;
}

function describeHere(mark: QuestionMark, others: string[]): MarkerView {
  const alsoSeen = others.length ? ` — also seen in ${others.join(", ")}` : "";
  const view: MarkerView = {
    kind: mark.status === "correct" ? "solved" : "wrong",
    glyph: verdictGlyph(mark.status),
    label: verdictLabel(mark.status),
    tooltip: `${attemptHistory(mark)}${alsoSeen}`,
  };
  return view;
}

export function describeMarker(
  mark: QuestionMark,
  topicSlug: string,
  titles: Record<string, string | null>,
): MarkerView {
  const others = otherTopicNames(mark, topicSlug, titles);
  const answeredHere = mark.answeredIn.includes(topicSlug);

  return !answeredHere && others.length > 0
    ? describeElsewhere(mark, others)
    : describeHere(mark, others);
}

export function renderBadge(doc: Document, view: MarkerView): HTMLElement {
  const badge = el(
    doc,
    "span",
    `${CLS.ours} ${OVERLAY_CLASS.badge} ${MARKER_CLASS[view.kind]}`,
    `${view.glyph} ${view.label}`,
  );
  badge.title = view.tooltip;
  return badge;
}

/** Repaints one question. Returns whether a badge ended up on it. */
function paintQuestion(
  doc: Document,
  target: PaintTarget,
  input: PaintMarkersInput,
): boolean {
  const anchor = target.element.querySelector(SEL.questionLabel);
  if (!anchor) return false;

  // Clear first so an unmarked question loses a stale badge, and a repaint
  // replaces rather than stacks.
  anchor.parentElement?.querySelector(`.${OVERLAY_CLASS.badge}`)?.remove();

  const mark = input.marks[target.goId];
  if (!mark) return false;

  const view = describeMarker(mark, input.topicSlug, input.topicTitles);
  anchor.insertAdjacentElement("afterend", renderBadge(doc, view));
  return true;
}

/** Marks every question on the page that has been answered before. */
export function paintQuestionMarkers(doc: Document, input: PaintMarkersInput): number {
  return input.questions
    .map((target) => paintQuestion(doc, target, input))
    .filter(Boolean).length;
}
