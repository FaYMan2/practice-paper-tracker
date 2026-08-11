/**
 * Reading practicepaper.in's DOM, plus the integrity check that tells us when
 * that reading has stopped working.
 */

import * as R from "ramda";
import { isYearSlug, parseGoId, parseOrdinal, parsePageNo, topicSlugFromHref } from "../url";
import type { QuestionType, Verdict } from "../../types";
import {
  ATTR,
  CLS,
  QUESTION_TYPE_LABELS,
  SEL,
  SelfCheckIssueKind,
  TOTAL_QUESTIONS_PATTERN,
} from "./constants";
import type { BlockCheck, BlockInspection, QuestionLinks, SelfCheckIssue } from "./types";

export * from "./constants";
export type * from "./types";

function splitClasses(value: string | null): string[] {
  return (value ?? "").split(/\s+/).filter(Boolean);
}

function hasClass(value: string | null, cls: string): boolean {
  return splitClasses(value).includes(cls);
}

/**
 * The verdict for a class change on `.mtq_stamp`, or null when it is noise.
 *
 * Requires the class to be *newly* added, compared against
 * `MutationRecord.oldValue` — without that check, LiteSpeed's lazy-image class
 * flips and ad containers fire this constantly.
 */
export function stampVerdict(className: string, oldClassName: string | null): Verdict | null {
  const newlyAdded = (cls: string): boolean =>
    hasClass(className, cls) && !hasClass(oldClassName, cls);

  if (newlyAdded(CLS.correctStamp)) return "correct";
  if (newlyAdded(CLS.wrongStamp)) return "wrong";
  return null;
}

/** True when the only classes that changed are ours, so we skip our repaints. */
export function isOwnMutation(className: string, oldClassName: string | null): boolean {
  const changed = R.symmetricDifference(
    splitClasses(className),
    splitClasses(oldClassName),
  );
  return changed.length > 0 && changed.every((cls) => cls.startsWith(CLS.ours));
}

function collectGoIds(scope: Element): Set<string> {
  const hrefs = [...scope.querySelectorAll(SEL.anchor)].map((anchor) =>
    parseGoId(anchor.getAttribute("href")),
  );
  return new Set(R.filter(R.isNotNil, hrefs));
}

/**
 * Scoped to the block's own `.mtq_explanation` on purpose: a WordPress user
 * comment on `probability-theory` contains a bare gateoverflow.in link outside
 * any question, so a page-wide search overcounts. Falls back to the whole block
 * only when the explanation is missing.
 */
function identityScope(question: Element): Element {
  return question.querySelector(SEL.explanation) ?? question;
}

export function goIdForQuestion(question: Element): string | null {
  const [first] = collectGoIds(identityScope(question));
  return first ?? null;
}

export function ordinalForQuestion(question: Element): number | null {
  return parseOrdinal(question.querySelector(SEL.questionLabel)?.textContent);
}

function correctOptionCount(answerTable: Element): number {
  return [...answerTable.querySelectorAll(SEL.clickableRow)].filter(
    (row) => row.getAttribute(ATTR.value) === "1",
  ).length;
}

/**
 * MSQ is not marked structurally — it shares `table.answer_table` with MCQ and
 * differs only by having more than one correct row. We trust the printed label
 * first and fall back to counting.
 */
export function questionType(question: Element): QuestionType {
  const label = question.querySelector(SEL.typeLabel)?.textContent?.trim().toUpperCase();
  const printed = QUESTION_TYPE_LABELS.find((known) => known === label);
  if (printed) return printed;

  if (question.querySelector(SEL.numericAnswer)) return "NAT";

  const answerTable = question.querySelector(SEL.answerTable);
  if (!answerTable) return "UNKNOWN";
  return correctOptionCount(answerTable) > 1 ? "MSQ" : "MCQ";
}

