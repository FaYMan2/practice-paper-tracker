import { beforeEach, describe, expect, it, vi } from "vitest";
import { startCapture } from "../utils/capture";
import { MessageKind } from "../utils/messaging";
import { ATTR, CLS, SEL } from "../utils/selectors";
import type { AttemptInput, Message } from "../types";
import { FIXTURES, loadHtml } from "./fixtures";

/**
 * The fixtures are static HTML; the site's own quiz script never runs in these
 * tests. So each test drives both halves by hand: it clicks like the user, then
 * stamps like the site would, and asserts on what we recorded in between.
 */

interface Harness {
  doc: Document;
  questions: Element[];
  attempts: AttemptInput[];
  send: ReturnType<typeof vi.fn>;
  stop: () => void;
}

function mount(fixture: (typeof FIXTURES)[keyof typeof FIXTURES], pageNo = 1): Harness {
  const doc = loadHtml(fixture);
  // startCapture reads from a live document, so the fixture has to be adopted
  // into the test window rather than parsed in isolation.
  document.body.innerHTML = doc.body.innerHTML;

  const attempts: AttemptInput[] = [];
  const send = vi.fn(async (message: Message) => {
    if (message.kind === MessageKind.RecordAttempt) attempts.push(message.attempt);
    return { ok: true as const, data: { stored: true, duplicate: false } };
  });

  const handle = startCapture(document, {
    topicSlug: "data-structure",
    pageNo,
    pageLoadId: "load-1",
    send: send as never,
  });
  if (!handle) throw new Error("capture did not start");

  return {
    doc: document,
    questions: [...document.querySelectorAll(SEL.question)],
    attempts,
    send,
    stop: handle.stop,
  };
}

/** Simulates the site resolving a question. */
function stamp(question: Element, verdict: "correct" | "wrong"): void {
  const el = question.querySelector(SEL.stamp)!;
  el.classList.add(verdict === "correct" ? CLS.correctStamp : CLS.wrongStamp);
}

function clickOption(question: Element, label: string): void {
  const row = [...question.querySelectorAll(SEL.clickableRow)].find(
    (candidate) => candidate.querySelector(SEL.optionLabel)?.textContent?.trim() === label,
  );
  if (!row) throw new Error(`no option ${label}`);
  row.querySelector(SEL.optionLabel)!.dispatchEvent(new Event("click", { bubbles: true }));
}

/** Mirrors the site's own double-count guard. */
function markAnswered(question: Element): void {
  question.querySelector(SEL.answerTable)?.setAttribute(ATTR.answered, "true");
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("verdict capture", () => {
  it("records an attempt when the site stamps a question", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    stamp(h.questions[0]!, "correct");
    await flush();

    expect(h.attempts).toHaveLength(1);
    expect(h.attempts[0]).toMatchObject({
      goId: "523106",
      verdict: "correct",
      ordinal: 1,
      pageNo: 1,
      topicSlug: "data-structure",
      examSlug: "gate-cse-2026-set-2",
      type: "MSQ",
      marks: 2,
      pageLoadId: "load-1",
      eventId: "523106:load-1",
    });
  });

  it("records nothing until a stamp arrives", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    clickOption(h.questions[0]!, "A");
    await flush();

    // A half-answered MSQ the user walks away from is not an attempt.
    expect(h.attempts).toEqual([]);
  });

  it("takes only the first stamp within one page load", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    stamp(h.questions[0]!, "correct");
    stamp(h.questions[0]!, "wrong");
    await flush();

    expect(h.attempts).toHaveLength(1);
    expect(h.attempts[0]!.verdict).toBe("correct");
  });

  it("ignores class churn that is not a verdict", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const stampEl = h.questions[0]!.querySelector(SEL.stamp)!;

    // LiteSpeed and the ad slots flip classes inside the question area
    // constantly; none of it is an answer.
    stampEl.classList.add("litespeed-loaded");
    stampEl.classList.add(CLS.solved);
    await flush();

    expect(h.attempts).toEqual([]);
  });

  it("does not re-fire when a stamp class is re-applied", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const stampEl = h.questions[0]!.querySelector(SEL.stamp)!;
    stampEl.classList.add(CLS.correctStamp);
    await flush();
    stampEl.setAttribute("class", stampEl.getAttribute("class")!);
    await flush();

    expect(h.attempts).toHaveLength(1);
  });

  it("tracks each question independently", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    stamp(h.questions[0]!, "correct");
    stamp(h.questions[3]!, "wrong");
    await flush();

    expect(h.attempts.map((a) => [a.goId, a.verdict])).toEqual([
      ["523106", "correct"],
      ["523145", "wrong"],
    ]);
  });
});

