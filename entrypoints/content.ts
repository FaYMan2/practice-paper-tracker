/**
 * Content script.
 *
 * Registration only — which pages to run on, and when. What actually happens
 * on each page shape lives in `services/page`.
 */

import { defineContentScript } from "wxt/utils/define-content-script";
import { runOnPage } from "../services/page";

export default defineContentScript({
  matches: ["https://practicepaper.in/*", "https://www.practicepaper.in/*"],
  runAt: "document_end",

  main: () => runOnPage(document, location.href),
});
