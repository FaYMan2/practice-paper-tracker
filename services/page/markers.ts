/** Marking questions that have been answered before. */

import { paintQuestionMarkers } from "../../components";
import { MessageKind, sendToBackground } from "../../utils/messaging";
import { getSummaries } from "../../utils/summary/mirror";
import type { TopicSummary } from "../../types";
import type { QuestionPageContext } from "./types";

function titlesBySlug(summaries: Record<string, TopicSummary>): Record<string, string | null> {
  return Object.fromEntries(
    Object.values(summaries).map((summary) => [summary.slug, summary.title]),
  );
}

/**
 * Asks the background what it knows about the questions on this page, then
 * paints each one. Per-question detail is too large to mirror, so unlike the
 * progress strip this costs one message round trip.
 */
export async function paintMarkers(context: QuestionPageContext): Promise<void> {
  const goIds = context.questions.map((question) => question.goId);
  const [marks, summaries] = await Promise.all([
    sendToBackground({ kind: MessageKind.GetQuestionMarks, goIds }),
    getSummaries(),
  ]);

  if (!marks.ok) {
    console.warn("[pptr] could not read progress", marks.error);
    return;
  }

  const painted = paintQuestionMarkers(context.doc, {
    questions: context.questions,
    marks: marks.data,
    topicSlug: context.topicSlug,
    topicTitles: titlesBySlug(summaries),
  });

  console.info("[pptr] marked", painted, "of", context.questions.length);
}
