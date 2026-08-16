import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  /*
   * Tailwind is for the dashboard only.
   *
   * The plugin is registered globally because Vite has one plugin list, but
   * nothing reaches the content script: Tailwind emits into whichever
   * stylesheet imports it, and only `components/dashboard/theme.css` does. The
   * injected UI keeps its own hand-written CSS, which is checked by asserting
   * on the built `content.css` size rather than assumed.
   */
  vite: () => ({ plugins: [tailwindcss()] }),

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
