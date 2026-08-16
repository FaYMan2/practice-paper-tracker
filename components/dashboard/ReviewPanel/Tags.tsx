/**
 * What a question wears, wherever it appears.
 *
 * Every question in this panel was answered wrong at least once — that is the
 * entry condition for being scheduled — so "wrong" cannot be the distinction
 * the colours draw. What they draw is what has happened since, which is the
 * part that changes what you should do about it, plus the one flag that is
 * yours rather than the scheduler's: starred.
 *
 * Shared by the calendar and the lists so a question is the same colour in the
 * month as it is in the row beneath it.
 */

import { Star } from "lucide-react";
import { stageOf } from "../../../utils/review";
import type { ReviewItem } from "../../../utils/review";
import { Badge, cn } from "../ui";
import { STAGE_META, STARRED_LABEL, STARRED_NOTE } from "./constants";

/** The bare colour, for a key or a chip. */
export function StageDot({ className }: { className: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", className)} />;
}

export function StageTag({ item }: { item: ReviewItem }) {
  const meta = STAGE_META[stageOf(item)];
  return (
    <Badge tone={meta.tone} title={meta.note}>
      {meta.label}
    </Badge>
  );
}

/**
 * Starred is a second axis, not a fourth stage: a question can be starred and
 * struggling at once, so it gets its own mark rather than a colour that would
 * have to replace the stage's.
 */
export function StarMark() {
  return <Star className="size-3 shrink-0 fill-accent text-accent" aria-label={STARRED_LABEL} />;
}

export function StarTag({ item, compact = false }: { item: ReviewItem; compact?: boolean }) {
  if (!item.starred) return null;

  return compact ? (
    <StarMark />
  ) : (
    <Badge tone="accent" title={STARRED_NOTE}>
      <Star className="size-2.5 fill-current" />
      {STARRED_LABEL}
    </Badge>
  );
}

/**
 * One question inside a calendar cell.
 *
 * A month of bare counts tells you to click; a month of chips is the thing you
 * were going to click for. The question number is the label because it is what
 * the site itself calls it, and it is short enough to survive a narrow cell.
 */
export function QuestionChip({ item }: { item: ReviewItem }) {
  const meta = STAGE_META[stageOf(item)];

  return (
    <span
      className={cn(
        "flex w-full items-center gap-1 rounded px-1 py-px text-[11px] leading-4",
        meta.chip,
      )}
      title={`Q${item.ordinal} — ${meta.label.toLowerCase()}`}
    >
      <StageDot className={meta.dot} />
      <span className="num truncate font-semibold">Q{item.ordinal}</span>
      <StarTag item={item} compact />
    </span>
  );
}
