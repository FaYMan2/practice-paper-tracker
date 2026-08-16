/**
 * Everything worth another look, arranged two ways.
 *
 * Both are a picker beside a list. By day the picker is a month, and the list
 * is that day's questions as an agenda. By topic the picker is the subject
 * hierarchy, and the list is that topic's questions as a table. Switching
 * moves one control rather than rebuilding the page.
 *
 * Both show the *whole rotation*, not only what is due. They used to disagree —
 * the calendar plotted everything and the topic view listed only what was late
 * — so the same data read as two different numbers depending on which button
 * was pressed. What separates due from not-due now is the tag on the question,
 * which is visible in both.
 *
 * There is no marking here and no review mode. Every row's action opens the
 * question on practicepaper.in, where the site grades it as it always has, and
 * the attempt that produces reschedules it. A review screen would mean a second
 * copy of every question and a second implementation of the marking.
 */

import { useMemo, useState } from "react";
import { Clock, Inbox } from "lucide-react";
import {
  DAY_MS,
  ReviewGrouping,
  ReviewOrder,
  dayStartOf,
  defaultSelectedDay,
  groupBySubject,
  itemsOnDay,
  startOfMonth,
} from "../../../utils/review";
import type { ReviewItem, ReviewQueue, ReviewSubjectGroup } from "../../../utils/review";
import {
  NO_VALUE,
  examDisplayName,
  formatDate,
  pluralize,
  topicDisplayName,
} from "../../../utils/format";
import { buildResumeUrl } from "../../../utils/url";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardNote,
  CardTitle,
  Empty,
  Segmented,
  Table,
  Td,
  Th,
  cn,
} from "../ui";
import { Calendar } from "./Calendar";
import { StageTag, StarTag } from "./Tags";
import { TopicTree, subjectKey, subjectName } from "./TopicTree";
import type { TreeSelection } from "./TopicTree";
import {
  ALL_CAUGHT_UP_TITLE,
  DAY_PANEL_LABEL,
  DUE_TODAY,
  GROUPING_LABEL,
  GROUPING_OPTIONS,
  NOTHING_IN_TOPIC,
  NOTHING_ON_DAY,
  NOTHING_TRACKED_BODY,
  NOTHING_TRACKED_TITLE,
  ORDER_LABEL,
  ORDER_OPTIONS,
  OVERDUE_ATTENTION_DAYS,
  REVIEW_NOTE,
  REVIEW_TITLE,
  SOLVE_LABEL,
  TOPIC_PANEL_LABEL,
} from "./constants";

export * from "./constants";
export * from "./Calendar";
export * from "./Tags";
export * from "./TopicTree";

export interface ReviewPanelProps {
  queue: ReviewQueue;
  loading: boolean;
  /** Slug -> display title, so a row can name where it came from. */
  titles: Record<string, string | null>;
  /** Slug -> subject, used only where an item arrived without one. */
  subjectOf: Record<string, string | null>;
  /** Injected so a test can pin the month without pinning the clock. */
  now?: number;
}

type Titles = ReviewPanelProps["titles"];

function keyOf(item: ReviewItem): string {
  return `${item.topicSlug}:${item.ordinal}`;
}

/**
 * Fills in a subject the background did not send.
 *
 * Prefer what the worker resolved from the `topics` table; fall back to what
 * the page already knows. Without this an older background worker — the state
 * every extension reload passes through — files the whole queue under "Other
 * topics" with no indication why.
 */
function resolveSubjects(
  items: ReviewItem[],
  subjectOf: Record<string, string | null>,
): ReviewItem[] {
  return items.map((item) =>
    item.subjectSlug ? item : { ...item, subjectSlug: subjectOf[item.topicSlug] ?? null },
  );
}

/** Whole days from now until a question is due. Negative once it is late. */
function dueOffsetDays(dueAt: number, now: number): number {
  return Math.round((dayStartOf(dueAt) - dayStartOf(now)) / DAY_MS);
}

/**
 * When a question is wanted, as one short phrase.
 *
 * Three states rather than two, because the list holds the whole rotation now.
 * A column that said "due today" for everything not yet late was the bug that
 * made a question answered correctly this morning look overdue.
 */
