/** Glyphs and labels for the question timer. */

/** A stopwatch, in a glyph every platform has. */
export const TIMER_GLYPH = "⏱";

export const TIMER_TITLE = {
  idle: "Time yourself on this question — the clock stops when you answer",
  running: "Timing — click to discard this run",
  stopped: "How long this took, saved with your answer",
  abandoned: "The clock ran too long to be believable, so it was not saved",
} as const;

/** Shown in place of a duration that was thrown away. */
export const ABANDONED_TEXT = "—";
