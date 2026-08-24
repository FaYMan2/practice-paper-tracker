/**
 * The stopwatch beside a question.
 *
 * Click it and it starts counting; answer the question and the stamp that
 * records the attempt stops it, freezing the reading in place. Click a running
 * one to throw that run away — a clock you started and then went to make tea on
 * is worse than no clock at all.
 *
 * The button holds no state. Everything it draws is read from the page's clocks
 * on each tick, which is what lets the star button rebuild these nodes without
 * losing a running timer: the DOM here is a view, and the truth is elsewhere.
 */

import "./Timer.css";

import { ClockState, TICK_MS } from "../../utils/timing";
import type { QuestionClocks } from "../../utils/timing";
import { formatDuration } from "../../utils/format";
import { CLS } from "../../utils/selectors";
import { UI_CLASS } from "../constants";
import { el } from "../util";
import { ABANDONED_TEXT, TIMER_GLYPH, TIMER_TITLE } from "./constants";

export * from "./constants";

const STATE_CLASS: Record<ClockState, string> = {
  [ClockState.Idle]: "",
  [ClockState.Running]: UI_CLASS.timerRunning,
  [ClockState.Stopped]: UI_CLASS.timerStopped,
  [ClockState.Abandoned]: UI_CLASS.timerAbandoned,
};

function label(state: ClockState, elapsedMs: number): string {
  if (state === ClockState.Idle) return TIMER_GLYPH;
  if (state === ClockState.Abandoned) return `${TIMER_GLYPH} ${ABANDONED_TEXT}`;
  return `${TIMER_GLYPH} ${formatDuration(elapsedMs)}`;
}

export function Timer(doc: Document, goId: string, clocks: QuestionClocks): HTMLElement {
  const button = el(doc, "button", `${CLS.ours} ${UI_CLASS.timer}`);
  button.setAttribute("type", "button");

  let tick: ReturnType<typeof setInterval> | null = null;

  function stopTicking(): void {
    if (tick === null) return;
    clearInterval(tick);
    tick = null;
  }

  function startTicking(): void {
    if (tick !== null) return;
    tick = setInterval(() => {
      // A repaint replaces this node rather than updating it, so an interval
      // outliving its button is the leak to guard against — and the only place
      // that can notice is the interval itself.
      if (!button.isConnected) return stopTicking();
      render();
    }, TICK_MS);
  }

  function render(): void {
    const { state, elapsedMs } = clocks.read(goId);
    const modifier = STATE_CLASS[state];

    button.className = `${CLS.ours} ${UI_CLASS.timer}${modifier ? ` ${modifier}` : ""}`;
    button.textContent = label(state, elapsedMs);
    button.title = TIMER_TITLE[state];
    button.setAttribute("aria-pressed", String(state === ClockState.Running));

    // Started unconditionally rather than only when mounted: a repaint builds
    // this node detached, and a running clock has to keep counting through it.
    if (state === ClockState.Running) startTicking();
    else stopTicking();
  }

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const { state } = clocks.read(goId);
    if (state === ClockState.Running) clocks.cancel(goId);
    // A stopped clock is a record, not a control: restarting it would offer to
    // overwrite a measurement with one taken after you already knew the answer.
    else if (state === ClockState.Idle) clocks.start(goId);

    render();
  });

  render();
  return button;
}
