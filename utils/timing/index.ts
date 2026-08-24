/**
 * How long a question took.
 *
 * Started by hand rather than inferred. The obvious automatic version — start
 * the clock when the question scrolls into view, stop it at the stamp — sounds
 * cheaper and measures the wrong thing: a question sits on screen while you
 * read the one above it, scrolls past twice, and stays in view while you make
 * tea. That produces a number that looks like data, and every average built on
 * it would be quietly wrong. A clock you started is a claim you made.
 *
 * State lives here and nowhere else. The control that starts a clock and the
 * capture that stops it sit at opposite ends of the codebase, and a timer whose
 * truth lived in the DOM would lose it on the next repaint — the star button
 * rebuilds these nodes every time it is toggled.
 *
 * In memory for the page load only. A reload loses a running clock, which is
 * the same thing that already happens to a part-clicked MSQ, and persisting it
 * would mean deciding what a clock started yesterday means.
 */

import { ClockState, MAX_TIMED_MS } from "./constants";
import type { ClockReading, QuestionClocks } from "./types";

export * from "./constants";
export type * from "./types";

/** One question's clock. `startedAt` is null once it has stopped. */
interface Clock {
  startedAt: number | null;
  elapsedMs: number;
  state: ClockState;
}

const IDLE: ClockReading = { state: ClockState.Idle, elapsedMs: 0 };

/**
 * The page's clocks.
 *
 * `now` is injected so the whole thing can be tested without waiting: nothing
 * here reads the wall clock directly.
 */
export function createClocks(now: () => number = Date.now): QuestionClocks {
  const clocks = new Map<string, Clock>();

  function elapsedOf(clock: Clock): number {
    return clock.startedAt === null ? clock.elapsedMs : now() - clock.startedAt;
  }

  const api: QuestionClocks = {
    start(goId) {
      // Restarting is deliberate: a second click on a question you are already
      // timing means you have started it again, not that you want the old run.
      clocks.set(goId, { startedAt: now(), elapsedMs: 0, state: ClockState.Running });
    },

    cancel(goId) {
      clocks.delete(goId);
    },

    stop(goId) {
      const clock = clocks.get(goId);
      if (!clock || clock.state !== ClockState.Running) return null;

      const elapsedMs = elapsedOf(clock);
      // Kept in the map either way, so the control can show what happened
      // rather than snapping back to an untouched timer.
      const abandoned = elapsedMs > MAX_TIMED_MS;
      clocks.set(goId, {
        startedAt: null,
        elapsedMs,
        state: abandoned ? ClockState.Abandoned : ClockState.Stopped,
      });

      return abandoned ? null : elapsedMs;
    },

    read(goId) {
      const clock = clocks.get(goId);
      if (!clock) return IDLE;

      const reading: ClockReading = { state: clock.state, elapsedMs: elapsedOf(clock) };
      return reading;
    },

    anyRunning() {
      return [...clocks.values()].some((clock) => clock.state === ClockState.Running);
    },
  };
  return api;
}
