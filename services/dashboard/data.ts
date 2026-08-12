/** Where the dashboard gets its data from. */

import { MessageKind, sendToBackground } from "../../utils/messaging";
import { getSummaries, watchSummaries } from "../../utils/summary/mirror";
import { buildView } from "../../utils/dashboard";
import type { TopicDetail } from "../../types";
import type { DashboardView } from "../../utils/dashboard";

/**
 * Figures come from the database, not from the `storage.local` mirror.
 *
 * The mirror exists for the injected UI, which cannot reach IndexedDB and must
 * paint before a cold service worker wakes. The dashboard has neither problem,
 * and a cache it does not need is a cache that can be wrong: reading through
 * the background means what is on screen is what is stored.
 */
export async function loadView(): Promise<DashboardView> {
  const result = await sendToBackground({ kind: MessageKind.GetDashboard });
  if (result.ok) return buildView(result.data);

  // The worker is unreachable, which on an extension page means it is being
  // reloaded. The mirror is the last thing it wrote, so it beats a blank page.
  console.warn("[pptr] falling back to the summary mirror", result.error);
  return buildView(await getSummaries());
}

/**
 * The mirror is still watched, but only as a signal that something changed —
 * every write to it is followed by a fresh read of the database.
 */
export function watchView(onChange: (view: DashboardView) => void): () => void {
  return watchSummaries(() => {
    void loadView().then(onChange);
  });
}

/**
 * Per-question detail is too large to mirror, so this is the one thing the
 * dashboard asks the background for — and only when a topic is expanded.
 */
export async function loadTopicDetail(slug: string): Promise<TopicDetail | null> {
  const result = await sendToBackground({ kind: MessageKind.GetTopicDetail, slug });
  if (result.ok) return result.data;

  console.warn("[pptr] could not read topic detail", result.error);
  return null;
}
