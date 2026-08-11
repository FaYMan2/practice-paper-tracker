/**
 * Content script.
 *
 * Phase 1: harvest every question on the page, then capture answers as they
 * happen. Markers (Phase 2) and resume (Phase 3) land here next.
 */

import { defineContentScript } from "wxt/utils/define-content-script";
import { startCapture } from "../utils/capture";
import { observePage } from "../utils/harvest";
import { MessageKind, reportDiagnostic, sendToBackground } from "../utils/messaging";
import {
  CONTEXT_INVALIDATED_MESSAGE,
  WRITE_FAILED_MESSAGE,
  showNotice,
} from "../utils/notice";
import { questionBlocks, selfCheck } from "../utils/selectors";
import { detectPage } from "../utils/url";
import type { CaptureFailure, CaptureHandle } from "../utils/capture";

export default defineContentScript({
  matches: ["https://practicepaper.in/*", "https://www.practicepaper.in/*"],
  runAt: "document_end",

  async main() {
    const page = detectPage(location.href);
    // A slug is all we need; `kind` is only a hint, and the real test for a
    // question page is whether a question area exists.
    if (!page.slug || page.kind === "other") return;

    await runSelfCheck();
    if (questionBlocks(document).length === 0) return;

    const pageNo = page.pageNo ?? 1;
    startTracking(page.slug, pageNo);
    await recordWhatIsOnThisPage(page.slug, pageNo);
  },
});

function startTracking(topicSlug: string, pageNo: number): void {
  let handle: CaptureHandle | null = null;

  const onSendFailure = (failure: CaptureFailure): void => {
    if (failure.reason === "context-invalidated") {
      // Nothing will succeed until the page reloads, so stop listening rather
      // than collecting answers we cannot persist.
      handle?.stop();
      showNotice(document, CONTEXT_INVALIDATED_MESSAGE, true);
      return;
    }

    console.error("[pptr] write failed", failure.error);
    showNotice(document, `${WRITE_FAILED_MESSAGE} ${failure.error}`, true);
  };

  handle = startCapture(document, {
    topicSlug,
    pageNo,
    pageLoadId: crypto.randomUUID(),
    onSendFailure,
  });

  if (!handle) return;
  console.info("[pptr] capturing", { topicSlug, pageNo, questions: handle.states.size });
}

async function recordWhatIsOnThisPage(topicSlug: string, pageNo: number): Promise<void> {
  const observation = observePage(document, topicSlug, pageNo);
  const result = await sendToBackground({
    kind: MessageKind.ObservePage,
    page: observation,
  });

  if (result.ok) return;
  // Indexing is rebuildable by revisiting the page, so this is logged rather
  // than shown — unlike a lost answer, nothing is permanently gone.
  console.warn("[pptr] could not record page", result.error);
}

async function runSelfCheck(): Promise<void> {
  const issues = selfCheck(document);
  if (issues.length === 0) return;

  console.warn("[pptr] self-check failed", issues);
  await Promise.all(
    issues.map((issue) => reportDiagnostic(issue.kind, issue.detail, location.href)),
  );
}
