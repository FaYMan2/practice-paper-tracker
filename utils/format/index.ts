/** Generic formatting helpers, shared by any surface that renders. */

/** "11 Aug 2026", in the user's locale. Null passes through. */
export function formatDate(ts: number | null): string | null {
  if (ts === null) return null;
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "discrete-mathematics" -> "Discrete Mathematics". */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Strips the SEO boilerplate from a page heading.
 *
 * The site heads every topic page with something like "GATE CSE Discrete
 * Mathematics Previous Year Questions – Solved PYQs". Every one of those pages
 * says the same thing, so keeping it makes a list of topics unreadable while
 * telling the reader nothing. What is left is the topic's actual name.
 */
export function cleanTopicTitle(raw: string | null): string | null {
  if (raw === null) return null;

  const trimmed = raw
    .replace(/^GATE\s+CSE\s+/i, "")
    .replace(/\s*[–—-]?\s*Solved\s+PYQs?\s*$/i, "")
    .replace(/\s*Previous\s+Year\s+Questions?\s*/i, " ")
    .replace(/\s*\(Solved\)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Never turn a heading we did not recognise into nothing.
  return trimmed === "" ? raw.trim() : trimmed;
}

/** Slug words that are acronyms, so title casing them reads wrongly. */
const ACRONYMS: ReadonlySet<string> = new Set(["gate", "cse", "it", "isro", "me", "ce"]);

/** "gate-cse-2024-set-1" -> "GATE CSE 2024 Set 1". */
export function examDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => (ACRONYMS.has(word) ? word.toUpperCase() : slugToTitle(word)))
    .join(" ");
}

/** The site's own title for a topic, falling back to a readable slug. */
export function topicDisplayName(
  slug: string,
  titles: Record<string, string | null>,
): string {
  return titles[slug] || slugToTitle(slug);
}

/** Stands in for a number that does not exist yet, rather than a misleading 0. */
export const NO_VALUE = "—";

/** 0.72 -> "72%". Null renders as a dash, not as zero. */
export function formatPercent(fraction: number | null): string {
  if (fraction === null) return NO_VALUE;
  return `${Math.round(fraction * 100)}%`;
}

/**
 * A duration as a clock reads it: "0:47", "2:05", "1:03:20".
 *
 * Seconds are always two digits so the column does not jitter as it counts, and
 * the hour only appears when there is one — a question that took an hour is a
 * different kind of event from one that took two minutes, and padding every
 * reading to "0:02:05" to accommodate it makes the common case harder to scan.
 */
export function formatDuration(ms: number | null | undefined): string | null {
  // Anything that is not a real duration renders as nothing, not as a reading.
  //
  // `undefined` is the case that bit: the field arrives from the background
  // worker, and a page can be newer than the worker that answers it — every
  // extension reload passes through that state. `ms === null` alone let an
  // absent field through to the arithmetic, and `undefined / 1000` is NaN, so
  // every row in the drill-down said "NaN:NaN". Negative is nonsense too, and
  // clamping it to "0:00" would report an instant answer that never happened.
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return null;

  const total = Math.round(ms / 1000);
  const seconds = String(total % 60).padStart(2, "0");
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** "1 attempt" / "3 attempts". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
