/**
 * Content script.
 *
 * Phase 1 captured answers; Phase 2 shows them back. On load we paint what is
 * already known, index what is on screen, then repaint from the refreshed
 * result. Resume (Phase 3) lands here next.
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
import { injectStyles, paintProgressStrip, paintQuestionMarkers } from "../utils/overlay";
import { describeQuestions, questionBlocks, selfCheck } from "../utils/selectors";
import { getSummaries, watchSummaries } from "../utils/summary/mirror";
import { detectPage } from "../utils/url";
import type { CaptureFailure, CaptureHandle } from "../utils/capture";
import type { QuestionDescriptor } from "../utils/selectors";
import type { TopicSummary } from "../types";

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

    const topicSlug = page.slug;
    const pageNo = page.pageNo ?? 1;
    const questions = describeQuestions(document, topicSlug);

    injectStyles(document);
    startTracking(topicSlug, pageNo);
    followProgress(topicSlug);

    // Indexing this page changes the topic's counts, so paint after it lands.
    await recordWhatIsOnThisPage(topicSlug, pageNo);
    await paintMarkers(topicSlug, questions);
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

/**
 * Paints the strip from the mirrored summary, then keeps it live. Reading
 * `storage.local` avoids waiting on a cold service worker, and watching it
 * means answering a question updates the strip without a reload.
 */
function followProgress(topicSlug: string): void {
  const render = (summaries: Record<string, TopicSummary>): void => {
    paintProgressStrip(document, summaries[topicSlug] ?? null);
  };

  void getSummaries().then(render);
  watchSummaries(render);
}

async function paintMarkers(
  topicSlug: string,
  questions: QuestionDescriptor[],
): Promise<void> {
  const goIds = questions.map((question) => question.goId);
  const [marks, summaries] = await Promise.all([
    sendToBackground({ kind: MessageKind.GetQuestionMarks, goIds }),
    getSummaries(),
  ]);

  if (!marks.ok) {
    console.warn("[pptr] could not read progress", marks.error);
    return;
  }

  const topicTitles = Object.fromEntries(
    Object.values(summaries).map((summary) => [summary.slug, summary.title]),
  );
  const painted = paintQuestionMarkers(document, {
    questions,
    marks: marks.data,
    topicSlug,
    topicTitles,
  });

  console.info("[pptr] marked", painted, "of", questions.length);
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
