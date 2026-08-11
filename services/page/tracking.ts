/** Starting answer capture, and surfacing it when writes stop working. */

import {
  CONTEXT_INVALIDATED_MESSAGE,
  WRITE_FAILED_MESSAGE,
  showNotice,
} from "../../components";
import { startCapture } from "../../utils/capture";
import type { CaptureFailure, CaptureHandle } from "../../utils/capture";
import type { QuestionPageContext } from "./types";

export function startTracking(context: QuestionPageContext): CaptureHandle | null {
  const { doc } = context;
  let handle: CaptureHandle | null = null;

  const onSendFailure = (failure: CaptureFailure): void => {
    if (failure.reason === "context-invalidated") {
      // Nothing will succeed until the page reloads, so stop listening rather
      // than collecting answers we cannot persist.
      handle?.stop();
      showNotice(doc, CONTEXT_INVALIDATED_MESSAGE, true);
      return;
    }

    console.error("[pptr] write failed", failure.error);
    showNotice(doc, `${WRITE_FAILED_MESSAGE} ${failure.error}`, true);
  };

  handle = startCapture(doc, {
    topicSlug: context.topicSlug,
    pageNo: context.pageNo,
    pageLoadId: crypto.randomUUID(),
    onSendFailure,
  });

  if (handle) {
    console.info("[pptr] capturing", {
      topicSlug: context.topicSlug,
      pageNo: context.pageNo,
      questions: handle.states.size,
    });
  }
  return handle;
}
