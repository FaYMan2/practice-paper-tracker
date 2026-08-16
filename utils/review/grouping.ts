/**
 * Arranging the review queue two ways.
 *
 * Pure, and deliberately ignorant of what anything is called. Groups are
 * ordered by the questions inside them rather than alphabetically: the subject
 * you have been ignoring longest belongs at the top of a review list, and
 * sorting by name would bury it under whatever begins with A. That also means
 * this needs no titles, so the naming stays entirely in the component.
 */

import * as R from "ramda";
import { ReviewOrder } from "./constants";
import type {
  ReviewDayGroup,
  ReviewItem,
  ReviewSubjectGroup,
  ReviewTopicGroup,
} from "./types";

/**
 * Local midnight for a timestamp.
 *
 * Local rather than UTC on purpose: "due today" has to mean today where the
 * person is, and a UTC day boundary would move a question into tomorrow's group
 * at some arbitrary hour of the evening.
 */
export function dayStartOf(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function byDueDate(order: ReviewOrder) {
  return (items: ReviewItem[]): ReviewItem[] => {
    const ascending = R.sortBy(R.prop("dueAt"), items);
    return order === ReviewOrder.Oldest ? ascending : R.reverse(ascending);
  };
}

/** Groups sort by the same rule as the questions in them: by when they fell due. */
function orderGroups<T>(order: ReviewOrder, keyOf: (group: T) => number) {
  return (groups: T[]): T[] => {
    const ascending = R.sortBy(keyOf, groups);
    return order === ReviewOrder.Oldest ? ascending : R.reverse(ascending);
  };
}

/** Earliest due date anywhere in a list — where a group sits in the order. */
function earliestDue(items: ReviewItem[]): number {
  return Math.min(...items.map((item) => item.dueAt));
}

export function groupByDay(items: ReviewItem[], order: ReviewOrder): ReviewDayGroup[] {
  const byDay = Map.groupBy(items, (item) => dayStartOf(item.dueAt));
  const sortItems = byDueDate(order);

  const groups = [...byDay].map(([dayStart, list]): ReviewDayGroup => {
    const group: ReviewDayGroup = {
      dayStart,
      // Every question here fell due on the same day, so they have waited the
      // same length of time and one of them can speak for the group.
      overdueDays: list[0]!.overdueDays,
      items: sortItems(list),
    };
    return group;
  });

  return orderGroups<ReviewDayGroup>(order, R.prop("dayStart"))(groups);
}

function topicsOf(items: ReviewItem[], order: ReviewOrder): ReviewTopicGroup[] {
  const byTopic = Map.groupBy(items, (item) => item.topicSlug);
  const sortItems = byDueDate(order);

  const groups = [...byTopic].map(([topicSlug, list]): ReviewTopicGroup => {
    const group: ReviewTopicGroup = { topicSlug, items: sortItems(list) };
    return group;
  });

  return orderGroups<ReviewTopicGroup>(order, (group) => earliestDue(group.items))(groups);
}

/**
 * Subject, then topic, then the questions themselves.
 *
 * Two levels of heading even where a subject has one topic, because the shape
 * of the list is the point: it says which subject the misses are piling up in
 * before it says which question.
 */
export function groupBySubject(
  items: ReviewItem[],
  order: ReviewOrder,
): ReviewSubjectGroup[] {
  // Normalised, not read directly. An item from a background worker that
  // predates this field has no `subjectSlug` at all, and grouping on
  // `undefined` produces a key that every null check downstream misses — which
  // is how a missing field became a crash that took the whole page down rather
  // than one unnamed heading.
  const bySubject = Map.groupBy(items, (item) => item.subjectSlug ?? null);

  const groups = [...bySubject].map(([subjectSlug, list]): ReviewSubjectGroup => {
    const group: ReviewSubjectGroup = {
      subjectSlug,
      topics: topicsOf(list, order),
      total: list.length,
    };
    return group;
  });

  return orderGroups<ReviewSubjectGroup>(order, (group) =>
    earliestDue(group.topics.flatMap((topic) => topic.items)),
  )(groups);
}
