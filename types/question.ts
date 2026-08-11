/**
 * The question itself, and the vocabulary for describing an answer to one.
 *
 * These stay string-literal unions rather than enums deliberately.
 * `QuestionStatus` is a superset of `Verdict`, and TypeScript enums are
 * *nominally* typed: two enums sharing the members "correct" and "wrong" would
 * not be assignable to one another, so `status: attempt.verdict` would need a
 * cast at every call site. Unions keep that a plain assignment while still
 * being exhaustively checked. Enums are used where a value is a dispatch or
 * diagnostic identifier instead — see `MessageKind` and `SelfCheckIssueKind`.
 */

/** MSQ is MCQ with more than one correct option; the site marks both the same. */
export type QuestionType = "MCQ" | "MSQ" | "NAT" | "UNKNOWN";

/** The outcome of one answer. */
export type Verdict = "correct" | "wrong";

/** Latest known state of a question. */
export type QuestionStatus = "unattempted" | Verdict;

/**
 * Every field except `starred` is a cached projection of the `attempts` log and
 * must be reproducible by `rebuildQuestionProjections()`.
 */
export interface QuestionRecord {
  goId: string;
  status: QuestionStatus;
  /** User curation (Phase 5). The one field that is NOT derived. */
  starred: boolean;
  type: QuestionType;
  marks: number;
  firstSeenAt: number;
  lastAttemptAt: number | null;
  attemptCount: number;
  /** Verdict of the earliest attempt — supports a "right first try" stat. */
  firstVerdict: Verdict | null;
}
