/**
 * What to revise, and why.
 *
 * Two halves of one answer. The **heatmap** is the shape of the syllabus as you
 * currently stand in it — every topic you have touched, coloured by how often
 * you get it right first time. The **ranked list** is the instruction that
 * falls out of it, worst first.
 *
 * Both read first-try accuracy rather than current status. A question you
 * missed and later put right counts as correct on the progress tab, which is
 * the right measure of coverage and exactly the wrong one here: it hides the
 * miss, and the miss is the whole subject of this page.
 */

import { Flame, TriangleAlert } from "lucide-react";
import {
  BANDS,
  NO_DATA_LABEL,
  rankWeakAreas,
  tooEarlyToSay,
  weakSubjects,
} from "../../../utils/weakness";
import type { WeakArea, WeakSubject } from "../../../utils/weakness";
import type { DashboardView } from "../../../utils/dashboard";
import { formatPercent, pluralize } from "../../../utils/format";
import {
  Badge,
  Caption,
  Card,
  CardBody,
  CardHeader,
  CardNote,
  CardTitle,
  Empty,
  cn,
} from "../ui";
import {
  BAND_STYLE,
  NO_DATA_CELL,
  UNRANKED_CELL,
  EARLY_HEADING,
  EARLY_NOTE,
  HEATMAP_REGION,
  RANKED_REGION,
  HEATMAP_NOTE,
  HEATMAP_TITLE,
  NOTHING_BODY,
  NOTHING_TITLE,
  NOTHING_WEAK,
  RANKED_HEADING,
  WEAK_NOTE,
  WEAK_TITLE,
  atBestText,
  firstTryText,
} from "./constants";

export * from "./constants";

/** How a rate should look: the highest band whose floor it clears. */
function styleOf(rate: number) {
  const band = [...BANDS].reverse().find((entry) => rate >= entry.min) ?? BANDS[0];
  return BAND_STYLE[band.id];
}

/** "6 of 15 first time · 40% · at best 64%" — the whole claim, in a tooltip. */
function describe(area: WeakArea): string {
  const firstTry = Math.round(area.firstTry.rate * area.answered);
  return [
    area.label,
    firstTryText(firstTry, area.answered),
    formatPercent(area.firstTry.rate),
    atBestText(area.firstTry.high),
  ].join(" · ");
}

function Cell({ area, onOpen }: { area: WeakArea; onOpen: () => void }) {
  const empty = area.answered === 0;
  const band = styleOf(area.firstTry.rate);

  // Three states, not two. A topic with one answer in it is coloured neither
  // like a failure nor like an untouched one: the ranking refuses to judge it,
  // and a cell that judges it anyway contradicts the list above.
  const fill = empty ? NO_DATA_CELL : area.ranked ? band.cell : UNRANKED_CELL;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={empty ? `${area.label} · ${NO_DATA_LABEL}` : describe(area)}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px]",
        "font-medium transition-transform hover:scale-[1.03]",
        fill,
      )}
    >
      <span className="min-w-0 truncate">{area.label}</span>
      {/*
        The count rides along with the colour, because a shade on its own does
        not say whether it rests on four questions or forty.
      */}
      {empty ? null : <span className="num shrink-0 opacity-75">{area.answered}</span>}
    </button>
  );
}

