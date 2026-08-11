/** Everything the URL layer knows about how practicepaper.in addresses pages. */

/** Every topic page holds exactly 5 questions, remainder on the last page. */
export const QUESTIONS_PER_PAGE = 5;

/**
 * Both hosts serve the site. The topic index page links with `www.` while the
 * topic pages themselves use the bare host, so any slug comparison that skips
 * normalisation silently matches nothing.
 */
export const SITE_HOSTS = ["practicepaper.in", "www.practicepaper.in"] as const;

export const DEFAULT_ORIGIN = "https://practicepaper.in";

export const SECTION_PREFIX = "/gate-cse/";

/** Listing pages that carry no questions of their own. */
export const INDEX_SLUGS: ReadonlySet<string> = new Set([
  "topic-wise-practice-of-gate-cse-previous-year-papers",
  "gate-cse-subject-wise-questions",
  "gate-cse-year-wise-questions",
]);

/** Content pages under /gate-cse/ that are not question sets. */
export const NON_QUESTION_SLUGS: ReadonlySet<string> = new Set([
  "gate-cse-syllabus",
  "gate-cse-notes",
  "gate-cse-mock-test-series",
]);

/** e.g. gate-cse-2024-set-1, gate-cse-1997, isro-cse-2016, gate-it-2007. */
export const YEAR_SLUG_PATTERN = /^(?:gate|isro)-(?:cse|it)-\d{4}(?:-set-\d+)?$/;

/** The slug after the id varies for the same question, so only the id matters. */
export const GO_ID_PATTERN = /gateoverflow\.in\/(\d+)/;

/** "Question 271" -> 271. Tolerates casing, extra spaces and stray separators. */
export const ORDINAL_PATTERN = /question\s*[:\-]?\s*(\d+)/i;

/**
 * Resume travels in the fragment rather than in storage: WordPress ignores it,
 * and unlike a stored pending action it cannot fire a day later in a tab the
 * user opened by hand.
 */
export const RESUME_HASH_PREFIX = "#pptr-resume=";

/** Marks an ordinal-based resume token, used when the goId is unknown. */
export const RESUME_ORDINAL_PREFIX = "ord:";

/** Namespace for questions with no GateOverflow anchor. */
export const PROVISIONAL_KEY_PREFIX = "pp:";