function Timing({ item, now }: { item: ReviewItem; now: number }) {
  const offset = dueOffsetDays(item.dueAt, now);

  if (offset < 0) {
    return (
      <span
        className={cn(
          "num",
          -offset >= OVERDUE_ATTENTION_DAYS ? "font-semibold text-warn" : "text-muted",
        )}
      >
        {pluralize(-offset, "day")} late
      </span>
    );
  }
  if (offset === 0) return <span className="font-semibold text-accent">today</span>;
  return <span className="num text-faint">in {pluralize(offset, "day")}</span>;
}

function SolveLink({ item }: { item: ReviewItem }) {
  return (
    <Button
      asChild
      variant="accent"
      size="sm"
      className="opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <a
        href={buildResumeUrl(item.topicSlug, { ordinal: item.ordinal, goId: item.goId })}
        target="_blank"
        rel="noreferrer"
      >
        {SOLVE_LABEL}
      </a>
    </Button>
  );
}

/** "GATE CSE 2024 Set 1 · Pipeline Processor · last 11 Aug 2026". */
function fromText(item: ReviewItem, titles: Titles, showTopic: boolean): string {
  return [
    item.examSlug ? examDisplayName(item.examSlug) : NO_VALUE,
    ...(showTopic ? [topicDisplayName(item.topicSlug, titles)] : []),
    `last ${formatDate(item.lastReviewedAt) ?? NO_VALUE}`,
  ].join(" · ");
}

/** How many times it has been missed. Worth saying only when it is more than once. */
function Misses({ item }: { item: ReviewItem }) {
  return (
    <span className="num text-[11px] text-faint" title="Times answered wrong">
      {item.lapses === 1 ? "1 miss" : `${item.lapses} misses`}
    </span>
  );
}

/* ----------------------------------------------------------------- By day */

/**
 * A day's questions as an agenda rather than a table.
 *
 * This column is narrow — the calendar beside it has earned the width — and a
 * six-column table at 380px is the alignment problem this project has already
 * had once. Stacked, each question gets a line for what it is and a line for
 * where it came from.
 */
function AgendaItem({ item, titles, now }: { item: ReviewItem; titles: Titles; now: number }) {
  return (
    <li className="group flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="num text-sm font-semibold">Q{item.ordinal}</span>
          <StageTag item={item} />
          <StarTag item={item} />
        </div>
        {/* Titled as well as truncated: the exam and the date are the whole
            content of the line, and either can be the half that is cut off. */}
        <p className="m-0 mt-1 truncate text-xs text-muted" title={fromText(item, titles, true)}>
          {fromText(item, titles, true)}
        </p>
        <p className="m-0 mt-0.5 flex items-center gap-2 text-[11px]">
          <Timing item={item} now={now} />
          <span className="text-line-strong">·</span>
          <Misses item={item} />
        </p>
      </div>
      <SolveLink item={item} />
    </li>
  );
}

/**
 * What a selected day *is*, in the same three states the grid is read in.
 *
 * A future day is not "due". Calling it that beside a calendar that has already
 * separated overdue from upcoming is how a question answered correctly today,
 * scheduled for tomorrow, reads as something you are late on.
 */
function dayStatus(selected: number, count: number, today: number): string {
  const offset = dueOffsetDays(selected, today);
  const questions = pluralize(count, "question");

  if (offset < 0) return `${questions} · ${pluralize(-offset, "day")} overdue`;
  if (offset === 0) return `${questions} · ${DUE_TODAY}`;
  return `${questions} · due in ${pluralize(offset, "day")}`;
}

