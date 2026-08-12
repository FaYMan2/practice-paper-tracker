/**
 * The `chrome.storage.local` summary mirror.
 *
 * Deliberately separate from `./index`, which pulls in Dexie: the content
 * script needs to read summaries but must never load the database, both to
 * keep the injected bundle small and because IndexedDB opened from a content
 * script belongs to practicepaper.in's origin rather than ours.
 */

import { storage } from "wxt/utils/storage";
import type { TopicSummary } from "../../types";
import { SUMMARY_STORAGE_ITEM } from "./constants";

const summaryItem = storage.defineItem<Record<string, TopicSummary>>(SUMMARY_STORAGE_ITEM, {
  fallback: {},
});

/**
 * Read-modify-write against a single storage key races when two topic tabs
 * report at once, so every write goes through one promise chain.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  writeChain = result.catch(() => undefined);
  return result;
}

export async function getSummaries(): Promise<Record<string, TopicSummary>> {
  return await summaryItem.getValue();
}

export async function getSummary(slug: string): Promise<TopicSummary | null> {
  return (await summaryItem.getValue())[slug] ?? null;
}

/**
 * Whether writing these would change anything.
 *
 * Every write notifies each open tab, and the dashboard re-reads the database
 * whenever it is notified — so a write that changes nothing is at best a wasted
 * repaint and at worst a loop.
 */
function isUnchanged(
  existing: Record<string, TopicSummary>,
  updated: TopicSummary[],
): boolean {
  return updated.every(
    (summary) => JSON.stringify(existing[summary.slug]) === JSON.stringify(summary),
  );
}

export async function mergeSummaries(updated: TopicSummary[]): Promise<void> {
  if (updated.length === 0) return;

  await serializeWrite(async () => {
    const existing = await summaryItem.getValue();
    if (isUnchanged(existing, updated)) return;

    const bySlug = Object.fromEntries(updated.map((summary) => [summary.slug, summary]));
    await summaryItem.setValue({ ...existing, ...bySlug });
  });
}

export async function putSummary(summary: TopicSummary): Promise<void> {
  await mergeSummaries([summary]);
}

/** Notifies on every summary write, so an open page can repaint live. */
export function watchSummaries(
  onChange: (summaries: Record<string, TopicSummary>) => void,
): () => void {
  return summaryItem.watch((value) => onChange(value ?? {}));
}
