/** What the toolbar icon does. */

import { browser } from "wxt/browser";
import { DASHBOARD_PAGE } from "./constants";

export * from "./constants";

/**
 * Opens the dashboard in a new tab.
 *
 * Deliberately not "focus the existing tab if there is one": finding it means
 * querying tabs by URL, which needs the `tabs` permission, and asking for
 * read access to every tab the user has open is a poor trade for skipping a
 * duplicate.
 */
export async function openDashboard(): Promise<void> {
  await browser.tabs.create({ url: browser.runtime.getURL(DASHBOARD_PAGE) });
}
