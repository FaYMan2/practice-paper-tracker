/**
 * Health signals. A markup change on the site must surface as a toolbar badge
 * rather than months of quietly unrecorded practice.
 */

export interface DiagnosticRecord {
  id?: number;
  ts: number;
  /**
   * Typed as a bare string because this is a storage record that must accept
   * kinds added in later phases. Producers pass an enum member — see
   * `SelfCheckIssueKind` — so call sites stay checked.
   */
  kind: string;
  detail: string;
  url: string;
}
