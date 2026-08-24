/** What a question's clock looks like from outside. */

import type { ClockState } from "./constants";

export interface ClockReading {
  state: ClockState;
  /**
   * Milliseconds on the clock: counting up while running, frozen once stopped,
   * and zero when idle. Present even for an abandoned clock, so the control can
   * say how long ran before it was thrown away.
   */
  elapsedMs: number;
}

/**
 * Every question's clock on this page, keyed by goId.
 *
 * One object shared by the control that starts a clock and the capture that
 * stops it, because they live at opposite ends of the codebase and must not
 * each keep their own idea of what is running.
 */
export interface QuestionClocks {
  start(goId: string): void;
  /** Throws the clock away without recording anything. */
  cancel(goId: string): void;
  /**
   * Stops the clock and returns what to save, or null when there is nothing
   * worth saving — never started, already stopped, or ran past the cap.
   */
  stop(goId: string): number | null;
  read(goId: string): ClockReading;
  /** True while any clock on the page is running, for cheap tick scheduling. */
  anyRunning(): boolean;
}
