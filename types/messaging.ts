/**
 * The content script -> background message contract.
 *
 * One writer serialises concurrent tabs; two topic tabs open at once would
 * otherwise race on read-modify-write of the same topic summary.
 */

import type { MessageKind } from "../utils/messaging/constants";
import type { AttemptInput } from "./attempt";
import type { DiagnosticRecord } from "./diagnostic";
import type { QuestionType, Verdict } from "./question";
import type { TopicSummary } from "./summary";

/** One question as seen on a page, whether or not it was answered. */
export interface ObservedRow {
  ordinal: number;
  goId: string;
  examSlug: string | null;
  type: QuestionType;
  marks: number;
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

export interface GetStatusesMessage {
  kind: MessageKind.GetStatuses;
  goIds: string[];
}

export interface ReportDiagnosticMessage {
  kind: MessageKind.ReportDiagnostic;
  entry: Omit<DiagnosticRecord, "id">;
}

export interface RebuildAllMessage {
  kind: MessageKind.RebuildAll;
}

export type Message =
  | RecordAttemptMessage
  | ObservePageMessage
  | GetSummariesMessage
  | GetStatusesMessage
  | ReportDiagnosticMessage
  | RebuildAllMessage;

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

export interface RebuildAllResponse {
  questions: number;
  topics: number;
}

/** Response shape per message kind, keyed by the same enum used to dispatch. */
export interface ResponseMap {
  [MessageKind.RecordAttempt]: RecordAttemptResponse;
  [MessageKind.ObservePage]: ObservePageResponse;
  [MessageKind.GetSummaries]: Record<string, TopicSummary>;
  [MessageKind.GetStatuses]: Record<string, Verdict>;
  [MessageKind.ReportDiagnostic]: ReportDiagnosticResponse;
  [MessageKind.RebuildAll]: RebuildAllResponse;
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
