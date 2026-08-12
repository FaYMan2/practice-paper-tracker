/** Subscribing the dashboard to what has been recorded. */

import { useEffect, useState } from "react";
import { buildView } from "../../utils/dashboard";
import type { DashboardView } from "../../utils/dashboard";
import { loadView, watchView } from "./data";

const PENDING: DashboardView = buildView({});

export interface DashboardData {
  view: DashboardView;
  /** True until the first read of the mirror resolves, which is near-instant. */
  loading: boolean;
}

/**
 * Reads the summary mirror, then keeps following it.
 *
 * Watching rather than fetching once is what makes the page track a topic
 * being worked on in another tab: every recorded answer rewrites the mirror,
 * and `storage.onChanged` delivers it here.
 */
export function useDashboard(): DashboardData {
  const [view, setView] = useState<DashboardView>(PENDING);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let live = true;

    void loadView().then((initial) => {
      if (!live) return;
      setView(initial);
      setLoading(false);
    });

    const unwatch = watchView((next) => {
      if (live) setView(next);
    });

    return () => {
      live = false;
      unwatch();
    };
  }, []);

  return { view, loading };
}
