/** How long a question took, and when that number stops being believable. */

export const SECOND_MS = 1000;

export const MINUTE_MS = 60 * SECOND_MS;

/**
 * Above this, a timing is thrown away rather than saved.
 *
 * A GATE paper allows roughly two to three minutes a question, so thirty is
 * already absurd — it means the clock was left running while you did something
 * else. Recording it would be worse than recording nothing: an absent number
 * is visibly absent, while a forty-minute "attempt" silently poisons every
 * average built on top of it, and there is no way to tell later which of the
 * two it was.
 */
export const MAX_TIMED_MS = 30 * MINUTE_MS;

/**
 * How often a running timer redraws.
 *
 * Twice a second rather than once, so the display settles onto its final value
 * promptly when the stamp stops the clock — a whole second of a still-ticking
 * timer after you have answered reads as a control that did not notice.
 */
export const TICK_MS = 500;

/** Where a question's clock stands. */
export enum ClockState {
  /** Never started, or started and thrown away. */
  Idle = "idle",
  Running = "running",
  /** Stopped with a usable duration. */
  Stopped = "stopped",
  /** Stopped, but it ran too long to believe. */
  Abandoned = "abandoned",
}
