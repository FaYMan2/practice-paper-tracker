/**
 * The content script -> background message contract.
 *
 * One writer serialises concurrent tabs; two topic tabs open at once would
 * otherwise race on read-modify-write of the same topic summary.
 */

import type { MessageKind } from "../utils/messaging/constants";
import type { Backup, ImportOutcome } from "../utils/backup/types";
import type { AttemptInput } from "./attempt";
import type { DiagnosticRecord } from "./diagnostic";
import type { QuestionStatus, QuestionType, Verdict } from "./question";
import type { TopicSummary } from "./summary";
import type { TopicHierarchyEntry } from "./topic";

/** One question as seen on a page, whether or not it was answered. */
export interface ObservedRow {
  ordinal: number;
  goId: string;
  examSlug: string | null;
  type: QuestionType;
  marks: number;
  /** Topics the site files this question under, besides the page it is on. */
  relatedSlugs: string[];
}

/** Everything harvested from a single page load. */
export interface PageObservation {
  topicSlug: string;
  title: string | null;
  pageNo: number;
  totalFromSite: number | null;
  totalMarksFromSite: number | null;
  rows: ObservedRow[];
}

export interface RecordAttemptMessage {
  kind: MessageKind.RecordAttempt;
  attempt: AttemptInput;
}

export interface ObservePageMessage {
  kind: MessageKind.ObservePage;
  page: PageObservation;
}

export interface GetSummariesMessage {
  kind: MessageKind.GetSummaries;
  /** Omit for every topic. */
  slugs?: string[];
}

/**
 * What we know about one question, for painting it on the page.
 *
 * `answeredIn` is the set of topics the question was actually answered under.
 * Because a GateOverflow id identifies a question rather than a position, that
 * set can exclude the topic being viewed — which is precisely the
 * "you already solved this elsewhere" case.
 */
export interface QuestionMark {
  goId: string;
  status: QuestionStatus;
  starred: boolean;
  attemptCount: number;
  lastAttemptAt: number | null;
  answeredIn: string[];
}

export interface GetQuestionMarksMessage {
  kind: MessageKind.GetQuestionMarks;
  goIds: string[];
}

/**
 * One indexed question of a topic, as the dashboard drill-down lists it.
 *
 * Row and question are joined here: `ordinal`, `examSlug` and `marks` describe
 * the placement, while `status` and the attempt fields describe the question
 * itself and so are shared with every other topic it appears under.
 */
export interface TopicQuestionRow {
  ordinal: number;
  /**
   * The topic whose page this row was seen on, which is not always the topic
   * being listed: the site files a question under two topics and we only ever
   * see it under one of them. `ordinal` belongs to *this* slug's numbering, so
   * every link must be built from the pair.
   */
  topicSlug: string;
  goId: string;
  examSlug: string | null;
  type: QuestionType;
  marks: number;
  status: QuestionStatus;
  attemptCount: number;
  lastAttemptAt: number | null;
  firstVerdict: Verdict | null;
  /** True when identity fell back to a synthetic key, so it cannot cross topics. */
  provisional: boolean;
  starred: boolean;
}

export interface TopicDetail {
  slug: string;
  /** Ascending by ordinal. Only questions seen on a visited page appear. */
  rows: TopicQuestionRow[];
}

/**
 * Asks the background to compute every topic's figures from IndexedDB.
 *
 * The dashboard runs on an extension page, so unlike a content script it has
 * no reason to settle for the `storage.local` mirror: it asks for the real
 * numbers and can never show a cache that drifted.
 */
export interface GetDashboardMessage {
  kind: MessageKind.GetDashboard;
}

/**
 * The figures, plus what had to be put right to produce them.
 *
 * `repaired` counts questions whose cached state disagreed with the attempt log
 * and were rebuilt from it during this load. Normally zero. It travels with the
 * data rather than being logged quietly because a cache that needed correcting
 * is the user's business: until this load, something on the page or in these
 * numbers was wrong.
 */
