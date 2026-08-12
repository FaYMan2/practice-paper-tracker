/** Fetching one topic's questions, on demand. */

import { useEffect, useState } from "react";
import type { TopicDetail } from "../../types";
import { loadTopicDetail } from "./data";

export interface TopicDetailData {
  detail: TopicDetail | null;
  loading: boolean;
}

/**
 * Loads the questions of whichever topic is open, and nothing while none is.
 *
 * The cleanup flag matters more than usual here: expanding topics in quick
 * succession leaves earlier round trips in flight, and a late answer must not
 * repopulate a panel that has since moved on.
 */
export function useTopicDetail(slug: string | null): TopicDetailData {
  const [detail, setDetail] = useState<TopicDetail | null>(null);
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

    void loadTopicDetail(slug).then((loaded) => {
      if (!live) return;
      setDetail(loaded);
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, [slug]);

  return { detail, loading };
}
