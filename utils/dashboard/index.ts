/**
 * Turning topic summaries into the shape the dashboard shows.
 *
 * Pure: no DOM, no storage, no messaging — which is why it lives here rather
 * than in `services/dashboard`, and why the dashboard components can import it
 * without the two folders depending on each other.
 */

export * from "./constants";
export * from "./filters";
export * from "./grouping";
export * from "./stats";
export type * from "./types";
