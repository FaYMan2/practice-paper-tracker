/** Reporting when the site's markup stops matching our selectors. */

import { reportDiagnostic } from "../../utils/messaging";
import { selfCheck } from "../../utils/selectors";

/**
 * Runs the integrity check and forwards anything it finds.
 *
 * The point is not to repair anything — it is that a markup change becomes a
 * toolbar badge instead of months of quietly unrecorded practice.
 */
export async function reportPageHealth(doc: Document, href: string): Promise<void> {
  const issues = selfCheck(doc);
  if (issues.length === 0) return;

  console.warn("[pptr] self-check failed", issues);
  await Promise.all(issues.map((issue) => reportDiagnostic(issue.kind, issue.detail, href)));
}
