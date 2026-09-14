/**
 * The papers you have sat, each scored on its own answers.
 *
 * Separate from Progress because they answer different questions. Progress is
 * "how much of the syllabus have I covered"; a paper is "what would I have
 * scored on the day". A question answered while practising its topic moves the
 * first and must not move the second, or the score creeps up on its own.
 *
 * What a paper does *not* get is its own copy of anything else: its answers
 * still count towards topic progress, and a question missed here still enters
 * the review rotation. Only the score is paper-scoped.
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import { usePaperDetail } from "../../../services/dashboard";
import { subjectsOf } from "../../../utils/papers";
import type { PaperSummary } from "../../../utils/papers";
import type { DashboardView } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent } from "../../../utils/format";
import { LOADING_LABEL } from "../constants";
import {
  BREAKDOWN_FAILED,
  BREAKDOWN_TITLE,
  PAPER_COLUMNS,
  MET_ELSEWHERE,
  NO_PAPERS_BODY,
  NO_PAPERS_TITLE,
  NOT_SAT,
  PAPERS_NOTE,
  PAPERS_TITLE,
  SUBJECT_COLUMNS,
} from "./constants";
import {
  Caption,
  Card,
  CardBody,
  CardHeader,
  CardNote,
  CardTitle,
  Empty,
  Table,
  Td,
  Th,
  cn,
} from "../ui";

/** Marks as a share of what the paper is worth, for the bar behind the score. */
function marksShare(earned: number, available: number): number {
  return available === 0 ? 0 : Math.min(1, earned / available);
}

function Score({ paper }: { paper: PaperSummary }) {
  const { score } = paper;
  const share = marksShare(score.marksEarned, score.marksAvailable);

  return (
    <span className="flex items-center gap-2">
      {/*
        The bar is the paper, the fill is what you scored of it. A percentage
        alone hides how much paper there was.
      */}
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-remaining sm:block">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
      <span className="num text-[13px] font-semibold">
        {score.marksEarned} / {score.marksAvailable}
      </span>
    </span>
  );
}

function SubjectBreakdown({ slug, view }: { slug: string; view: DashboardView }) {
  const { detail, loading } = usePaperDetail(slug);

  if (loading) {
    return <p className="m-0 px-4 py-3 text-xs text-muted italic">{LOADING_LABEL}</p>;
  }

  /*
   * Finished, with nothing to show.
   *
   * Not the same as still loading, and saying "reading your progress" forever
   * is how a failed round trip looks like a hang. The breakdown is the only
   * part that failed, so the score above it stays.
   */
  if (detail === null) {
    return <p className="m-0 px-4 py-3 text-xs text-warn">{BREAKDOWN_FAILED}</p>;
  }

  const parentOf: Record<string, string | null> = Object.fromEntries(
    view.groups.flatMap((group) =>
      group.children.map((child) => [child.slug, group.parent?.slug ?? null]),
    ),
  );
  const subjects = subjectsOf(detail.questions, parentOf, view.titles);

  return (
    <div className="border-t border-line bg-raised px-4 py-3">
      <Caption>{BREAKDOWN_TITLE}</Caption>

      <Table className="mt-2">
        <colgroup>
          <col />
          <col className="w-24" />
          <col className="w-20" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr>
            <Th>{SUBJECT_COLUMNS.subject}</Th>
            <Th className="text-right">{SUBJECT_COLUMNS.marks}</Th>
            <Th className="text-right">{SUBJECT_COLUMNS.sat}</Th>
            <Th className="text-right">{SUBJECT_COLUMNS.correct}</Th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.key}>
              <Td className="truncate text-[13px] font-medium">{subject.label}</Td>
              <Td className="num text-right text-xs">
                {subject.marksEarned} / {subject.marksAvailable}
              </Td>
              <Td className="num text-right text-xs text-muted">
                {subject.attempted} / {subject.questions}
              </Td>
              <Td className="num text-right text-xs text-muted">{subject.correct}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {detail.score.metElsewhere > 0 ? (
        <p className="mt-2 mb-0 text-[11px] text-faint">
          {MET_ELSEWHERE(detail.score.metElsewhere)}
        </p>
      ) : null}
    </div>
  );
}

export interface PapersProps {
  papers: PaperSummary[];
  loading: boolean;
  /** The topic hierarchy, for naming the subjects a paper drew from. */
  view: DashboardView;
}

export function Papers({ papers, loading, view }: PapersProps) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (loading) return null;

  if (papers.length === 0) {
    return (
      <Card>
        <Empty icon={<FileText />} title={NO_PAPERS_TITLE} body={NO_PAPERS_BODY} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-accent" />
            {PAPERS_TITLE}
          </CardTitle>
          <CardNote>{PAPERS_NOTE}</CardNote>
        </div>
      </CardHeader>

      <CardBody className="px-0 pt-4 pb-0">
        <Table>
          <colgroup>
            <col />
            <col className="w-44" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr>
              <Th>{PAPER_COLUMNS.paper}</Th>
              <Th>{PAPER_COLUMNS.score}</Th>
              <Th className="text-right">{PAPER_COLUMNS.sat}</Th>
              <Th className="text-right">{PAPER_COLUMNS.accuracy}</Th>
              <Th className="text-right">{PAPER_COLUMNS.lastSat}</Th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => {
              const open = openSlug === paper.slug;
              const sat = paper.score.attempted > 0;

              return (
                <tr key={paper.slug} className={cn(open ? "bg-accent-soft" : "hover:bg-raised")}>
                  <Td className="p-0" colSpan={5}>
                    {/*
                      One row, one control. A paper is either something you are
                      reading about or something you are opening; splitting the
                      row into a link and a button makes the reader choose.
                    */}
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenSlug(open ? null : paper.slug)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_176px_96px_96px_112px] items-center gap-x-4 px-3 py-2.5 text-left"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
                        <span className="text-faint" aria-hidden="true">
                          {open ? "▾" : "▸"}
                        </span>
                        <span className="truncate">{paper.label}</span>
                      </span>

                      <Score paper={paper} />

                      <span className="num text-right text-xs text-muted">
                        {paper.score.attempted} / {paper.score.total ?? paper.score.indexed}
                      </span>
                      <span className="num text-right text-xs">
                        {formatPercent(paper.score.accuracy)}
                      </span>
                      <span className="text-right text-xs text-muted">
                        {sat ? (formatDate(paper.score.lastSatAt) ?? NO_VALUE) : (
                          <em className="text-faint not-italic">{NOT_SAT}</em>
                        )}
                      </span>
                    </button>

                    {open ? <SubjectBreakdown slug={paper.slug} view={view} /> : null}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </CardBody>
    </Card>
  );
}

export * from "./constants";