/** The month, and whichever day is picked out of it. */
function ByDay({ items, titles, now }: { items: ReviewItem[]; titles: Titles; now: number }) {
  // Opens on the oldest thing still waiting, which is what the queue is for.
  const [selected, setSelected] = useState<number>(() => defaultSelectedDay(items, now));
  const [monthStart, setMonthStart] = useState<number>(() => startOfMonth(selected));

  const onDay = itemsOnDay(items, selected);

  const pickDay = (day: number): void => {
    setSelected(day);
    // Clicking a lead-in or trailing day moves the month with it, rather than
    // selecting a day the reader can no longer see.
    setMonthStart(startOfMonth(day));
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <Calendar
        items={items}
        monthStart={monthStart}
        onMonthChange={(next) => setMonthStart(startOfMonth(next))}
        selectedDay={selected}
        onSelectDay={pickDay}
        today={now}
      />

      <section aria-label={DAY_PANEL_LABEL} className="w-full lg:w-[360px]">
        <h3 className="m-0 mb-2 flex flex-wrap items-baseline gap-2 text-sm font-semibold">
          {formatDate(selected) ?? NO_VALUE}
          {onDay.length > 0 ? (
            <span className="text-[11px] font-normal text-faint">
              {dayStatus(selected, onDay.length, now)}
            </span>
          ) : null}
        </h3>

        {onDay.length === 0 ? (
          <p className="m-0 text-sm text-muted">{NOTHING_ON_DAY}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {onDay.map((item) => (
              <AgendaItem key={keyOf(item)} item={item} titles={titles} now={now} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- By topic */

function Row({
  item,
  titles,
  showTopic,
  now,
}: {
  item: ReviewItem;
  titles: Titles;
  showTopic: boolean;
  now: number;
}) {
  return (
    <tr className="group hover:bg-raised">
      <Td className="num font-semibold">
        <span className="inline-flex items-center gap-1.5">
          Q{item.ordinal}
          <StarTag item={item} compact />
        </span>
      </Td>
      <Td className="truncate text-xs text-muted" title={fromText(item, titles, showTopic)}>
        {fromText(item, titles, showTopic)}
      </Td>
      <Td>
        <StageTag item={item} />
      </Td>
      <Td className="text-right">
        <Misses item={item} />
      </Td>
      <Td className="text-right text-xs">
        <Timing item={item} now={now} />
      </Td>
      <Td className="text-right">
        <SolveLink item={item} />
      </Td>
    </tr>
  );
}

/** Declared once; every row below is held to them by the browser. */
function Columns() {
  return (
    <>
      <colgroup>
        <col className="w-20" />
        <col />
        <col className="w-28" />
        <col className="w-24" />
        <col className="w-24" />
        <col className="w-24" />
      </colgroup>
      <thead>
        <tr>
          <Th>Question</Th>
          <Th>From</Th>
          <Th>Status</Th>
          <Th className="text-right">Missed</Th>
          <Th className="text-right">Due</Th>
          <Th>
            <span className="sr-only">Action</span>
          </Th>
        </tr>
      </thead>
    </>
  );
}

/**
 * The questions the tree is pointing at.
 *
 * Falls back to the first subject when the selection names something that is no
 * longer there — a question answered on the site drops out of the rotation
 * while the panel is open, and a tree selection that outlives its topic should
 * show the next thing rather than an empty table.
 */
function selectedItems(groups: ReviewSubjectGroup[], selection: TreeSelection): ReviewItem[] {
  const group = groups.find((entry) => entry.subjectSlug === selection.subjectSlug) ?? groups[0];
  if (group === undefined) return [];

  const all = group.topics.flatMap((topic) => topic.items);
  if (selection.topicSlug === null) return all;
  return group.topics.find((topic) => topic.topicSlug === selection.topicSlug)?.items ?? all;
}

function ByTopic({
  items,
  order,
  titles,
  dueGoIds,
  now,
}: {
  items: ReviewItem[];
  order: ReviewOrder;
  titles: Titles;
  dueGoIds: Set<string>;
  now: number;
}) {
  const groups = useMemo(() => groupBySubject(items, order), [items, order]);

  // Opens on the subject holding the oldest miss: groups arrive in that order.
  const [selection, setSelection] = useState<TreeSelection>(() => ({
    subjectSlug: groups[0]?.subjectSlug ?? null,
    topicSlug: null,
  }));

  const shown = selectedItems(groups, selection);
  const heading = [
    subjectName(selection.subjectSlug, titles),
    ...(selection.topicSlug === null ? [] : [topicDisplayName(selection.topicSlug, titles)]),
  ].join(" › ");

  return (
    <div className="flex flex-wrap items-start gap-6">
      <TopicTree
        groups={groups}
        titles={titles}
        dueGoIds={dueGoIds}
        selection={selection}
        onSelect={setSelection}
      />

      <section aria-label={TOPIC_PANEL_LABEL} className="min-w-0 flex-1">
        <h3 className="m-0 mb-2 flex flex-wrap items-baseline gap-2 text-sm font-semibold">
          {heading}
          <span className="text-[11px] font-normal text-faint">
            {pluralize(shown.length, "question")}
          </span>
        </h3>

        {shown.length === 0 ? (
          <p className="m-0 text-sm text-muted">{NOTHING_IN_TOPIC}</p>
        ) : (
          <Table>
            <Columns />
            <tbody>
              {shown.map((item) => (
                <Row
                  key={keyOf(item)}
                  item={item}
                  titles={titles}
                  // The topic is already in the heading when one is selected.
                  showTopic={selection.topicSlug === null}
                  now={now}
                />
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- Panel */

export function ReviewPanel({ queue, loading, titles, subjectOf, now }: ReviewPanelProps) {
  const [grouping, setGrouping] = useState<ReviewGrouping>(ReviewGrouping.Day);
  const [order, setOrder] = useState<ReviewOrder>(ReviewOrder.Oldest);

  // Pinned for the life of the panel: a clock read during render would move the
  // "today" ring and the default day under the reader on an unrelated repaint.
  const [clock] = useState<number>(() => now ?? Date.now());

  const due = useMemo(() => resolveSubjects(queue.due, subjectOf), [queue.due, subjectOf]);
  const scheduled = useMemo(
    () => [...due, ...resolveSubjects(queue.upcoming, subjectOf)],
    [due, queue.upcoming, subjectOf],
  );
  // Which of the rotation is actually due, for the counts in the tree. Taken
  // from the worker's own split rather than recomputed from `dueAt`, so one
  // definition of "due" governs the whole panel.
  const dueGoIds = useMemo(() => new Set(due.map((item) => item.goId)), [due]);

  if (loading) return null;

  // Nothing has ever been missed. Not an empty list — an empty *rotation*, and
  // saying so is more use than a calendar with nothing on it.
  if (queue.tracked === 0) {
    return (
      <Card>
        <Empty icon={<Inbox />} title={NOTHING_TRACKED_TITLE} body={NOTHING_TRACKED_BODY} />
      </Card>
    );
  }

  const byDay = grouping === ReviewGrouping.Day;
  const next = queue.upcoming[0];

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-accent" />
            {REVIEW_TITLE}
            {due.length > 0 ? <Badge tone="accent">{due.length}</Badge> : null}
          </CardTitle>
          <CardNote>{REVIEW_NOTE}</CardNote>
        </div>

        <div className="flex flex-wrap gap-2">
          <Segmented
            options={GROUPING_OPTIONS}
            value={grouping}
            onChange={setGrouping}
            label={GROUPING_LABEL}
          />
          {/* Ordering is a property of the grouped list; the calendar is a
              calendar, and August does not come after September. */}
          {byDay ? null : (
            <Segmented
              options={ORDER_OPTIONS}
              value={order}
              onChange={setOrder}
              label={ORDER_LABEL}
            />
          )}
        </div>
      </CardHeader>

      <CardBody className="pt-4">
        {/*
          Said in both views. Both still have a month and a hierarchy worth
          showing when nothing is due, but "nothing is due" is the first thing
          you want to know and neither of them says it.
        */}
        {due.length === 0 ? (
          <p className="m-0 mb-4 text-sm text-muted">
            {ALL_CAUGHT_UP_TITLE}. {pluralize(queue.tracked, "question")} in the rotation
            {next ? `, next on ${formatDate(next.dueAt)}` : ""}.
          </p>
        ) : null}

        {/* Both views take the whole rotation. What is due and what is merely
            scheduled is a tag on the question, not a different list. */}
        {byDay ? (
          <ByDay items={scheduled} titles={titles} now={clock} />
        ) : (
          <ByTopic
            items={scheduled}
            order={order}
            titles={titles}
            dueGoIds={dueGoIds}
            now={clock}
          />
        )}

        {queue.unplaced > 0 ? (
          <p className="mt-3 mb-0 text-xs text-muted">
            {pluralize(queue.unplaced, "missed question")} not on any page indexed yet, so
            there is nowhere to link to.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
