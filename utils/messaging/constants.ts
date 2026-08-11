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
  ReportDiagnostic = "reportDiagnostic",
  RebuildAll = "rebuildAll",
}

/**
 * Errors that mean the content script has been orphaned by an extension
 * reload. The page must be reloaded before tracking resumes, so this is
 * reported to the user rather than swallowed.
 */
export const CONTEXT_INVALIDATED_PATTERN =
  /Extension context invalidated|Receiving end does not exist|message port closed/i;
