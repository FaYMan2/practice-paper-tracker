/** Sending messages from a content script to the background writer. */

import { browser } from "wxt/browser";
import type { Message, Response, SendResult } from "../../types";
import { CONTEXT_INVALIDATED_PATTERN, MessageKind } from "./constants";

export * from "./constants";

/**
 * After the extension reloads or updates, content scripts already injected into
 * open tabs are orphaned: `chrome.runtime.id` goes undefined and any send
 * throws. The page must be reloaded before tracking resumes, so this case is
 * distinguished for the UI rather than swallowed.
 */
export function isContextInvalidated(error: unknown): boolean {
  if (!globalThis.chrome?.runtime?.id) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return CONTEXT_INVALIDATED_PATTERN.test(message);
}

export async function sendToBackground<M extends Message>(
  message: M,
): Promise<SendResult<Response<M["kind"]>>> {
  try {
    const data = (await browser.runtime.sendMessage(message)) as Response<M["kind"]>;
    const success: SendResult<Response<M["kind"]>> = { ok: true, data };
    return success;
  } catch (error) {
    const failure: SendResult<Response<M["kind"]>> = {
      ok: false,
      reason: isContextInvalidated(error) ? "context-invalidated" : "error",
      error: error instanceof Error ? error.message : String(error),
    };
    return failure;
  }
}

/** Convenience wrapper so diagnostic reporting reads as one call. */
export async function reportDiagnostic(
  kind: string,
  detail: string,
  url: string,
): Promise<void> {
  await sendToBackground({
    kind: MessageKind.ReportDiagnostic,
    entry: { ts: Date.now(), kind, detail, url },
  });
}
