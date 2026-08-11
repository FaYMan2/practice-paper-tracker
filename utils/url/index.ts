/**
 * URL, slug and ordinal parsing.
 *
 * The most important thing here is host normalisation: the topic index page
 * serves its links as `www.practicepaper.in` while the topic pages themselves
 * use the bare host, so every href goes through `topicSlugFromHref`.
 */

import {
  DEFAULT_ORIGIN,
  GO_ID_PATTERN,
  INDEX_SLUGS,
  NON_QUESTION_SLUGS,
  ORDINAL_PATTERN,
  PROVISIONAL_KEY_PREFIX,
  QUESTIONS_PER_PAGE,
  RESUME_HASH_PREFIX,
  RESUME_ORDINAL_PREFIX,
  SECTION_PREFIX,
  SITE_HOSTS,
  YEAR_SLUG_PATTERN,
} from "./constants";
import type { PageInfo, PageKind, ResumeHashTarget, ResumeLinkTarget } from "./types";

export * from "./constants";
export type * from "./types";

export function isSiteHost(host: string): boolean {
  return (SITE_HOSTS as readonly string[]).includes(host.toLowerCase());
}

/** Strips `www.`, lowercases, and drops a trailing dot. */
export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

function safeUrl(input: string | URL, base?: string): URL | null {
  if (input instanceof URL) return input;
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

/**
 * Canonical form for comparing two links to the same page: https, bare host,
 * no trailing slash, no fragment, no query.
 */
export function canonicalUrl(input: string | URL): string | null {
  const url = safeUrl(input);
  if (!url) return null;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `https://${normalizeHost(url.hostname)}${path}`;
}

/**
 * Topic slug from any href, or null if it does not point at a /gate-cse/ page
 * on this site. Handles both hosts, trailing slashes, queries and fragments.
 */
export function topicSlugFromHref(href: string, base: string = DEFAULT_ORIGIN): string | null {
  const url = safeUrl(href, base);
  if (!url || !isSiteHost(url.hostname)) return null;
  if (!url.pathname.startsWith(SECTION_PREFIX)) return null;

  const rest = url.pathname.slice(SECTION_PREFIX.length).replace(/\/+$/, "");
  if (!rest || rest.includes("/")) return null;
  return decodeURIComponent(rest).toLowerCase();
}

export function isYearSlug(slug: string): boolean {
  return YEAR_SLUG_PATTERN.test(slug);
}

function classifySlug(slug: string): PageKind {
  if (INDEX_SLUGS.has(slug)) return "index";
  if (NON_QUESTION_SLUGS.has(slug)) return "other";
  return isYearSlug(slug) ? "year" : "topic";
}

/**
 * Classifies a URL. Only a hint — the content script confirms by looking for
 * `div.allquestionarea`, because the site can always add a page shape we have
 * not seen. Never gate data capture on this alone.
 */
export function detectPage(href: string): PageInfo {
  const url = safeUrl(href);
  const slug = url && isSiteHost(url.hostname) ? topicSlugFromHref(url.toString()) : null;

  if (!url || !slug) {
    const offSite: PageInfo = { kind: "other", slug: null, pageNo: null, resume: null };
    return offSite;
  }

  const kind = classifySlug(slug);
  const carriesQuestions = kind === "topic" || kind === "year";
  const page: PageInfo = {
    kind,
    slug,
    pageNo: carriesQuestions ? parsePageNo(url.searchParams.get("page_no")) : null,
    resume: parseResumeHash(url.hash),
  };
  return page;
}

/**
 * `?page_no=` is absent on page 1, and the site answers junk values with a
 * question-less 200 rather than an error, so anything unparseable is page 1.
 */
export function parsePageNo(raw: string | null | undefined): number {
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

/** "Question 271" -> 271. Null when the label does not parse. */
export function parseOrdinal(text: string | null | undefined): number | null {
  const digits = text ? ORDINAL_PATTERN.exec(text)?.[1] : undefined;
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

/**
 * GateOverflow numeric id from a solution href. The slug after the id varies
 * for the same question and may carry an `#a_list` fragment, so only the id is
 * meaningful.
 */
export function parseGoId(href: string | null | undefined): string | null {
  if (!href) return null;
  return GO_ID_PATTERN.exec(href)?.[1] ?? null;
}

/** Ordinal -> the 1-based page holding it. */
export function pageForOrdinal(ordinal: number): number {
  return Math.floor((ordinal - 1) / QUESTIONS_PER_PAGE) + 1;
}

/** Inclusive [first, last] ordinals a page would hold if it were full. */
export function ordinalRangeForPage(pageNo: number): [number, number] {
  const first = (pageNo - 1) * QUESTIONS_PER_PAGE + 1;
  return [first, first + QUESTIONS_PER_PAGE - 1];
}

export function topicUrl(slug: string, pageNo = 1): string {
  const base = `${DEFAULT_ORIGIN}${SECTION_PREFIX}${slug}`;
  return pageNo > 1 ? `${base}?page_no=${pageNo}` : base;
}

/** Encodes `#pptr-resume=<goId>`, or `#pptr-resume=ord:<ordinal>` as fallback. */
export function buildResumeUrl(slug: string, target: ResumeLinkTarget): string {
  const token = target.goId ?? `${RESUME_ORDINAL_PREFIX}${target.ordinal}`;
  const page = pageForOrdinal(target.ordinal);
  return `${topicUrl(slug, page)}${RESUME_HASH_PREFIX}${encodeURIComponent(token)}`;
}

export function parseResumeHash(hash: string | null | undefined): ResumeHashTarget | null {
  if (!hash) return null;

  const raw = hash.startsWith("#") ? hash : `#${hash}`;
  if (!raw.startsWith(RESUME_HASH_PREFIX)) return null;

  const token = decodeURIComponent(raw.slice(RESUME_HASH_PREFIX.length));
  if (!token) return null;

  if (token.startsWith(RESUME_ORDINAL_PREFIX)) {
    const ordinal = Number.parseInt(token.slice(RESUME_ORDINAL_PREFIX.length), 10);
    if (!Number.isFinite(ordinal) || ordinal < 1) return null;
    const byOrdinal: ResumeHashTarget = { goId: null, ordinal };
    return byOrdinal;
  }

  if (!/^\d+$/.test(token)) return null;
  const byGoId: ResumeHashTarget = { goId: token, ordinal: null };
  return byGoId;
}

/** Absolute URL for a lazy-loaded question image (`data-src` is relative). */
export function resolveAssetUrl(src: string): string | null {
  return safeUrl(src, DEFAULT_ORIGIN)?.toString() ?? null;
}

/** Synthetic identity for a question with no GateOverflow anchor. */
export function provisionalKey(topicSlug: string, ordinal: number): string {
  return `${PROVISIONAL_KEY_PREFIX}${topicSlug}:${ordinal}`;
}

export function isProvisionalKey(goId: string): boolean {
  return goId.startsWith(PROVISIONAL_KEY_PREFIX);
}
