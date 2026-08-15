/**
 * The UI injected into practicepaper.in's pages.
 *
 * One folder per component, each owning its own stylesheet. WXT collects every
 * CSS file reachable from the content script into `content-scripts/content.css`
 * and registers it in the manifest, so nothing is injected at runtime.
 */

import "./global.css";

export * from "./Badge";
export * from "./CrawlControl";
export * from "./Notice";
export * from "./ProgressStrip";
export * from "./ResumeLink";
export * from "./StarButton";
export * from "./TopicBadge";
export * from "./constants";
export * from "./util";
export type * from "./types";