describe("choice enrichment", () => {
  it("records the option the user picked, with the site's own labelling", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    clickOption(h.questions[3]!, "B");
    stamp(h.questions[3]!, "wrong");
    await flush();

    expect(h.attempts[0]!.choices).toEqual([
      { kind: "option", label: "B", correct: false, ts: expect.any(Number) },
    ]);
  });

  it("keeps every click of a multi-select, in order", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const msq = h.questions[0]!;

    // Correct, then wrong — the site stamps Wrong on the second click.
    clickOption(msq, "A");
    clickOption(msq, "C");
    stamp(msq, "wrong");
    await flush();

    expect(h.attempts[0]!.choices.map((c) => [c.label, c.correct])).toEqual([
      ["A", true],
      ["C", false],
    ]);
  });

  it("ignores clicks on a question the site has already counted", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const question = h.questions[3]!;

    clickOption(question, "A");
    markAnswered(question);
    clickOption(question, "B");
    stamp(question, "correct");
    await flush();

    expect(h.attempts[0]!.choices.map((c) => c.label)).toEqual(["A"]);
  });

  it("records the typed value for a numeric answer", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const nat = h.questions[2]!;
    const input = nat.querySelector<HTMLInputElement>(SEL.numericInput)!;
    input.value = "3";

    nat.querySelector(SEL.checkButton)!.dispatchEvent(new Event("click", { bubbles: true }));
    stamp(nat, "correct");
    await flush();

    expect(h.attempts[0]).toMatchObject({ goId: "523126", type: "NAT" });
    expect(h.attempts[0]!.choices).toEqual([
      { kind: "numeric", value: "3", ts: expect.any(Number) },
    ]);
  });

  it("ignores a numeric re-check the site itself would not count", async () => {
    const h = mount(FIXTURES.dataStructureP1);
    const nat = h.questions[2]!;
    const button = nat.querySelector(SEL.checkButton)!;
    const input = nat.querySelector<HTMLInputElement>(SEL.numericInput)!;

    input.value = "9";
    button.dispatchEvent(new Event("click", { bubbles: true }));
    button.setAttribute(ATTR.natGuard, "1");
    input.value = "3";
    button.dispatchEvent(new Event("click", { bubbles: true }));
    stamp(nat, "wrong");
    await flush();

    expect(h.attempts[0]!.choices.map((c) => c.value)).toEqual(["9"]);
  });
});

describe("append-only across page loads", () => {
  it("gives a second page load a distinct eventId for the same question", async () => {
    // Same question, answered again tomorrow: the eventId must differ, or the
    // unique index would collapse it onto the first attempt.
    const first = mount(FIXTURES.dataStructureP1);
    stamp(first.questions[0]!, "wrong");
    await flush();
    first.stop();

    document.body.innerHTML = "";
    const second = mount(FIXTURES.dataStructureP1);
    stamp(second.questions[0]!, "correct");
    await flush();

    expect(first.attempts[0]!.eventId).toBe("523106:load-1");
    expect(second.attempts[0]!.goId).toBe("523106");
    expect(second.attempts[0]!.verdict).toBe("correct");
    // Both survive; neither overwrites the other.
    expect(first.attempts[0]!.verdict).toBe("wrong");
  });
});

describe("failure handling", () => {
  it("reports an orphaned content script instead of dropping the answer", async () => {
    document.body.innerHTML = loadHtml(FIXTURES.dataStructureP1).body.innerHTML;
    const failures: unknown[] = [];

    const handle = startCapture(document, {
      topicSlug: "data-structure",
      pageNo: 1,
      pageLoadId: "load-x",
      send: (async () => ({
        ok: false,
        reason: "context-invalidated",
        error: "Extension context invalidated.",
      })) as never,
      onSendFailure: (failure) => failures.push(failure),
    })!;

    stamp(document.querySelectorAll(SEL.question)[0]!, "correct");
    await flush();
    handle.stop();

    expect(failures).toEqual([
      { reason: "context-invalidated", error: "Extension context invalidated." },
    ]);
  });
});

describe("startCapture", () => {
  it("declines a page with no question area", () => {
    document.body.innerHTML = "<p>no quiz here</p>";
    expect(
      startCapture(document, { topicSlug: "x", pageNo: 1, pageLoadId: "l" }),
    ).toBeNull();
  });
});
