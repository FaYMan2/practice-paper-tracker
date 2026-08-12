import { defineConfig } from "wxt";

export default defineConfig({
  // Only the dashboard is React. The content script stays plain DOM: it is
  // injected into someone else's page and every kilobyte is paid for on each
  // page load, so there is nothing to gain there.
  modules: ["@wxt-dev/module-react"],

  manifest: {
    name: "PracticePaper Tracker",
    description:
      "Durable progress tracking for GATE CSE previous-year questions on practicepaper.in.",
    permissions: ["storage"],
    // No popup: clicking the icon opens the dashboard, and the same action is
    // what carries the "!" badge when the site's markup stops matching.
    action: { default_title: "PracticePaper Tracker" },
    // Needed from Phase 5, when the background worker fetches topic pages to
    // build a coverage index. A single narrow host, declared up front so the
    // permission set stops changing under the user.
    host_permissions: ["https://practicepaper.in/*", "https://www.practicepaper.in/*"],
  },
});
