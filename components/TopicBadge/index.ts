/**
 * The compact progress badge beside each topic on the index page.
 *
 * That page lists around 100 topics, so anything untouched renders nothing —
 * a badge on every row would be noise rather than information.
 */

import "./TopicBadge.css";

import { navigationPlans } from "../../utils/resume";
import { CLS } from "../../utils/selectors";
import type { TopicLink } from "../../utils/selectors";
import type { TopicSummary } from "../../types";
import { UI_CLASS } from "../constants";
import { CompactResumeLink } from "../ResumeLink";
import { el } from "../util";

/** "12 / 34", or "≥12 / 34" while rows in the topic are still undiscovered. */
function countsText(summary: TopicSummary): string {
  const prefix = summary.fullyIndexed ? "" : "≥";
  const total = summary.totalFromSite === null ? "?" : summary.totalFromSite;
  return `${prefix}${summary.solvedRows} / ${total}`;
}

function countsTooltip(summary: TopicSummary): string {
  return [
    `${summary.solvedRows} attempted`,
    `${summary.correctRows} correct`,
    `${summary.wrongRows} wrong`,
  ].join(" · ");
}

/** Null when the topic has no recorded progress worth showing. */
export function TopicBadge(doc: Document, summary: TopicSummary): HTMLElement | null {
  if (summary.solvedRows === 0) return null;

  const badge = el(doc, "span", `${CLS.ours} ${UI_CLASS.topicBadge}`);
  const counts = el(doc, "span", undefined, countsText(summary));
  counts.title = countsTooltip(summary);

  badge.appendChild(counts);
  badge.append(...navigationPlans(summary).map((plan) => CompactResumeLink(doc, plan)));
  return badge;
}

function paintTopicLink(
  doc: Document,
  link: TopicLink,
  summaries: Record<string, TopicSummary>,
): boolean {
  // Clear first so a repaint replaces rather than stacks.
  link.element.parentElement?.querySelector(`.${UI_CLASS.topicBadge}`)?.remove();

  const summary = summaries[link.slug];
  if (!summary) return false;

  const badge = TopicBadge(doc, summary);
  if (!badge) return false;

  link.element.insertAdjacentElement("afterend", badge);
  return true;
}

/** Badges every topic on the index page that has progress recorded. */
export function paintIndexProgress(
  doc: Document,
  links: TopicLink[],
  summaries: Record<string, TopicSummary>,
): number {
  return links.map((link) => paintTopicLink(doc, link, summaries)).filter(Boolean).length;
}
