/** Turning a flat set of topic summaries into subjects with topics beneath them. */

import * as R from "ramda";
import { topicDisplayName } from "../format";
import type { TopicSummary } from "../../types";
import { UNGROUPED_KEY, UNGROUPED_LABEL } from "./constants";
import { statsOf, sumStats } from "./stats";
import type { DashboardView, TopicGroup } from "./types";

function displayName(summary: TopicSummary): string {
  return topicDisplayName(summary.slug, { [summary.slug]: summary.title });
}

function byName(summaries: TopicSummary[]): TopicSummary[] {
  return R.sortBy(displayName, summaries);
}

/**
 * A subject's own numbers, not the sum of its children's.
 *
 * The subject page carries every question its child topics carry, so its
 * summary is already the total. Where a group has no subject page — the ISRO
 * group heading is not a link — the children are disjoint and can be added.
 */
function groupStats(parent: TopicSummary | null, children: TopicSummary[]): TopicGroup["stats"] {
  return parent ? statsOf(parent) : sumStats(children.map(statsOf));
}

function buildGroup(parent: TopicSummary | null, children: TopicSummary[]): TopicGroup {
  const sorted = byName(children);
  const group: TopicGroup = {
    key: parent?.slug ?? UNGROUPED_KEY,
    label: parent ? displayName(parent) : UNGROUPED_LABEL,
    parent,
    children: sorted,
    stats: groupStats(parent, sorted),
  };
  return group;
}

/**
 * Groups every topic under the subject the index page put it in.
 *
 * A topic is a subject when some other topic names it as a parent, so this
 * needs no separate flag on the record. Topics that are neither a subject nor a
 * child of a known one — the ISRO pair, General Aptitude — fall into one
 * trailing group rather than being dropped.
 */
export function groupTopics(summaries: TopicSummary[]): TopicGroup[] {
  const parentSlugs = new Set(R.filter(R.isNotNil, R.pluck("parentSlug", summaries)));
  const bySlug = new Map(summaries.map((summary) => [summary.slug, summary]));

  const isSubject = (summary: TopicSummary): boolean => parentSlugs.has(summary.slug);
  const hasKnownParent = (summary: TopicSummary): boolean =>
    summary.parentSlug !== null && bySlug.has(summary.parentSlug);

  const childrenOf = Map.groupBy(
    summaries.filter((summary) => !isSubject(summary) && hasKnownParent(summary)),
    (summary) => summary.parentSlug!,
  );

  const grouped = byName(summaries.filter(isSubject)).map((subject) =>
    buildGroup(subject, childrenOf.get(subject.slug) ?? []),
  );

  // Anything whose parent was never scraped keeps its own place here rather
  // than disappearing between the groups.
  const orphans = summaries.filter(
    (summary) => !isSubject(summary) && !hasKnownParent(summary),
  );

  return orphans.length === 0 ? grouped : [...grouped, buildGroup(null, orphans)];
}

/**
 * Every topic's display name, keyed by slug.
 *
 * The drill-down needs names for topics outside the subject being viewed,
 * because a question can be borrowed from anywhere.
 */
export function topicTitles(summaries: TopicSummary[]): Record<string, string | null> {
  return Object.fromEntries(summaries.map((summary) => [summary.slug, summary.title]));
}

export function buildView(summaries: Record<string, TopicSummary>): DashboardView {
  const all = Object.values(summaries);
  const groups = groupTopics(all);

  const view: DashboardView = {
    groups,
    titles: topicTitles(all),
    // Subjects are disjoint from one another, so this is the one level at which
    // adding up is honest.
    overall: sumStats(R.pluck("stats", groups)),
    topicCount: all.length,
    empty: all.length === 0,
  };
  return view;
}
