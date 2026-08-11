/**
 * Content script — Phase 0 stub.
 *
 * For now this only classifies the page and reports selector health, which is
 * enough to verify the plumbing end to end. Capture (Phase 1), markers
 * (Phase 2) and resume (Phase 3) land here next.
 */

import { defineContentScript } from "wxt/utils/define-content-script";
import { detectPage } from "../utils/url";
import { questionBlocks, selfCheck, totalQuestionsFromStatus } from "../utils/selectors";
import { reportDiagnostic } from "../utils/messaging";

export default defineContentScript({
  matches: ["https://practicepaper.in/*", "https://www.practicepaper.in/*"],
  runAt: "document_end",

  async main() {
    const page = detectPage(location.href);
    if (page.kind === "other") return;

    console.info("[pptr]", {
      kind: page.kind,
      slug: page.slug,
      pageNo: page.pageNo,
      questions: questionBlocks(document).length,
      totalFromSite: totalQuestionsFromStatus(document),
      resume: page.resume,
    });

    if (page.kind === "index") return;

    const issues = selfCheck(document);
    if (issues.length === 0) return;

    console.warn("[pptr] self-check failed", issues);
    await Promise.all(
      issues.map((issue) => reportDiagnostic(issue.kind, issue.detail, location.href)),
    );
  },
});
