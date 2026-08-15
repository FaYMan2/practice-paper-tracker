/** Types local to indexing a whole topic. */

/**
 * Where a crawl has got to.
 *
 * An enum because it is a dispatch key: the strip picks its label and its
 * control from it, and a typo would silently render nothing.
 */
export enum CrawlState {
  Running = "running",
  Done = "done",
  Cancelled = "cancelled",
  Failed = "failed",
}

export interface CrawlProgress {
  slug: string;
  state: CrawlState;
  /** The page currently being fetched, or the last one fetched once finished. */
  pageNo: number;
  /** Pages fetched this run, excluding ones already indexed. */
  fetched: number;
  /** Questions recorded this run. */
  recorded: number;
  /** Set only when `state` is `Failed`. */
  error?: string;
}

export interface CrawlOptions {
  /** Pages already indexed, which are skipped. */
  skip: number[];
  onProgress: (progress: CrawlProgress) => void;
  /** Records one fetched page. Returns how many rows it held. */
  record: (doc: Document, pageNo: number) => Promise<number>;
  /** Test seam; defaults to `globalThis.fetch`. */
  fetchPage?: (url: string) => Promise<string>;
  /** Test seam; defaults to a real delay. */
  wait?: (ms: number) => Promise<void>;
}

export interface CrawlHandle {
  /** Resolves when the crawl stops, however it stops. */
  finished: Promise<CrawlProgress>;
  cancel: () => void;
}
