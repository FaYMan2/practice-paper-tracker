/**
 * Our UI on top of the site's page.
 *
 * Styles are injected as one `<style>` element rather than a bundled
 * stylesheet: everything is namespaced under `pptr-`, and keeping the rules
 * beside the markup that uses them makes a visual break a one-file fix, the
 * same reasoning as `utils/selectors`.
 */

export const STYLE_ID = "pptr-styles";
export const STRIP_ID = "pptr-progress";

export const OVERLAY_CLASS = {
  badge: "pptr-badge",
  strip: "pptr-strip",
  stripItem: "pptr-strip-item",
  stripLabel: "pptr-strip-label",
  stripNote: "pptr-strip-note",
} as const;

/** Marker glyphs, kept short so they sit beside "Question 271" comfortably. */
export const GLYPH = {
  correct: "✓",
  wrong: "✗",
  elsewhere: "★",
} as const;

/**
 * The site is light-themed WordPress with unpredictable global rules, so every
 * property that matters is stated explicitly rather than inherited.
 */
export const OVERLAY_CSS = `
.pptr-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
  font: 600 11px/1.7 system-ui, sans-serif;
  letter-spacing: .02em;
  vertical-align: middle;
  white-space: nowrap;
  cursor: help;
}
.pptr-badge.pptr-solved { color: #15803d; background: #dcfce7; }
.pptr-badge.pptr-wrong { color: #b91c1c; background: #fee2e2; }
.pptr-badge.pptr-elsewhere { color: #b45309; background: #fef3c7; }

.pptr-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 14px;
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #2f6d1a;
  border-radius: 6px;
  background: #f8fafc;
  color: #334155;
  font: 13px/1.5 system-ui, sans-serif;
}
.pptr-strip-label {
  font-weight: 700;
  color: #2f6d1a;
  letter-spacing: .02em;
}
.pptr-strip-item { white-space: nowrap; }
.pptr-strip-item b { color: #0f172a; font-weight: 700; }
.pptr-strip-note { color: #64748b; font-style: italic; }
`;

export const STRIP_LABEL = "Your progress";

/** Shown when the row index is incomplete, so counts are a floor not a total. */
export const PARTIAL_INDEX_NOTE = "partial index";

export const NO_PROGRESS_NOTE = "nothing recorded in this topic yet";
