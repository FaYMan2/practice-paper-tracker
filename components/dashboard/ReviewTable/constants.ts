/** Copy and options for the review table. */

import { CalendarDays, Layers } from "lucide-react";
import { createElement } from "react";
import { ReviewGrouping, ReviewOrder } from "../../../utils/review";
import type { SegmentedOption } from "../ui";

export const REVIEW_TITLE = "Due for review";

export const REVIEW_NOTE =
  "Questions you've got wrong, spaced out by how well they've gone since. " +
  "Solve one on the site and it reschedules itself — there's nothing to mark here.";

export const GROUPING_OPTIONS: SegmentedOption<ReviewGrouping>[] = [
  { value: ReviewGrouping.Day, label: "By day", icon: createElement(CalendarDays) },
  { value: ReviewGrouping.Topic, label: "By topic", icon: createElement(Layers) },
];

export const ORDER_OPTIONS: SegmentedOption<ReviewOrder>[] = [
  { value: ReviewOrder.Oldest, label: "Longest waiting" },
  { value: ReviewOrder.Newest, label: "Most recent" },
];

export const GROUPING_LABEL = "Group the review list";

export const ORDER_LABEL = "Order the review list";

export const SOLVE_LABEL = "Solve";

/**
 * Past this many days waiting, a question is drifting rather than merely due,
 * and its wait is coloured to say so.
 */
export const OVERDUE_ATTENTION_DAYS = 7;

export const NOTHING_TRACKED_TITLE = "Nothing to review yet";

export const NOTHING_TRACKED_BODY =
  "Questions you answer incorrectly appear here, due again the next day, then " +
  "at widening intervals until they stick. Nothing you've only ever got right " +
  "is scheduled — that would bury the ones that matter.";

export const ALL_CAUGHT_UP_TITLE = "Nothing due right now";

export const TODAY_LABEL = "due today";

/** Where a question sits when its topic has no linked parent on the index page. */
export const UNGROUPED_SUBJECT = "Other topics";
