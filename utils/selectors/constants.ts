/**
 * Every DOM assumption about practicepaper.in markup, in one place.
 *
 * The site is WordPress behind LiteSpeed optimisation and its markup can change
 * without warning. Concentrating the assumptions here makes a break a one-file
 * fix, and `selfCheck` turns a silent break into a visible badge.
 */

export const SEL = {
  /** Wrapper around the question list; `data-value` is total topic marks. */
  quizArea: "div.allquestionarea",
  question: "div.question",
  questionLabel: "div.question_lable",
  /** Gains `mtq_correct_stamp` / `mtq_wrong_stamp`. Our verdict authority. */
  stamp: "div.mtq_stamp",
  typeLabel: "div.question_type_labal",
  questionText: "div.question_text",
  /** MCQ/MSQ. `data-value` = number of correct options. */
  answerTable: "table.answer_table",
  /** `data-value` 1 = correct, 0 = wrong. Row ids are duplicated, so unusable. */
  clickableRow: "tr.mtq_clickable",
  optionLabel: "div.option_index_number",
  /** NAT. Mutually exclusive with `answerTable`. */
  numericAnswer: "div.numericans",
  numericInput: "input.numinputbox",
  /** `data-value1`/`data-value2` bound the accepted range, `data-value3` guards. */
  checkButton: "input.checkansbtn",
  /** Hidden at load but present in the DOM — this is where identity lives. */
  explanation: "div.mtq_explanation",
  yearChapterLinks: "div.year_sub_chap_link a",
  pagination: "ul.pagination",
  paginationLink: "ul.pagination a",
  /**
   * The id is suffixed per page (`mtq_quiz_status-1`), so an exact `#id` match
   * never fires — match the class, with a prefix match as a fallback.
   */
  quizStatus: "div.mtq_quiz_status, [id^='mtq_quiz_status']",
  anchor: "a[href]",
  /** Topic index page hierarchy. */
  indexList: "ul.wp-block-list",
} as const;

export const CLS = {
  correctStamp: "mtq_correct_stamp",
  wrongStamp: "mtq_wrong_stamp",
  /**
   * Our own markers. Never write the site's stamp classes: doing so retriggers
   * our observer and records a phantom attempt.
   */
  ours: "pptr",
  solved: "pptr-solved",
  wrong: "pptr-wrong",
  elsewhere: "pptr-elsewhere",
} as const;

/** Guard attributes the site uses to stop double-counting. */
export const ATTR = {
  answered: "data-answered",
  natGuard: "data-value3",
  value: "data-value",
  natMin: "data-value1",
  natMax: "data-value2",
} as const;

/** "out of 298 Questions" -> 298. */
export const TOTAL_QUESTIONS_PATTERN = /out\s+of\s+([\d,]+)\s+Questions/i;

export const QUESTION_TYPE_LABELS = ["MCQ", "MSQ", "NAT"] as const;

/**
 * Integrity failures. An enum because these identify a fault in logs and on the
 * toolbar badge; as bare strings a typo would compile and silently never fire.
 */
export enum SelfCheckIssueKind {
  NoQuizArea = "no-quiz-area",
  NoQuestions = "no-questions",
  MissingGoId = "missing-go-id",
  MultipleGoIds = "multiple-go-ids",
  UnparsedOrdinal = "unparsed-ordinal",
  UnknownType = "unknown-type",
  UnparsedTotal = "unparsed-total",
}
