import { describe, expect, it } from "vitest";
import { ClockState, MAX_TIMED_MS, MINUTE_MS, SECOND_MS, createClocks } from "../utils/timing";
import { formatDuration } from "../utils/format";

/** A clock the test moves by hand, so nothing here waits on real time. */
function fakeNow(start = 1_000_000) {
  let now = start;
  return {
    read: () => now,
    advance(ms: number) {
      now += ms;
    },
  };
}

describe("question clocks", () => {
  it("counts up from the moment it is started", () => {
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("523106");
    clock.advance(7 * SECOND_MS);

    expect(clocks.read("523106")).toEqual({
      state: ClockState.Running,
      elapsedMs: 7 * SECOND_MS,
    });
  });

  it("knows nothing about a question that was never timed", () => {
    const clocks = createClocks(fakeNow().read);

    expect(clocks.read("523106").state).toBe(ClockState.Idle);
    // The important half: no timing means the attempt carries no duration at
    // all, rather than a zero that would read as an instant answer.
    expect(clocks.stop("523106")).toBeNull();
  });

  it("freezes at the value it stopped on", () => {
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("523106");
    clock.advance(90 * SECOND_MS);
    const saved = clocks.stop("523106");

    clock.advance(60 * SECOND_MS);

    expect(saved).toBe(90 * SECOND_MS);
    expect(clocks.read("523106")).toEqual({
      state: ClockState.Stopped,
      elapsedMs: 90 * SECOND_MS,
    });
  });

  it("has nothing left to give once it has stopped", () => {
    // The second stamp of one logical answer must not record a second timing.
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("523106");
    clock.advance(30 * SECOND_MS);

    expect(clocks.stop("523106")).toBe(30 * SECOND_MS);
    expect(clocks.stop("523106")).toBeNull();
  });

  it("throws away a run that was cancelled", () => {
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("523106");
    clock.advance(30 * SECOND_MS);
    clocks.cancel("523106");

    expect(clocks.read("523106").state).toBe(ClockState.Idle);
    expect(clocks.stop("523106")).toBeNull();
  });

  it("refuses a run long enough to mean you walked away", () => {
    // Thirty minutes on a question worth two is a clock left running, and
    // averaging it in would quietly poison everything built on this.
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("523106");
    clock.advance(MAX_TIMED_MS + MINUTE_MS);

    expect(clocks.stop("523106")).toBeNull();
    // Still says what happened, rather than snapping back to an untouched timer.
    expect(clocks.read("523106").state).toBe(ClockState.Abandoned);
  });

  it("keeps each question's clock to itself", () => {
    const clock = fakeNow();
    const clocks = createClocks(clock.read);

    clocks.start("A");
    clock.advance(10 * SECOND_MS);
    clocks.start("B");
    clock.advance(5 * SECOND_MS);

    expect(clocks.read("A").elapsedMs).toBe(15 * SECOND_MS);
    expect(clocks.read("B").elapsedMs).toBe(5 * SECOND_MS);
    expect(clocks.anyRunning()).toBe(true);

    clocks.stop("A");
    clocks.stop("B");
    expect(clocks.anyRunning()).toBe(false);
  });
});

describe("formatDuration", () => {
  it("pads the seconds so a running clock does not jitter", () => {
    expect(formatDuration(7 * SECOND_MS)).toBe("0:07");
    expect(formatDuration(125 * SECOND_MS)).toBe("2:05");
  });

  it("shows an hour only when there is one", () => {
    expect(formatDuration(59 * MINUTE_MS)).toBe("59:00");
    expect(formatDuration(3800 * SECOND_MS)).toBe("1:03:20");
  });

  it("passes a missing duration through rather than rendering a zero", () => {
    expect(formatDuration(null)).toBeNull();
  });
});
