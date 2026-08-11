/** Types local to answer capture. */

import type { Choice, Message, Response, SendResult } from "../../types";
import type { MessageKind } from "../messaging";
import type { QuestionDescriptor } from "../selectors";

/** How capture reaches the background writer. Injected so tests can observe it. */
export type SendFn = <M extends Message>(
  message: M,
) => Promise<SendResult<Response<M["kind"]>>>;

export interface CaptureOptions {
  topicSlug: string;
  pageNo: number;
  /**
   * Identifies this page load. Combined with the goId it forms the `eventId`
   * that makes the write idempotent, and it is what scopes "first stamp wins"
   * to a single load so a later re-attempt still appends.
   */
  pageLoadId: string;
  send?: SendFn;
  /** Surfaces an orphaned content script to the user. */
  onSendFailure?: (failure: CaptureFailure) => void;
}

export interface CaptureFailure {
  reason: "context-invalidated" | "error";
  error: string;
}

/** Per-question state for the lifetime of one page load. */
export interface QuestionState {
  descriptor: QuestionDescriptor;
  /**
   * Clicks seen so far. Discarded with the page if no stamp ever arrives — an
   * MSQ half-answered and abandoned is not an attempt.
   */
  choices: Choice[];
  /** Set by the first stamp; later stamps in the same load are ignored. */
  resolved: boolean;
}

export interface CaptureHandle {
  stop(): void;
  /** Exposed for tests and diagnostics. */
  readonly states: ReadonlyMap<Element, QuestionState>;
}

export type RecordAttemptResult = SendResult<Response<MessageKind.RecordAttempt>>;
