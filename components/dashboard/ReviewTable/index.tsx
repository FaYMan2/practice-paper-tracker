/**
 * Everything worth another look, arranged two ways.
 *
 * By day it is a worklist: what fell due when, longest waiting first. By topic
 * it is a diagnosis of the same questions — subject, then topic, then the
 * questions — which is the view that answers "where do my mistakes cluster".
 *
 * There is no marking here and no review mode. Every row's action opens the
 * question on practicepaper.in, where the site grades it as it always has, and
 * the attempt that produces reschedules it. A review screen would mean a second
 * copy of every question and a second implementation of the marking.
 *
 * A real `<table>` with a `<colgroup>`, not a grid. The columns are declared
 * once and the browser holds every row to them, including rows two levels deep
 * under a heading — which is the part a hand-rolled grid kept getting wrong.
 */

import { Fragment, useState } from "react";
import { CalendarDays, Clock, Inbox, Layers, Star } from "lucide-react";
import {
  ReviewGrouping,
  ReviewOrder,
  groupByDay,
  groupBySubject,
} from "../../../utils/review";
import type { ReviewItem, ReviewQueue } from "../../../utils/review";
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
import {
  ALL_CAUGHT_UP_TITLE,
  GROUPING_LABEL,
  GROUPING_OPTIONS,
  NOTHING_TRACKED_BODY,
  NOTHING_TRACKED_TITLE,
  ORDER_LABEL,
  ORDER_OPTIONS,
  OVERDUE_ATTENTION_DAYS,
  REVIEW_NOTE,
  REVIEW_TITLE,
  SOLVE_LABEL,
  TODAY_LABEL,
  UNGROUPED_SUBJECT,
} from "./constants";

export * from "./constants";

export interface ReviewTableProps {
  queue: ReviewQueue;
  loading: boolean;
  /** Slug -> display title, so a row can name where it came from. */
  titles: Record<string, string | null>;
  /** Slug -> subject, used only where an item arrived without one. */
  subjectOf: Record<string, string | null>;
}

type Titles = ReviewTableProps["titles"];

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

function subjectName(slug: string | null | undefined, titles: Titles): string {
  return slug ? topicDisplayName(slug, titles) : UNGROUPED_SUBJECT;
}

/** Amber past a week: long enough that it is drifting, not merely due. */
function Waited({ item }: { item: ReviewItem }) {
  if (item.overdueDays === 0) return <span className="text-muted">{TODAY_LABEL}</span>;

  return (
    <span
      className={cn(
        "num",
        item.overdueDays >= OVERDUE_ATTENTION_DAYS ? "font-semibold text-warn" : "text-muted",
      )}
    >
      {pluralize(item.overdueDays, "day")}
    </span>
  );
}

function Row({ item, titles, showTopic }: { item: ReviewItem; titles: Titles; showTopic: boolean }) {
  const from = [
    item.examSlug ? examDisplayName(item.examSlug) : NO_VALUE,
    ...(showTopic ? [topicDisplayName(item.topicSlug, titles)] : []),
    `last ${formatDate(item.lastReviewedAt) ?? NO_VALUE}`,
  ].join(" · ");

  return (
    <tr className="group hover:bg-raised">
      <Td className={cn("font-semibold num", showTopic ? "" : "pl-8")}>
        <span className="inline-flex items-center gap-1.5">
          Q{item.ordinal}
          {item.starred ? <Star className="size-3.5 fill-accent text-accent" /> : null}
        </span>
      </Td>
      <Td className="truncate text-xs text-muted">{from}</Td>
      <Td className="text-right">
        <Badge tone={item.lapses > 1 ? "wrong" : "neutral"}>{item.lapses}</Badge>
      </Td>
      <Td className="text-right text-xs">
        <Waited item={item} />
      </Td>
      <Td className="text-right">
        <Button
          asChild
          variant="accent"
          size="sm"
          // Visible on hover or keyboard focus; always visible is a wall of
          // buttons, never visible is a control nobody finds.
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
      </Td>
    </tr>
  );
}

