/**
 * Capturing answers as the user gives them.
 *
 * Two channels with a strict division of responsibility:
 *
 *   - The **MutationObserver** on `.mtq_stamp` is the sole authority on the
 *     verdict. The site already implements the MSQ countdown and the NAT range
 *     comparison; re-deriving either here would be a second copy of those rules
 *     that drifts from the first.
 *   - The **capture-phase click listener** only enriches, recording which
 *     option was clicked or which value was typed. It never decides an outcome.
 *
 * The write is append-only. Within one page load the first stamp per question
 * wins, matching the site's own `data-answered` guard and absorbing the several
 * MutationRecords a single logical stamp emits. Across page loads every stamp
 * appends a new attempt, which is what makes re-attempting a question next week
 * possible without destroying the record of getting it wrong today.
 */

import {
  ATTR,
  isOwnMutation,
  SEL,
  describeQuestions,
  stampVerdict,
} from "../selectors";
import { MessageKind, sendToBackground } from "../messaging";
import { isProvisionalKey } from "../url";
import type { AttemptInput, Choice, Verdict } from "../../types";
import {
  ANSWERED,
  CLICK_LISTENER_OPTIONS,
  CORRECT_OPTION,
  NAT_CHECKED,
  STAMP_OBSERVER_OPTIONS,
} from "./constants";
import type {
  CaptureHandle,
  CaptureOptions,
  QuestionState,
  RecordAttemptResult,
  SendFn,
} from "./types";

export * from "./constants";
export type * from "./types";

function buildStates(doc: Document, topicSlug: string): Map<Element, QuestionState> {
  const entries = describeQuestions(doc, topicSlug).map<[Element, QuestionState]>(
    (descriptor) => [descriptor.element, { descriptor, choices: [], resolved: false }],
  );
  return new Map(entries);
}

/**
 * Starts capturing on a question page. Returns null when the page carries no
 * question area, so the caller does not have to pre-classify.
 */
export function startCapture(doc: Document, options: CaptureOptions): CaptureHandle | null {
  const area = doc.querySelector(SEL.quizArea);
  if (!area) return null;

  const send: SendFn = options.send ?? sendToBackground;
  const states = buildStates(doc, options.topicSlug);
  if (states.size === 0) return null;

  const stateFor = (node: Element | null): QuestionState | null => {
    const question = node?.closest(SEL.question);
    return question ? (states.get(question) ?? null) : null;
  };

  function recordOptionChoice(row: Element): void {
    const state = stateFor(row);
    if (!state || state.resolved) return;

    // The site sets this on its own bubble handler, i.e. after us, so on the
    // resolving click it still reads false. Once true, further clicks are
    // replays the site itself ignores.
    const table = row.closest(SEL.answerTable);
    if (table?.getAttribute(ATTR.answered) === ANSWERED) return;

    const choice: Choice = {
      kind: "option",
      label: row.querySelector(SEL.optionLabel)?.textContent?.trim() || undefined,
      correct: row.getAttribute(ATTR.value) === CORRECT_OPTION,
      ts: Date.now(),
    };
    state.choices.push(choice);
  }

  function recordNumericChoice(button: Element): void {
    const state = stateFor(button);
    if (!state || state.resolved) return;
    if (button.getAttribute(ATTR.natGuard) === NAT_CHECKED) return;

    const input = button
      .closest(SEL.numericAnswer)
      ?.querySelector<HTMLInputElement>(SEL.numericInput);

    const choice: Choice = {
      kind: "numeric",
      value: input?.value ?? "",
      ts: Date.now(),
    };
    state.choices.push(choice);
  }

  function onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const row = target.closest(SEL.clickableRow);
    if (row) return recordOptionChoice(row);

    const button = target.closest(SEL.checkButton);
    if (button) return recordNumericChoice(button);
  }

  async function submit(state: QuestionState, verdict: Verdict): Promise<void> {
    const { descriptor } = state;
    const attempt: AttemptInput = {
      eventId: `${descriptor.goId}:${options.pageLoadId}`,
      goId: descriptor.goId,
      verdict,
      choices: state.choices,
      ts: Date.now(),
      topicSlug: options.topicSlug,
      ordinal: descriptor.ordinal,
      pageNo: options.pageNo,
      examSlug: descriptor.examSlug,
      type: descriptor.type,
      marks: descriptor.marks,
      pageLoadId: options.pageLoadId,
      provisional: isProvisionalKey(descriptor.goId),
    };

    const result: RecordAttemptResult = await send({
      kind: MessageKind.RecordAttempt,
      attempt,
    });

    if (result.ok) return;
    // The user cannot re-solve this question to regenerate the record, so a
    // failed write has to be surfaced rather than swallowed.
    options.onSendFailure?.({ reason: result.reason, error: result.error });
  }

  /** The verdict a single class change represents, or null when it is noise. */
  function verdictFromRecord(record: MutationRecord): Verdict | null {
    const target = record.target;
    if (!(target instanceof Element) || !target.matches(SEL.stamp)) return null;

    const className = target.getAttribute("class") ?? "";
    // Our own repaints must not read as fresh verdicts.
    if (isOwnMutation(className, record.oldValue)) return null;

    return stampVerdict(className, record.oldValue);
  }

  function handleMutation(record: MutationRecord): void {
    const verdict = verdictFromRecord(record);
    if (!verdict) return;

    const state = stateFor(record.target as Element);
    // Marking resolved here, before the next record is handled, is what makes
    // the several MutationRecords of one logical stamp collapse into one attempt.
    if (!state || state.resolved) return;

    state.resolved = true;
    void submit(state, verdict);
  }

  function onMutations(records: MutationRecord[]): void {
    records.forEach(handleMutation);
  }

  const observer = new MutationObserver(onMutations);
  observer.observe(area, STAMP_OBSERVER_OPTIONS);
  doc.addEventListener("click", onClick, CLICK_LISTENER_OPTIONS);

  const handle: CaptureHandle = {
    states,
    stop() {
      observer.disconnect();
      doc.removeEventListener("click", onClick, CLICK_LISTENER_OPTIONS);
    },
  };
  return handle;
}