export function marksForQuestion(question: Element): number {
  const raw = question.querySelector(SEL.questionText)?.getAttribute(ATTR.value);
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * On a topic page the two links are (exam year, parent subject); on a year page
 * they are (parent subject, child topic), because a year page never names its
 * own year. We tell them apart by slug shape.
 */
export function examAndTopicLinks(question: Element): QuestionLinks {
  const parsed = [...question.querySelectorAll(SEL.yearChapterLinks)].map((anchor) =>
    topicSlugFromHref(anchor.getAttribute("href") ?? ""),
  );
  const slugs = R.filter(R.isNotNil, parsed);

  const examSlug = slugs.find(isYearSlug) ?? null;
  const links: QuestionLinks = {
    examSlug,
    relatedSlugs: slugs.filter((slug) => slug !== examSlug),
  };
  return links;
}

/** Total question count for the topic, from "out of N Questions". */
export function totalQuestionsFromStatus(doc: ParentNode): number | null {
  const text = doc.querySelector(SEL.quizStatus)?.textContent ?? "";
  const digits = TOTAL_QUESTIONS_PATTERN.exec(text)?.[1];
  if (!digits) return null;
  const parsed = Number.parseInt(digits.replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Total marks for the topic, from `div.allquestionarea[data-value]`. */
export function totalMarksFromArea(doc: ParentNode): number | null {
  const raw = doc.querySelector(SEL.quizArea)?.getAttribute(ATTR.value);
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function pageNumberFromLink(anchor: Element): number {
  const href = anchor.getAttribute("href");
  // The active page renders as a plain <a> with no href, so fall back to text.
  if (!href) return Number.parseInt(anchor.textContent?.trim() ?? "", 10);
  return parsePageNo(new URLSearchParams(href.split("?")[1] ?? "").get("page_no"));
}

/** Highest page number offered by the pager; 1 when there is no pager. */
export function lastPageNumber(doc: ParentNode): number {
  const numbers = [...doc.querySelectorAll(SEL.paginationLink)]
    .map(pageNumberFromLink)
    .filter((value) => Number.isFinite(value));
  return Math.max(1, ...numbers);
}

export function questionBlocks(doc: ParentNode): Element[] {
  const area = doc.querySelector(SEL.quizArea);
  return [...(area ?? doc).querySelectorAll(SEL.question)];
}

function inspectQuestionBlock(question: Element): BlockInspection {
  const inspection: BlockInspection = {
    goIdCount: collectGoIds(identityScope(question)).size,
    hasOrdinal: ordinalForQuestion(question) !== null,
    hasKnownType: questionType(question) !== "UNKNOWN",
  };
  return inspection;
}

const BLOCK_CHECKS: readonly BlockCheck[] = [
  { kind: SelfCheckIssueKind.MissingGoId, failed: (block) => block.goIdCount === 0 },
  { kind: SelfCheckIssueKind.MultipleGoIds, failed: (block) => block.goIdCount > 1 },
  { kind: SelfCheckIssueKind.UnparsedOrdinal, failed: (block) => !block.hasOrdinal },
  { kind: SelfCheckIssueKind.UnknownType, failed: (block) => !block.hasKnownType },
];

function issue(kind: SelfCheckIssueKind, detail: string): SelfCheckIssue {
  const result: SelfCheckIssue = { kind, detail };
  return result;
}

function checkQuestionBlocks(blocks: Element[]): SelfCheckIssue[] {
  const inspections = blocks.map(inspectQuestionBlock);
  return BLOCK_CHECKS.flatMap((check) => {
    const failed = inspections.filter(check.failed).length;
    return failed === 0 ? [] : [issue(check.kind, `${failed}/${blocks.length} blocks`)];
  });
}

/**
 * Cheap integrity check run on every question page. It repairs nothing; it
 * exists so a markup change surfaces as a toolbar badge instead of months of
 * quietly unrecorded practice.
 */
export function selfCheck(doc: ParentNode): SelfCheckIssue[] {
  const blocks = questionBlocks(doc);

  // An out-of-range page_no legitimately answers 200 with no questions, no quiz
  // area and no pager. That is not a fault, so report nothing.
  if (blocks.length === 0) {
    const hasPager = doc.querySelector(SEL.pagination) !== null;
    return hasPager
      ? [issue(SelfCheckIssueKind.NoQuestions, "pager present but no question blocks")]
      : [];
  }

  const structural = doc.querySelector(SEL.quizArea)
    ? []
    : [issue(SelfCheckIssueKind.NoQuizArea, `missing ${SEL.quizArea}`)];

  const totals =
    totalQuestionsFromStatus(doc) === null
      ? [issue(SelfCheckIssueKind.UnparsedTotal, "no 'out of N Questions'")]
      : [];

  return [...structural, ...checkQuestionBlocks(blocks), ...totals];
}
