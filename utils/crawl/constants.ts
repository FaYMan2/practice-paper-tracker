/** Crawl pacing and limits. */

/**
 * Gap between requests. Serial and unhurried on purpose: this is someone
 * else's free site, and a subject is ~90 pages. At this rate a full crawl of
 * the largest topic takes about a minute, which is a fine price for turning
 * every count in that topic from a floor into a total.
 */
export const REQUEST_DELAY_MS = 700;

/**
 * Hard stop, far past the largest real topic (93 pages). A runaway loop here
 * would hammer the site, so the termination condition is not trusted alone.
 */
export const MAX_PAGES = 400;

/** Reported when a page cannot be fetched at all. */
export const CRAWL_FAILED_DIAGNOSTIC = "crawl-fetch-failed";
