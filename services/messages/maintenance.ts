/** Rebuilding everything derived from the attempt log. */

import { rebuildQuestionProjections } from "../../utils/db";
import { refreshAllSummaries } from "../../utils/summary";
import type { MessageKind } from "../../utils/messaging";
import type { ResponseMap } from "../../types";

/**
 * Recomputes the question projections and every topic summary from `attempts`.
 * Used after an import, or when the mirror is suspected of drifting.
 */
export async function rebuildAll(): Promise<ResponseMap[MessageKind.RebuildAll]> {
  const rebuilt: ResponseMap[MessageKind.RebuildAll] = {
    questions: await rebuildQuestionProjections(),
    topics: await refreshAllSummaries(),
  };
  return rebuilt;
}
