/**
 * Where the misses are, as something to navigate rather than scroll.
 *
 * The by-topic view used to be one table with subject and topic headings inside
 * it, which is fine at three questions and a wall at fifty: the headings scroll
 * away, and everything is expanded whether you are looking at it or not.
 *
 * This is the same hierarchy as a *navigator* — subjects collapse, a topic is
 * one click, and the questions live in a single flat list beside it that only
 * ever holds the one topic you asked for. It is the shape the by-day view
 * already has (pick on the left, read on the right), so switching between them
 * moves one control rather than rebuilding the page.
 *
 * Counts are "due · in rotation", because those differ and the difference is
 * the thing worth acting on.
 */

import { useState } from "react";
import type { ReviewItem, ReviewSubjectGroup } from "../../../utils/review";
import { topicDisplayName } from "../../../utils/format";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge, Caption, cn } from "../ui";
import { ALL_TOPICS_LABEL, TREE_CAPTION, TREE_LABEL, UNGROUPED_SUBJECT } from "./constants";

export interface TreeSelection {
  subjectSlug: string | null;
  /** Null means the subject itself: every question under it. */
  topicSlug: string | null;
}

type Titles = Record<string, string | null>;

/** Stable string key for a subject, which may legitimately have no slug. */
export function subjectKey(subjectSlug: string | null): string {
  return subjectSlug ?? UNGROUPED_SUBJECT;
}

export function subjectName(slug: string | null | undefined, titles: Titles): string {
  return slug ? topicDisplayName(slug, titles) : UNGROUPED_SUBJECT;
}

function dueCount(items: ReviewItem[], dueGoIds: Set<string>): number {
  return items.filter((item) => dueGoIds.has(item.goId)).length;
}

function Counts({ items, dueGoIds }: { items: ReviewItem[]; dueGoIds: Set<string> }) {
  const due = dueCount(items, dueGoIds);

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      {due > 0 ? <Badge tone="accent">{due}</Badge> : null}
      <span className="num text-[11px] text-faint">{items.length}</span>
    </span>
  );
}

export interface TopicTreeProps {
  groups: ReviewSubjectGroup[];
  titles: Titles;
  /** Which questions are actually due, so a heading can say how many. */
  dueGoIds: Set<string>;
  selection: TreeSelection;
  onSelect: (selection: TreeSelection) => void;
}

export function TopicTree({ groups, titles, dueGoIds, selection, onSelect }: TopicTreeProps) {
  // The first subject opens because it is the one with the oldest miss in it —
  // groups arrive ordered by when they fell due, not alphabetically.
  const [open, setOpen] = useState<string[]>(() =>
    groups.length > 0 ? [subjectKey(groups[0]!.subjectSlug)] : [],
  );

  return (
    <Accordion
      type="multiple"
      value={open}
      onValueChange={setOpen}
      aria-label={TREE_LABEL}
      className="w-full shrink-0 md:w-[264px]"
    >
      <div className="flex justify-end px-2 pb-1">
        <Caption>{TREE_CAPTION}</Caption>
      </div>

      {groups.map((group) => {
        const key = subjectKey(group.subjectSlug);
        const items = group.topics.flatMap((topic) => topic.items);
        const active = selection.subjectSlug === group.subjectSlug;

        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger
              // Opening a subject and choosing it are the same intent: nobody
              // expands a heading in order not to read what is under it.
              onClick={() => onSelect({ subjectSlug: group.subjectSlug, topicSlug: null })}
              className={cn(active && selection.topicSlug === null && "bg-accent-soft text-accent")}
            >
              <span className="min-w-0 flex-1 truncate">{subjectName(group.subjectSlug, titles)}</span>
              <Counts items={items} dueGoIds={dueGoIds} />
            </AccordionTrigger>

            <AccordionContent>
              <ul className="m-0 list-none p-0">
                {/*
                  A subject with several topics needs a way back to all of them
                  once a topic has been picked; with one topic it would be the
                  same list twice.
                */}
                {group.topics.length > 1 ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => onSelect({ subjectSlug: group.subjectSlug, topicSlug: null })}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-8 text-left text-xs",
                        "transition-colors hover:bg-raised",
                        active && selection.topicSlug === null
                          ? "font-semibold text-accent"
                          : "text-muted",
                      )}
                    >
                      {ALL_TOPICS_LABEL}
                    </button>
                  </li>
                ) : null}

                {group.topics.map((topic) => {
                  const chosen = active && selection.topicSlug === topic.topicSlug;

                  return (
                    <li key={topic.topicSlug}>
                      <button
                        type="button"
                        onClick={() =>
                          onSelect({ subjectSlug: group.subjectSlug, topicSlug: topic.topicSlug })
                        }
                        aria-pressed={chosen}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-8 text-left text-xs",
                          "transition-colors hover:bg-raised",
                          chosen ? "bg-accent-soft font-semibold text-accent" : "text-muted",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {topicDisplayName(topic.topicSlug, titles)}
                        </span>
                        <Counts items={topic.items} dueGoIds={dueGoIds} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
