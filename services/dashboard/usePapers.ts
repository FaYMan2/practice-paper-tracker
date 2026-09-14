/** Subscribing the dashboard to the papers you have sat. */

import { useEffect, useState } from "react";
import { MessageKind, sendToBackground } from "../../utils/messaging";
import { watchSummaries } from "../../utils/summary/mirror";
import type { PaperDetail, PaperSummary } from "../../utils/papers";

export interface PapersData {
  papers: PaperSummary[];
  loading: boolean;
}

async function loadPapers(): Promise<PaperSummary[]> {
  const result = await sendToBackground({ kind: MessageKind.GetPapers });
  if (result.ok) return result.data.papers;

  console.warn("[pptr] could not read the papers", result.error);
  return [];
}

/**
 * Reads the papers, then re-reads them whenever anything is recorded.
 *
 * Watching the summary mirror rather than polling, for the same reason the
 * review queue does: answering a question in another tab rewrites it, and that
 * is exactly the event that changes a score here.
 */
export function usePapers(): PapersData {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let live = true;

    const refresh = (): void => {
      void loadPapers().then((loaded) => {
        if (!live) return;
        setPapers(loaded);
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

  return { papers, loading };
}

export interface PaperDetailData {
  detail: PaperDetail | null;
  loading: boolean;
}

/**
 * Loads whichever paper is open, and nothing while none is.
 *
 * The same in-flight guard as the topic drill-down: opening papers in quick
 * succession leaves earlier round trips running, and a late answer must not
 * repopulate a panel that has moved on.
 */
export function usePaperDetail(slug: string | null): PaperDetailData {
  const [detail, setDetail] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (slug === null) {
      setDetail(null);
      setLoading(false);
      return;
    }

    let live = true;
    setDetail(null);
    setLoading(true);

    void sendToBackground({ kind: MessageKind.GetPaperDetail, slug }).then((result) => {
      if (!live) return;
      setDetail(result.ok ? result.data : null);
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, [slug]);

  return { detail, loading };
}
