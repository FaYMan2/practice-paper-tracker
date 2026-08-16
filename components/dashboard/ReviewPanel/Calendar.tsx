/**
 * The review queue as a month.
 *
 * A list answers "what is due"; a calendar answers "what does my week look
 * like", which is the question you plan around. Everything scheduled is
 * plotted, not only what is due: the point of a month view is seeing what is
 * coming.
 *
 * Cells carry the questions themselves as small chips, the way a calendar
 * carries events, rather than a bare tally. A tally tells you to click; a chip
 * coloured by how the question is going is the thing you were going to click
 * for. Three per cell, then a count — a day holding more than three is a day
 * you will open anyway.
 *
 * Two colour channels, deliberately kept separate: the *chips* say how each
 * question is going, and the *cell* says whether its day has passed. Merging
 * them would mean a question's colour changed with the date, which is exactly
 * the confusion that made a month showing five look like it disagreed with a
 * list showing three.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthGrid } from "../../../utils/review";
import type { CalendarDay, CalendarMonth, ReviewItem } from "../../../utils/review";
import { Button, cn } from "../ui";
import {
  CHIPS_PER_DAY,
  MONTH_FORMAT,
  OVERDUE_DAY_LABEL,
  STAGE_META,
  STAGE_ORDER,
  STARRED_LABEL,
  TODAY_BUTTON,
  WEEKDAY_NAMES,
} from "./constants";
import { QuestionChip, StageDot, StarMark } from "./Tags";

/**
 * What is on the month, in the same three states the days are read in.
 *
 * Every part is dropped when it is zero, so a quiet month reads "2 upcoming"
 * rather than "0 overdue · 0 today · 2 upcoming". Saying "5 due" for a month
 * holding three overdue and two scheduled is what made this view look like it
 * disagreed with the list beside it.
 */
function monthCounts(grid: CalendarMonth): { label: string; className: string }[] {
  return [
    { count: grid.overdue, label: "overdue", className: "font-semibold text-warn" },
    { count: grid.dueToday, label: "today", className: "font-semibold text-accent" },
    { count: grid.upcoming, label: "upcoming", className: "text-faint" },
  ]
    .filter((part) => part.count > 0)
    .map((part) => ({ label: `${part.count} ${part.label}`, className: part.className }));
}

export interface CalendarProps {
  /** Everything in the rotation, due or not. */
  items: ReviewItem[];
  monthStart: number;
  onMonthChange: (monthStart: number) => void;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  today: number;
}

function Day({
  day,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  selected: boolean;
  onSelect: (ts: number) => void;
}) {
  const shown = day.items.slice(0, CHIPS_PER_DAY);
  const hidden = day.due - shown.length;

  return (
    <button
      type="button"
      // A day with nothing on it is still focusable and still selectable: it
      // says "nothing scheduled" when you click it, which is an answer.
      onClick={() => onSelect(day.ts)}
      aria-pressed={selected}
      aria-label={new Date(day.ts).toDateString()}
      className={cn(
        "flex min-h-[86px] w-full flex-col items-stretch gap-0.5 rounded-lg border p-1.5",
        "text-left transition-colors",
        day.inMonth ? "border-line bg-surface" : "border-transparent bg-transparent opacity-45",
        // The day has passed and things are still sitting on it. A property of
        // the date, so it tints the cell rather than recolouring the questions.
        day.overdue && "border-warn/40 bg-warn-soft",
        !selected && day.inMonth && "hover:border-line-strong",
        // Selection wins over everything, so it is never ambiguous which day
        // the list beside the grid belongs to.
        selected && "border-accent bg-accent-soft ring-1 ring-accent",
      )}
    >
      <span
        className={cn(
          "num grid size-5 place-items-center justify-self-start rounded-full text-[11px]",
          day.isToday ? "bg-accent font-semibold text-white" : "font-medium text-muted",
        )}
      >
        {day.dayOfMonth}
      </span>

      {shown.map((item) => (
        <QuestionChip key={`${item.topicSlug}:${item.ordinal}`} item={item} />
      ))}

      {hidden > 0 ? (
        <span className="num px-1 text-[10px] font-medium text-faint">+{hidden} more</span>
      ) : null}
    </button>
  );
}

export function Calendar({
  items,
  monthStart,
  onMonthChange,
  selectedDay,
  onSelectDay,
  today,
}: CalendarProps) {
  const grid = monthGrid(monthStart, today, items);
  const monthName = new Date(monthStart).toLocaleDateString(undefined, MONTH_FORMAT);

  return (
    <div className="min-w-0 flex-1">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="m-0 text-[15px] font-semibold whitespace-nowrap">{monthName}</h3>
          <p className="m-0 flex flex-wrap gap-x-2 text-[11px]">
            {monthCounts(grid).map((part, index) => (
              <span key={part.label} className={part.className}>
                {index > 0 ? <span className="mr-2 text-faint">·</span> : null}
                {part.label}
              </span>
            ))}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            onClick={() => onMonthChange(addMonths(monthStart, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMonthChange(today)}>
            {TODAY_BUTTON}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(monthStart, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_NAMES.map((name) => (
          <span
            key={name}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-faint"
          >
            {name}
          </span>
        ))}

        {grid.weeks.flat().map((day) => (
          <Day key={day.ts} day={day} selected={day.ts === selectedDay} onSelect={onSelectDay} />
        ))}
      </div>

      {/*
        Two channels to explain, so both are explained. Without the key, three
        warm colours an inch apart are decoration; with it they are the reason
        the month is worth looking at before the list is.
      */}
      <ul className="mt-3 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[11px] text-muted">
        {STAGE_ORDER.map((stage) => (
          <li key={stage} className="flex items-center gap-1.5" title={STAGE_META[stage].note}>
            <StageDot className={STAGE_META[stage].dot} />
            {STAGE_META[stage].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <StarMark />
          {STARRED_LABEL}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-warn/40 bg-warn-soft" />
          {OVERDUE_DAY_LABEL}
        </li>
      </ul>
    </div>
  );
}
