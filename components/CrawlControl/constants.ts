/** Labels for the topic-indexing control. */

export const INDEX_LABEL = "Index this topic";

export const CANCEL_LABEL = "Stop";

export const CRAWL_MESSAGE = {
  running: "Indexing page",
  recorded: "questions found",
  done: "Indexed —",
  cancelled: "Indexing stopped. Run it again to carry on.",
  failed: "Indexing failed:",
} as const;
