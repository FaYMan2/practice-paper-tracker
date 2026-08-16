/** Copy and options for the review table. */

import { CalendarDays, Layers } from "lucide-react";
import { createElement } from "react";
import { ReviewGrouping, ReviewOrder, ReviewStage } from "../../../utils/review";
import type { BadgeTone, SegmentedOption } from "../ui";

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

/** Where a question sits when its topic has no linked parent on the index page. */
export const UNGROUPED_SUBJECT = "Other topics";

/**
 * Monday first, matching the grid.
 *
 * Names rather than initials now that a cell is wide enough for them: "T" over
 * two different columns is a puzzle nobody should have to solve twice a week.
 */
export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const MONTH_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

export const TODAY_BUTTON = "Today";

export const NOTHING_ON_DAY = "Nothing scheduled for this day.";

export const DUE_TODAY = "due today";

/**
 * How each stage looks, and what it means.
 *
 * One record, read by the tag in a list row, the dot on a calendar chip and the
 * key beneath the grid — so the colour a question wears in the month is the
 * same colour it wears in the list, without three places agreeing by hand.
 *
 * Green for "on track" is doing real work: everything in this panel got
 * answered wrong once, and without it a rotation that is going well looks
 * identical to one that is not.
 */
export const STAGE_META: Record<
  ReviewStage,
  { label: string; tone: BadgeTone; dot: string; chip: string; note: string }
> = {
  [ReviewStage.Struggling]: {
    label: "Struggling",
    tone: "wrong",
    dot: "bg-wrong",
    chip: "bg-wrong-soft text-wrong",
    note: "Missed more than once, and not right since. Worth re-reading the topic.",
  },
  [ReviewStage.Relearning]: {
    label: "Relearning",
    tone: "warn",
    dot: "bg-warn",
    chip: "bg-warn-soft text-warn",
    note: "Missed once. Due again until you get it right.",
  },
  [ReviewStage.OnTrack]: {
    label: "On track",
    tone: "correct",
    dot: "bg-correct",
    chip: "bg-correct-soft text-correct",
    note: "Right since the miss. The gap widens each time until it drops out.",
  },
};

/** Worst first, so the key reads in the order you would act on it. */
export const STAGE_ORDER = [
  ReviewStage.Struggling,
  ReviewStage.Relearning,
  ReviewStage.OnTrack,
] as const;

export const STARRED_LABEL = "Starred";

export const STARRED_NOTE = "Starred, on the site or here.";

/** Overdue is a property of the *day*, so it is the cell that carries it. */
export const OVERDUE_DAY_LABEL = "Overdue day";

/**
 * Questions listed inside a calendar cell before it gives up and counts.
 *
 * Three fits the cell at every width the dashboard is used at. A day holding
 * more than that is a day you will click on anyway.
 */
export const CHIPS_PER_DAY = 3;

/** The subject tree, and what it does. */
export const TREE_LABEL = "Subjects with questions in the rotation";

export const ALL_TOPICS_LABEL = "All questions";

export const TREE_CAPTION = "Due · in rotation";

export const NOTHING_IN_TOPIC = "Nothing in the rotation here.";

/**
 * Both views put a picker beside a list, and both lists need naming — a screen
 * reader landing in one should be told which questions it is looking at, and a
 * test asserting "Q7 is listed" should not be satisfied by a calendar chip.
 */
export const DAY_PANEL_LABEL = "Questions on the selected day";

export const TOPIC_PANEL_LABEL = "Questions in the selected topic";
