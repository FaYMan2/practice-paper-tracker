/**
 * The single writer. Owns IndexedDB; every mutation in the extension passes
 * through here.
 *
 * MV3 terminates this worker after ~30s idle, so nothing may be cached in
 * module scope, and the message listener must be registered synchronously at
 * the top level so a cold start can receive the event that woke it. The work
 * itself lives in `services/messages`.
 */

import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import { handleMessage } from "../services/messages";
import type { Message } from "../types";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message;

    handleMessage(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        console.error("[pptr] handler failed", message?.kind, error);
        sendResponse({ error: error instanceof Error ? error.message : String(error) });
      });

    // Keeps the message channel open for the async response.
    return true;
  });

  console.info("[pptr] background ready");
});
