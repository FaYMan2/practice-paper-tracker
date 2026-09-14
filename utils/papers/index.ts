/**
 * Scoring a paper you sat.
 *
 * The whole point of this module is one distinction: a question of the 2019
 * paper can be answered while *sitting* the 2019 paper, or later while
 * practising the topic it belongs to. Only the first is a test result. Counting
 * the second would let a score climb on its own as unrelated practice happened
 * to cover the same questions, which is the opposite of what sitting a paper
 * is for.
 *
 * `attempts.topicSlug` records where an answer was given, so an attempt belongs
 * to a paper run when it was given under that paper's slug. No flag, no column,
 * no migration: the distinction was already in the data, it was just never read.
 *
 * Pure. The database pass that feeds it lives in `services/messages/papers`.
 */

import * as R from "ramda";
import { examDisplayName } from "../format";
import { isYearSlug } from "../url";
import type { AttemptRecord, QuestionType, RowRecord, Verdict } from "../../types";
import { UNPLACED_KEY, UNPLACED_LABEL } from "./constants";
import type { PaperDetail, PaperQuestion, PaperScore, PaperSubject, PaperSummary } from "./types";

export * from "./constants";
export type * from "./types";

/** Every paper slug among these topics, in the site's own order: newest first. */
export function paperSlugs(slugs: string[]): string[] {
  return R.reverse(R.sortBy(R.identity, slugs.filter(isYearSlug)));
}

/**
 * The latest answer given *during* a paper, per question.
 *
 * Latest rather than first: sitting the same paper again is a new run, and the
 * score you want to see is the one from the last time you sat it.
 */
export function satAttempts(
  attempts: AttemptRecord[],
  paperSlug: string,
): Map<string, AttemptRecord> {
  const here = attempts.filter((attempt) => attempt.topicSlug === paperSlug);
  const inOrder = R.sortBy(R.prop("ts"), here);
  return new Map(inOrder.map((attempt) => [attempt.goId, attempt]));
}

export interface PaperInputs {
  slug: string;
  rows: RowRecord[];
  /** Answers given during the paper, keyed by question. */
  sat: Map<string, AttemptRecord>;
  /** Questions answered anywhere at all, for the "met elsewhere" count. */
  answeredAnywhere: ReadonlySet<string>;
  /** What the paper's own page says it holds. */
  totalFromSite: number | null;
  totalMarksFromSite: number | null;
}

function toQuestion(row: RowRecord, input: PaperInputs): PaperQuestion {
  const attempt = input.sat.get(row.goId) ?? null;
  const question: PaperQuestion = {
    goId: row.goId,
    ordinal: row.ordinal,
    marks: row.marks,
    type: row.type as QuestionType,
    verdict: attempt?.verdict ?? null,
    answeredAt: attempt?.ts ?? null,
    // A paper's questions are labelled with the topic they belong to, which is
    // the only place the subject breakdown can come from.
    topicSlug: row.relatedSlugs[0] ?? null,
    metElsewhere: attempt === null && input.answeredAnywhere.has(row.goId),
  };
  return question;
}

export function scorePaper(questions: PaperQuestion[], input: PaperInputs): PaperScore {
  const attempted = questions.filter((question) => question.verdict !== null);
  const correct = attempted.filter((question) => question.verdict === "correct");
  const times = R.filter(R.isNotNil, questions.map((question) => question.answeredAt));

  const score: PaperScore = {
    total: input.totalFromSite,
    indexed: questions.length,
    attempted: attempted.length,
    correct: correct.length,
    wrong: attempted.length - correct.length,
    marksEarned: R.sum(R.pluck("marks", correct)),
    /*
     * What the paper is out of, preferring the site's own figure.
     *
     * Falls back to the marks of the questions actually indexed, so a paper
     * opened at page four scores against what is known rather than against a
     * total nobody has seen yet.
     */
    marksAvailable: input.totalMarksFromSite ?? R.sum(R.pluck("marks", questions)),
    accuracy: attempted.length === 0 ? null : correct.length / attempted.length,
    lastSatAt: times.length === 0 ? null : Math.max(...times),
    metElsewhere: questions.filter((question) => question.metElsewhere).length,
  };
  return score;
}

export function buildPaper(input: PaperInputs): PaperDetail {
  const questions = R.sortBy(
    R.prop("ordinal"),
    input.rows.map((row) => toQuestion(row, input)),
  );

  const detail: PaperDetail = {
    slug: input.slug,
    score: scorePaper(questions, input),
    questions,
  };
  return detail;
}

export function summarise(detail: PaperDetail): PaperSummary {
  const summary: PaperSummary = {
    slug: detail.slug,
    label: examDisplayName(detail.slug),
    score: detail.score,
  };
  return summary;
}

/**
 * Where a paper's questions came from, and how each subject went.
 *
 * Grouped by the subject a topic sits under, falling back to the topic itself
 * when the index page has never been scraped: a breakdown by topic is worth
 * more than no breakdown.
 */
export function subjectsOf(
  questions: PaperQuestion[],
  parentOf: Record<string, string | null>,
  titles: Record<string, string | null>,
): PaperSubject[] {
  const keyOf = (question: PaperQuestion): string =>
    question.topicSlug === null ? UNPLACED_KEY : (parentOf[question.topicSlug] ?? question.topicSlug);

  const grouped = Map.groupBy(questions, keyOf);

  const subjects = [...grouped].map(([key, list]): PaperSubject => {
    const attempted = list.filter((question) => question.verdict !== null);
    const correct = attempted.filter((question) => question.verdict === "correct");

    const subject: PaperSubject = {
      key,
      label: key === UNPLACED_KEY ? UNPLACED_LABEL : (titles[key] || examDisplayName(key)),
      questions: list.length,
      marksAvailable: R.sum(R.pluck("marks", list)),
      marksEarned: R.sum(R.pluck("marks", correct)),
      attempted: attempted.length,
      correct: correct.length,
    };
    return subject;
  });

  // Heaviest first: a paper is a marks budget, and the subject carrying the
  // most of it is the one worth reading about first.
  return R.reverse(R.sortBy(R.prop("marksAvailable"), subjects));
}
