/**
 * Message identifiers.
 *
 * An enum rather than loose string literals because these are dispatch keys:
 * they appear in a `switch` in the background worker, in every `sendToBackground`
 * call site, and inside `ResponseMap`. A typo in any of those is a runtime
 * no-op that would silently drop a write, and the enum makes it a compile error.
 */
export enum MessageKind {
  RecordAttempt = "recordAttempt",
  ObservePage = "observePage",
  GetSummaries = "getSummaries",
  GetQuestionMarks = "getQuestionMarks",
  GetTopicDetail = "getTopicDetail",
  GetDashboard = "getDashboard",
  GetTopicPages = "getTopicPages",
  SetStar = "setStar",
  ReportHierarchy = "reportHierarchy",
  ReportDiagnostic = "reportDiagnostic",
  RebuildAll = "rebuildAll",
  GetReviewQueue = "getReviewQueue",
  ExportBackup = "exportBackup",
  ImportBackup = "importBackup",
}

/**
 * Marks a reply as a failure rather than a result.
 *
 * A message handler that throws still has to answer — the caller is waiting —
 * and an unmarked `{ error }` object is indistinguishable from data to every
 * read path in the extension. One such reply reached `buildView` as if it were
 * a set of summaries and took the dashboard down with it.
 */
export const ERROR_MARKER = "__pptrError";

export interface ErrorReply {
  [ERROR_MARKER]: string;
}

/**
 * Errors that mean the content script has been orphaned by an extension
 * reload. The page must be reloaded before tracking resumes, so this is
 * reported to the user rather than swallowed.
 */
export const CONTEXT_INVALIDATED_PATTERN =
  /Extension context invalidated|Receiving end does not exist|message port closed/i;
