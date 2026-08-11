import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "fixtures");

/** Real pages saved from practicepaper.in, unedited. */
export const FIXTURES = {
  dataStructureP1: "topic-data-structure-p1.html",
  /** Page 55 — 1996/1997 questions, ordinals starting at 271. */
  dataStructureP55: "topic-data-structure-p55.html",
  /** Carries a bare gateoverflow link in a user comment, outside any question. */
  probabilityP1: "topic-probability-theory-p1.html",
  probabilityP8Nat: "topic-probability-theory-p8-nat.html",
  discreteMathP1: "topic-discrete-mathematics-p1.html",
  /** Out-of-range page: HTTP 200 with no questions and no pager. */
  stackP99Empty: "topic-stack-p99-empty.html",
  indexTopicwise: "index-topicwise.html",
  year2024Set1: "year-gate-cse-2024-set-1-p1.html",
} as const;

/**
 * These are real pages, so they reference the site's stylesheets, ad tags and
 * analytics. happy-dom tries to resolve those on parse and floods the run with
 * load errors, so they are stripped first — nothing we assert on lives in them.
 */
function stripExternalResources(html: string): string {
  return html
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "");
}

export function loadHtml(name: (typeof FIXTURES)[keyof typeof FIXTURES]): Document {
  const html = stripExternalResources(readFileSync(join(DIR, name), "utf8"));
  return new DOMParser().parseFromString(html, "text/html");
}
