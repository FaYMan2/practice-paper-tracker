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

/** The site's own title for a topic, falling back to a readable slug. */
export function topicDisplayName(
  slug: string,
  titles: Record<string, string | null>,
): string {
  return titles[slug] || slugToTitle(slug);
}

/** "1 attempt" / "3 attempts". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