function SubjectRow({
  subject,
  onOpen,
}: {
  subject: WeakSubject;
  onOpen: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-line py-3 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)]">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(subject.key)}
          className="truncate text-left text-[13px] font-semibold hover:text-accent"
        >
          {subject.label}
        </button>
        <p className="m-0 text-[11px] text-faint">
          {subject.firstTry === null
            ? NO_DATA_LABEL
            : `${formatPercent(subject.firstTry.rate)} first try · ${pluralize(subject.answered, "question")}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {subject.topics.map((area) => (
          <Cell key={area.slug} area={area} onOpen={() => onOpen(subject.key)} />
        ))}
      </div>
    </div>
  );
}

function RankedRow({
  area,
  rank,
  onOpen,
}: {
  area: WeakArea;
  rank: number;
  onOpen: () => void;
}) {
  const firstTry = Math.round(area.firstTry.rate * area.answered);
  const band = styleOf(area.firstTry.rate);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 first:border-t-0">
      <span className="num w-5 shrink-0 text-xs font-semibold text-faint">{rank}</span>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold hover:text-accent"
      >
        {area.label}
        {area.subjectLabel === null ? null : (
          <span className="ml-2 text-[11px] font-normal text-faint">{area.subjectLabel}</span>
        )}
      </button>

      {/*
        A bar rather than a number alone: the eye compares lengths faster than
        percentages, and the ranking is a comparison.
      */}
      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-line sm:block">
        <span
          className={cn("block h-full rounded-full", band.bar)}
          style={{ width: `${Math.round(area.firstTry.rate * 100)}%` }}
        />
      </span>

      <span className="num w-10 shrink-0 text-right text-xs font-semibold">
        {formatPercent(area.firstTry.rate)}
      </span>
      <span className="w-32 shrink-0 text-right text-[11px] text-faint">
        {firstTryText(firstTry, area.answered)}
      </span>
      <Badge tone="neutral" title="The optimistic end of the confidence interval — what the ranking is on">
        {atBestText(area.firstTry.high)}
      </Badge>
    </li>
  );
}

export interface WeakAreasProps {
  view: DashboardView;
  /** Opens the subject dialog, which is where the questions themselves live. */
  onOpen: (key: string) => void;
}

export function WeakAreas({ view, onOpen }: WeakAreasProps) {
  const subjects = weakSubjects(view.groups, view.titles);
  const ranked = rankWeakAreas(subjects);
  const early = tooEarlyToSay(subjects);
  const worked = subjects.filter((subject) => subject.answered > 0);

  if (worked.length === 0) {
    return (
      <Card>
        <Empty icon={<Flame />} title={NOTHING_TITLE} body={NOTHING_BODY} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        Both cards name themselves: a topic appears in the ranking and again in
        the heatmap, so "Hashing" alone does not say which claim is being read.
      */}
      <Card aria-label={RANKED_REGION}>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-4 text-accent" />
              {WEAK_TITLE}
            </CardTitle>
            <CardNote>{WEAK_NOTE}</CardNote>
          </div>
        </CardHeader>

        <CardBody className="px-0 pt-4 pb-0">
          {ranked.length === 0 ? (
            <p className="m-0 px-5 pb-5 text-sm text-muted">{NOTHING_WEAK}</p>
          ) : (
            <>
              <div className="px-4 pb-1">
                <Caption>{RANKED_HEADING}</Caption>
              </div>
              <ul className="m-0 list-none p-0">
                {ranked.map((area, index) => (
                  <RankedRow
                    key={area.slug}
                    area={area}
                    rank={index + 1}
                    onOpen={() => onOpen(area.subjectSlug ?? area.slug)}
                  />
                ))}
              </ul>
            </>
          )}

          {early.length === 0 ? null : (
            <div className="border-t border-line px-4 py-3">
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="size-3.5 text-faint" />
                <Caption>{EARLY_HEADING}</Caption>
              </span>
              <p className="m-0 mt-1 text-[11px] text-faint">{EARLY_NOTE}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {early.map((area) => (
                  <Cell
                    key={area.slug}
                    area={area}
                    onOpen={() => onOpen(area.subjectSlug ?? area.slug)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card aria-label={HEATMAP_REGION}>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{HEATMAP_TITLE}</CardTitle>
            <CardNote>{HEATMAP_NOTE}</CardNote>
          </div>

          <ul className="flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] text-muted">
            {BANDS.map((band) => (
              <li key={band.label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-[3px]", BAND_STYLE[band.id].bar)} />
                {band.label}
              </li>
            ))}
          </ul>
        </CardHeader>

        <CardBody className="pt-3">
          {worked.map((subject) => (
            <SubjectRow key={subject.key} subject={subject} onOpen={onOpen} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
