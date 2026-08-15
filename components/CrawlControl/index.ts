/**
 * The control that indexes the rest of a topic.
 *
 * Deliberately a button rather than something automatic: it costs the site
 * roughly ninety requests for a large subject, and that is not a thing to do
 * on someone's behalf without asking.
 */

import "./CrawlControl.css";

import { CrawlState } from "../../utils/crawl";
import type { CrawlProgress } from "../../utils/crawl";
import { CLS } from "../../utils/selectors";
import type { TopicSummary } from "../../types";
import { UI_CLASS } from "../constants";
import { el } from "../util";
import { CANCEL_LABEL, CRAWL_MESSAGE, INDEX_LABEL } from "./constants";

export * from "./constants";

export interface CrawlControlInput {
  summary: TopicSummary | null;
  progress: CrawlProgress | null;
  onStart: () => void;
  onCancel: () => void;
}

function button(
  doc: Document,
  label: string,
  onClick: () => void,
  extra = "",
): HTMLElement {
  const control = el(doc, "button", `${CLS.ours} ${UI_CLASS.crawl}${extra}`, label);
  control.setAttribute("type", "button");
  control.addEventListener("click", onClick);
  return control;
}

/** "Indexing page 12 — 47 questions so far". */
function runningText(progress: CrawlProgress): string {
  return `${CRAWL_MESSAGE.running} ${progress.pageNo} — ${progress.recorded} ${CRAWL_MESSAGE.recorded}`;
}

function finishedText(progress: CrawlProgress): string {
  if (progress.state === CrawlState.Failed) {
    return `${CRAWL_MESSAGE.failed} ${progress.error ?? ""}`.trim();
  }
  if (progress.state === CrawlState.Cancelled) return CRAWL_MESSAGE.cancelled;
  return `${CRAWL_MESSAGE.done} ${progress.recorded} ${CRAWL_MESSAGE.recorded}`;
}

/**
 * Null once the topic is fully indexed: there is nothing left to fetch, and an
 * offer to do it anyway would be noise on every page of every finished topic.
 */
export function CrawlControl(doc: Document, input: CrawlControlInput): HTMLElement | null {
  const { progress, summary } = input;

  if (progress?.state === CrawlState.Running) {
    const wrapper = el(doc, "span", UI_CLASS.crawlStatus);
    wrapper.append(
      el(doc, "span", UI_CLASS.crawlNote, runningText(progress)),
      button(doc, CANCEL_LABEL, input.onCancel, ` ${UI_CLASS.crawlCancel}`),
    );
    return wrapper;
  }

  if (progress) {
    return el(doc, "span", UI_CLASS.crawlNote, finishedText(progress));
  }

  if (summary?.fullyIndexed) return null;
  return button(doc, INDEX_LABEL, input.onStart);
}
