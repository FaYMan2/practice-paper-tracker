/**
 * The append-only answer log — the only source of truth about what the user did.
 */

import type { QuestionType, Verdict } from "./question";

/**
 * What the user actually clicked or typed, captured before the site's own
 * handler runs. `correct` is the site's own labelling of that option
 * (`tr.mtq_clickable[data-value]`), recorded so a future review UI can show
 * which distractor was picked without re-fetching the page.
 */
export interface Choice {
  kind: "option" | "numeric";
  /** Option letter as displayed, e.g. "A". Only for `kind: "option"`. */
  label?: string;
  /** Raw value typed into a NAT box. Only for `kind: "numeric"`. */
  value?: string;
  /** Whether the site considers this option correct. Unknown for NAT. */
  correct?: boolean;
  ts: number;
}

/**
 * One answer, one row. Never updated in place, never upserted by `goId`.
 *
 * `eventId` is `${goId}:${pageLoadId}`, carries a unique index, and makes the
 * write idempotent: a message retried after a lost acknowledgement collapses
 * onto the same row instead of appending a phantom second attempt.
 */
export interface AttemptRecord {
  id?: number;
  eventId: string;
  goId: string;
  verdict: Verdict;
  choices: Choice[];
  ts: number;
  topicSlug: string;
  /** Topic-global question number. A coordinate as of `ts`, never an identity. */
  ordinal: number | null;
  pageNo: number;
  /** e.g. "gate-cse-2026-set-2" — which physical row was answered. */
  examSlug: string | null;
  type: QuestionType;
  marks: number;
  pageLoadId: string;
  /** True when identity fell back to a synthetic key (no GateOverflow anchor). */
  provisional?: boolean;
}

/** An attempt as the content script observes it, before the DB assigns an id. */
export type AttemptInput = Omit<AttemptRecord, "id">;
