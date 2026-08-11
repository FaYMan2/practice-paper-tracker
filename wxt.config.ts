import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "PracticePaper Tracker",
    description:
      "Durable progress tracking for GATE CSE previous-year questions on practicepaper.in.",
    permissions: ["storage"],
    // Needed from Phase 5, when the background worker fetches topic pages to
    // build a coverage index. A single narrow host, declared up front so the
    // permission set stops changing under the user.
    host_permissions: ["https://practicepaper.in/*", "https://www.practicepaper.in/*"],
  },
});
