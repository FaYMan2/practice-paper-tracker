/**
 * Laying the review queue out as a month.
 *
 * A list answers "what is due"; a calendar answers "what does my week look
 * like", which is the question you actually plan around. Both read the same
 * items — this only arranges them.
 *
 * Pure, and local-time throughout: a day boundary has to fall where the person
 * is, not at UTC midnight.
 */

import * as R from "ramda";
import { dayStartOf } from "./grouping";
import { DAYS_IN_WEEK, WEEKS_SHOWN } from "./constants";
import type { CalendarDay, CalendarMonth, ReviewItem } from "./types";

export function startOfMonth(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function addMonths(monthStart: number, delta: number): number {
  const date = new Date(monthStart);
  return new Date(date.getFullYear(), date.getMonth() + delta, 1).getTime();
}

/**
 * How many days back the grid starts, so the first row begins on a Monday.
 *
 * `getDay()` counts from Sunday, so Sunday needs six days of lead-in rather
 * than none — the off-by-one that puts a whole month on the wrong weekday.
 */
function leadingDays(monthStart: number): number {
  return (new Date(monthStart).getDay() + 6) % DAYS_IN_WEEK;
}

/** What falls due on each day, each day's questions in due order. */
export function itemsByDay(items: ReviewItem[]): Map<number, ReviewItem[]> {
  const byDay = Map.groupBy(items, (item) => dayStartOf(item.dueAt));
  return new Map([...byDay].map(([day, list]) => [day, R.sortBy(R.prop("dueAt"), list)]));
}

export function itemsOnDay(items: ReviewItem[], day: number): ReviewItem[] {
  return R.sortBy(
    R.prop("dueAt"),
    items.filter((item) => dayStartOf(item.dueAt) === day),
  );
}

/**
 * Six weeks, always.
 *
 * A month needs anywhere from four to six rows depending on where it starts,
 * and a grid that changes height as you page through it makes everything below
 * it jump. Fixing the count costs a row of greyed-out days and buys a calendar
 * that stays still.
 */
export function monthGrid(monthStart: number, today: number, items: ReviewItem[]): CalendarMonth {
  const byDay = itemsByDay(items);
  const start = new Date(monthStart);
  const first = new Date(start.getFullYear(), start.getMonth(), 1 - leadingDays(monthStart));
  const month = start.getMonth();
  const todayStart = dayStartOf(today);

  const days = R.range(0, WEEKS_SHOWN * DAYS_IN_WEEK).map((offset): CalendarDay => {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
    const ts = date.getTime();
    const onDay = byDay.get(ts) ?? [];
    const due = onDay.length;

    const day: CalendarDay = {
      ts,
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: ts === todayStart,
      items: onDay,
      due,
      // Overdue, not merely due: the day has passed and questions still sit on
      // it. That is the state worth colouring, because it is the one that grows.
      overdue: due > 0 && ts < todayStart,
    };
    return day;
  });

  // Padding days belong to the neighbouring months and are counted there.
  const own = days.filter((day) => day.inMonth);
  const sumWhere = (matches: (day: CalendarDay) => boolean): number =>
    R.sum(own.filter(matches).map((day) => day.due));

  const grid: CalendarMonth = {
    monthStart,
    weeks: R.splitEvery(DAYS_IN_WEEK, days),
    overdue: sumWhere((day) => day.ts < todayStart),
    dueToday: sumWhere((day) => day.ts === todayStart),
    upcoming: sumWhere((day) => day.ts > todayStart),
  };
  return grid;
}

/**
 * The day a calendar should open on.
 *
 * The oldest thing still waiting, because that is what a review queue is for.
 * Falls back to today when nothing is overdue, so the grid never opens on a
 * day with nothing to show.
 */
export function defaultSelectedDay(items: ReviewItem[], today: number): number {
  const days = items.map((item) => dayStartOf(item.dueAt));
  return days.length === 0 ? dayStartOf(today) : Math.min(...days);
}
