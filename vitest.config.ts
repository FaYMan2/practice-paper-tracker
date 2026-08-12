import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  // Installs WXT's fake browser, so modules that touch `storage` at import time
  // (utils/summary defines its storage item at module scope) can be tested.
  plugins: [WxtVitest()],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    environmentOptions: {
      happyDOM: {
        // The fixtures are real pages carrying ad and analytics tags. Without
        // this, happy-dom tries to fetch them and floods the run with
        // AbortErrors on teardown.
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableCSSFileLoading: true,
          disableComputedStyleRendering: true,
        },
      },
    },
  },
});
