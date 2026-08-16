/** Subscribing the dashboard to what is due for review. */

import { useEffect, useState } from "react";
import { MessageKind, sendToBackground } from "../../utils/messaging";
import { watchSummaries } from "../../utils/summary/mirror";
import type { ReviewQueue } from "../../utils/review";

const EMPTY: ReviewQueue = { due: [], upcoming: [], tracked: 0, unplaced: 0 };

export interface ReviewData {
  queue: ReviewQueue;
  loading: boolean;
}

async function loadQueue(): Promise<ReviewQueue> {
  const result = await sendToBackground({ kind: MessageKind.GetReviewQueue });
  if (result.ok) return result.data;

  console.warn("[pptr] could not read the review queue", result.error);
  return EMPTY;
}

/**
 * Reads the queue, then re-reads it whenever anything is recorded.
 *
 * Watching the summary mirror rather than polling: answering a question in
 * another tab rewrites it, and that is exactly the event that can take a
 * question off this list.
 */
export function useReview(): ReviewData {
  const [queue, setQueue] = useState<ReviewQueue>(EMPTY);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let live = true;

    const refresh = (): void => {
      void loadQueue().then((next) => {
        if (!live) return;
        setQueue(next);
        setLoading(false);
      });
    };

    refresh();
    const unwatch = watchSummaries(refresh);

    return () => {
      live = false;
      unwatch();
    };
  }, []);

  return { queue, loading };
}