function GroupRow({
  name,
  meta,
  level,
}: {
  name: string;
  meta: string;
  level: "subject" | "topic" | "day";
}) {
  return (
    <tr>
      <td
        colSpan={5}
        className={cn(
          "border-t px-3",
          level === "subject" && "border-line-strong pt-5 pb-1.5",
          level === "topic" && "border-line py-1.5 pl-6",
          level === "day" && "border-line pt-4 pb-1.5",
        )}
      >
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-semibold",
              level === "subject" && "text-sm",
              level === "topic" && "text-xs text-muted",
              level === "day" && "text-[13px]",
            )}
          >
            {name}
          </span>
          <span className="text-[11px] text-faint">{meta}</span>
        </span>
      </td>
    </tr>
  );
}

export function ReviewTable({ queue, loading, titles, subjectOf }: ReviewTableProps) {
  const [grouping, setGrouping] = useState<ReviewGrouping>(ReviewGrouping.Day);
  const [order, setOrder] = useState<ReviewOrder>(ReviewOrder.Oldest);

  if (loading) return null;

  // Nothing has ever been missed. Not an empty list — an empty *rotation*, and
  // saying so is more use than a table with no rows and two controls above it.
  if (queue.tracked === 0) {
    return (
      <Card>
        <Empty
          icon={<Inbox />}
          title={NOTHING_TRACKED_TITLE}
          body={NOTHING_TRACKED_BODY}
        />
      </Card>
    );
  }

  const items = resolveSubjects(queue.due, subjectOf);
  const next = queue.upcoming[0];

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-accent" />
            {REVIEW_TITLE}
            {items.length > 0 ? <Badge tone="accent">{items.length}</Badge> : null}
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
          <Segmented
            options={ORDER_OPTIONS}
            value={order}
            onChange={setOrder}
            label={ORDER_LABEL}
          />
        </div>
      </CardHeader>

      <CardBody className="pt-4">
        {items.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            {ALL_CAUGHT_UP_TITLE}. {pluralize(queue.tracked, "question")} in the rotation
            {next ? `, next on ${formatDate(next.dueAt)}` : ""}.
          </p>
        ) : (
          <Table>
            {/* Declared once; every row below is held to them by the browser. */}
            <colgroup>
              <col className="w-[16%]" />
              <col />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <Th>Question</Th>
                <Th>From</Th>
                <Th className="text-right">Misses</Th>
                <Th className="text-right">Waiting</Th>
                <Th>
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {grouping === ReviewGrouping.Day
                ? groupByDay(items, order).map((day) => (
                    <Fragment key={day.dayStart}>
                      <GroupRow
                        level="day"
                        name={formatDate(day.dayStart) ?? NO_VALUE}
                        meta={
                          pluralize(day.items.length, "question") +
                          (day.overdueDays === 0
                            ? ""
                            : ` · waiting ${pluralize(day.overdueDays, "day")}`)
                        }
                      />
                      {day.items.map((item) => (
                        <Row key={keyOf(item)} item={item} titles={titles} showTopic />
                      ))}
                    </Fragment>
                  ))
                : groupBySubject(items, order).map((subject) => (
                    <Fragment key={subject.subjectSlug ?? UNGROUPED_SUBJECT}>
                      <GroupRow
                        level="subject"
                        name={subjectName(subject.subjectSlug, titles)}
                        meta={pluralize(subject.total, "question")}
                      />
                      {subject.topics.map((topic) => (
                        <Fragment key={topic.topicSlug}>
                          <GroupRow
                            level="topic"
                            name={topicDisplayName(topic.topicSlug, titles)}
                            meta={pluralize(topic.items.length, "question")}
                          />
                          {topic.items.map((item) => (
                            <Row
                              key={keyOf(item)}
                              item={item}
                              titles={titles}
                              showTopic={false}
                            />
                          ))}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}
            </tbody>
          </Table>
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