export interface DashboardPayload {
  summaries: Record<string, TopicSummary>;
  repaired: number;
}

/** Which pages of a topic have already been indexed, so a crawl can skip them. */
export interface GetTopicPagesMessage {
  kind: MessageKind.GetTopicPages;
  slug: string;
}

export interface TopicPages {
  slug: string;
  pages: number[];
}

/**
 * Starring is per question, not per row: a question starred under one topic is
 * starred everywhere it appears, which is the same identity rule the rest of
 * the tracker runs on.
 */
export interface SetStarMessage {
  kind: MessageKind.SetStar;
  goId: string;
  starred: boolean;
}

export interface GetTopicDetailMessage {
  kind: MessageKind.GetTopicDetail;
  slug: string;
}

export interface ReportHierarchyMessage {
  kind: MessageKind.ReportHierarchy;
  entries: TopicHierarchyEntry[];
}

export interface ReportDiagnosticMessage {
  kind: MessageKind.ReportDiagnostic;
  entry: Omit<DiagnosticRecord, "id">;
}

export interface RebuildAllMessage {
  kind: MessageKind.RebuildAll;
}

/** Asks for the whole database as one plain object, for saving to a file. */
export interface ExportBackupMessage {
  kind: MessageKind.ExportBackup;
}

/**
 * Hands a parsed backup file to the writer.
 *
 * The payload is `unknown` on purpose. It came out of a file the user chose,
 * which means it may be anything at all, and pretending otherwise here would
 * only move the validation somewhere it is easier to skip. The background
 * validates before it writes.
 */
export interface ImportBackupMessage {
  kind: MessageKind.ImportBackup;
  payload: unknown;
}

export type Message =
  | RecordAttemptMessage
  | ObservePageMessage
  | GetSummariesMessage
  | GetQuestionMarksMessage
  | GetDashboardMessage
  | GetTopicPagesMessage
  | SetStarMessage
  | GetTopicDetailMessage
  | ReportHierarchyMessage
  | ReportDiagnosticMessage
  | RebuildAllMessage
  | ExportBackupMessage
  | ImportBackupMessage;

export interface RecordAttemptResponse {
  stored: boolean;
  duplicate: boolean;
}

export interface ObservePageResponse {
  rows: number;
}

export interface ReportDiagnosticResponse {
  ok: true;
}

export interface SetStarResponse {
  goId: string;
  starred: boolean;
}

/** How many topic rows the scraped hierarchy touched. */
export interface ReportHierarchyResponse {
  topics: number;
}

export interface RebuildAllResponse {
  questions: number;
  topics: number;
}

/** Response shape per message kind, keyed by the same enum used to dispatch. */
export interface ResponseMap {
  [MessageKind.RecordAttempt]: RecordAttemptResponse;
  [MessageKind.ObservePage]: ObservePageResponse;
  [MessageKind.GetSummaries]: Record<string, TopicSummary>;
  [MessageKind.GetQuestionMarks]: Record<string, QuestionMark>;
  [MessageKind.GetDashboard]: DashboardPayload;
  [MessageKind.GetTopicPages]: TopicPages;
  [MessageKind.SetStar]: SetStarResponse;
  [MessageKind.GetTopicDetail]: TopicDetail;
  [MessageKind.ReportHierarchy]: ReportHierarchyResponse;
  [MessageKind.ReportDiagnostic]: ReportDiagnosticResponse;
  [MessageKind.RebuildAll]: RebuildAllResponse;
  [MessageKind.ExportBackup]: Backup;
  [MessageKind.ImportBackup]: ImportOutcome;
}

export type Response<K extends MessageKind> = ResponseMap[K];

/**
 * Failure is a first-class outcome rather than a thrown exception, because the
 * caller is recording data the user cannot regenerate. A dropped solve must
 * become a visible notice, never a silent catch.
 */
export type SendResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "context-invalidated" | "error"; error: string };
