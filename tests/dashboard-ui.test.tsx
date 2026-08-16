import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  App,
  Overview,
  QuestionList,
  ReviewPanel,
  SubjectGrid,
  TopicTable,
} from "../components/dashboard";
import { QuestionFilter } from "../utils/dashboard";
import { mergeSummaries } from "../utils/summary/mirror";
import { MessageKind, errorReply } from "../utils/messaging";
import type {
  DashboardPayload,
  Message,
  RebuildAllResponse,
  TopicDetail,
  TopicSummary,
} from "../types";
import { BackupRejection } from "../utils/backup";
import type { Backup, ImportOutcome } from "../utils/backup";
import type { ReviewItem, ReviewQueue } from "../utils/review";
import { CHILD, SUBJECT, question, viewOf } from "./factories";

beforeEach(() => {
  fakeBrowser.reset();
});

const DETAIL: TopicDetail = {
  slug: "stack",
  rows: [
    question(1, { status: "correct", attemptCount: 2, lastAttemptAt: Date.UTC(2026, 7, 11) }),
    question(2, { status: "wrong", attemptCount: 1 }),
    question(3),
  ],
};

describe("SubjectGrid", () => {
  it("shows one card per subject with its headline numbers", () => {
    const view = viewOf([CHILD, SUBJECT]);
    render(<SubjectGrid groups={view.groups} onOpen={() => undefined} />);

    const card = screen.getByRole("button", { name: /Data Structure/ });
    expect(within(card).getByText("40 / 298")).toBeTruthy();
    // 30 of 40 attempted were right.
    expect(within(card).getByText("75%")).toBeTruthy();
    expect(within(card).getByText("1 topic")).toBeTruthy();
  });

  it("opens the subject it was clicked on", () => {
    const onOpen = vi.fn();
    const view = viewOf([CHILD, SUBJECT]);
    render(<SubjectGrid groups={view.groups} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /Data Structure/ }));

    expect(onOpen).toHaveBeenCalledWith("data-structure");
  });

  it("says a subject has not been started rather than showing a zero", () => {
    const view = viewOf([summaryUntouched()]);
    render(<SubjectGrid groups={view.groups} onOpen={() => undefined} />);

    expect(screen.getByText("not started")).toBeTruthy();
  });
});

function summaryUntouched() {
  return { ...CHILD, slug: "queue", title: "Queue", parentSlug: null, solvedRows: 0, correctRows: 0, wrongRows: 0, lastActivityAt: null };
}

describe("Overview", () => {
  it("adds up subjects only, never a subject and its own topics", () => {
    // Stack's 12 are already inside Data Structure's 40.
    render(<Overview view={viewOf([CHILD, SUBJECT])} />);

    expect(screen.getByText("40 / 298")).toBeTruthy();
    // 75%, not the 42 of 52 that summing the subject and its topic would give.
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("prompts rather than charting nothing when no answer has been recorded", () => {
    render(<Overview view={viewOf([summaryUntouched()])} />);

    expect(screen.getByText(/Nothing attempted yet/)).toBeTruthy();
  });
});

describe("TopicTable", () => {
  function renderTable(overrides: Partial<Parameters<typeof TopicTable>[0]> = {}) {
    const props = {
      parent: SUBJECT,
      topics: [CHILD],
      titles: { "data-structure": "Data Structure", stack: "Stack" },
      expandedSlug: null,
      detail: null,
      detailLoading: false,
      filter: QuestionFilter.All,
      onToggle: vi.fn(),
      onFilter: vi.fn(),
      ...overrides,
    };
    render(<TopicTable {...props} />);
    return props;
  }

  it("lists the subject's own page first", () => {
    renderTable();

    expect(screen.getByRole("button", { name: /All of Data Structure/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stack" })).toBeTruthy();
  });

  it("flags a topic whose questions have not all been seen", () => {
    renderTable();

    expect(screen.getAllByText("partially indexed")).toHaveLength(1);
  });

  it("offers both ways back into a topic that has been worked on", () => {
    renderTable();
    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toContain(
      "https://practicepaper.in/gate-cse/data-structure?page_no=9#pptr-resume=1035",
    );
    expect(links.map((link) => link.getAttribute("href"))).toContain(
      "https://practicepaper.in/gate-cse/data-structure?page_no=55#pptr-resume=523106",
    );
  });

  it("asks to expand the topic that was clicked", () => {
    const props = renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Stack" }));

    expect(props.onToggle).toHaveBeenCalledWith("stack");
  });

  it("shows the questions of the expanded topic only", () => {
    renderTable({ expandedSlug: "stack", detail: DETAIL });

    expect(screen.getByText("Q1")).toBeTruthy();
    expect(screen.getByText("Q3")).toBeTruthy();
  });
});

describe("QuestionList", () => {
  it("links each question to itself on the site", () => {
    render(
      <QuestionList
        slug="stack"
        titles={{ stack: "Stack" }}
        detail={DETAIL}
        loading={false}
        filter={QuestionFilter.All}
        onFilter={() => undefined}
      />,
    );

    // Page one carries no `page_no`, exactly as the site addresses it.
    expect(screen.getByText("Q3").getAttribute("href")).toBe(
      "https://practicepaper.in/gate-cse/stack#pptr-resume=3",
    );
  });

  it("shows what the attempt log says, not just the latest verdict", () => {
    render(
      <QuestionList
        slug="stack"
        titles={{ stack: "Stack" }}
        detail={DETAIL}
        loading={false}
        filter={QuestionFilter.All}
        onFilter={() => undefined}
      />,
    );

    expect(screen.getByText(/2 attempts, last/)).toBeTruthy();
    expect(screen.getByText(/never attempted/)).toBeTruthy();
    expect(screen.getAllByText(/GATE CSE 2024 Set 1/)).toHaveLength(3);
  });

  it("applies the active filter and counts every option", () => {
    render(
      <QuestionList
        slug="stack"
        titles={{ stack: "Stack" }}
        detail={DETAIL}
        loading={false}
        filter={QuestionFilter.Wrong}
        onFilter={() => undefined}
      />,
    );

    expect(screen.queryByText("Q1")).toBeNull();
    expect(screen.getByText("Q2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Correct 1" })).toBeTruthy();
  });

  it("says it is loading rather than showing an empty topic", () => {
    render(
      <QuestionList
        slug="stack"
        titles={{ stack: "Stack" }}
        detail={null}
        loading
        filter={QuestionFilter.All}
        onFilter={() => undefined}
      />,
    );

    expect(screen.getByText(/Loading questions/)).toBeTruthy();
  });
});

interface WorkerOptions {
  detail?: TopicDetail;
  /** Question records the worker reports as having been repaired on load. */
  repaired?: number;
  rebuilt?: RebuildAllResponse;
  review?: ReviewQueue;
  imported?: ImportOutcome;
  backup?: Backup;
}

/** Stands in for the background worker, dispatching the same way it does. */
function fakeWorker(summaries: TopicSummary[], options: WorkerOptions = {}): Message[] {
  const asked: Message[] = [];

  fakeBrowser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message;
    asked.push(message);

    if (message.kind === MessageKind.GetDashboard) {
      const payload: DashboardPayload = {
        summaries: Object.fromEntries(summaries.map((entry) => [entry.slug, entry])),
        repaired: options.repaired ?? 0,
      };
      sendResponse(payload);
    }
    if (message.kind === MessageKind.GetTopicDetail) sendResponse(options.detail ?? DETAIL);
    if (message.kind === MessageKind.RebuildAll) sendResponse(options.rebuilt);
    if (message.kind === MessageKind.GetReviewQueue) {
      sendResponse(options.review ?? { due: [], upcoming: [], tracked: 0, unplaced: 0 });
    }
    if (message.kind === MessageKind.ImportBackup) sendResponse(options.imported);
    if (message.kind === MessageKind.ExportBackup) sendResponse(options.backup);
    return true;
  });

  return asked;
}

function reviewItem(over: Partial<ReviewItem>): ReviewItem {
  const base: ReviewItem = {
    goId: "422797",
    topicSlug: "stack",
    subjectSlug: "data-structure",
    ordinal: 7,
    examSlug: "gate-cse-2024-set-1",
    type: "NAT",
    marks: 2,
    starred: false,
    attemptCount: 2,
    lapses: 1,
    repetitions: 0,
    intervalDays: 1,
    lastReviewedAt: Date.UTC(2026, 7, 10),
    dueAt: Date.UTC(2026, 7, 11),
    overdueDays: 1,
  };
  return { ...base, ...over };
}

/**
 * The list beside the calendar.
 *
 * Scoped, because the grid carries question numbers of its own now: a cell
 * holding Q7 and a list holding Q7 are two different claims, and a bare
 * `getByText("Q7")` cannot tell them apart — it matches both and throws.
 */
function dayList() {
  return within(screen.getByRole("region", { name: /selected day/ }));
}

/** The three sections live behind a tab bar, so a test has to open one. */
async function openTab(name: string): Promise<void> {
  // Pointer-down, not click: a tab list activates on press so that dragging off
  // it still leaves the tab you pressed selected, and a bare `click` event
  // never reaches that handler.
  fireEvent.mouseDown(await screen.findByRole("tab", { name: new RegExp(name) }));
}

/**
 * A day's heading has to say which of the three states it is in. Calling a
 * future day "due" is what made a question answered correctly today, and
 * scheduled for tomorrow, read as something overdue.
 */
describe("ReviewPanel day heading", () => {
  const TODAY = new Date(2026, 7, 16, 12).getTime();
  const on = (d: number) => new Date(2026, 7, d, 9).getTime();

  function renderPanel() {
    render(
      <ReviewPanel
        now={TODAY}
        loading={false}
        titles={{ stack: "Stack" }}
        subjectOf={{ stack: "data-structure" }}
        queue={{
          due: [
            reviewItem({ ordinal: 4, dueAt: on(14), overdueDays: 2 }),
            reviewItem({ ordinal: 6, dueAt: on(16), overdueDays: 0 }),
          ],
          upcoming: [reviewItem({ ordinal: 1, dueAt: on(17), overdueDays: 0 })],
          tracked: 3,
          unplaced: 0,
        }}
      />,
    );
  }

  const pick = (d: number) =>
    fireEvent.click(screen.getByRole("button", { name: new Date(on(d)).toDateString() }));

  it("counts a past day's wait in calendar days", () => {
    // Opens on the oldest waiting day, which is the 14th.
    renderPanel();

    expect(screen.getByText(/1 question · 2 days overdue/)).toBeTruthy();
  });

  it("says today rather than a wait of zero", () => {
    renderPanel();
    pick(16);

    expect(screen.getByText(/1 question · due today/)).toBeTruthy();
  });

  it("says when a future day is coming, never that it is due", () => {
    renderPanel();
    pick(17);

    // Matched on the wording, not the date: the date is locale-formatted and
    // renders "Aug 17, 2026" here and "17 Aug 2026" in a browser.
    // Scoped to the day's own heading because the month summary beside it says
    // "1 overdue" quite correctly, about a different day.
    const heading = screen.getByRole("heading", { level: 3, name: /due in 1 day/ });
    expect(heading.textContent).not.toContain("overdue");
  });
});

/**
 * Every question in the panel was answered wrong at least once, so "wrong" is
 * not a distinction it can draw. What it draws is what has happened since.
 */
describe("ReviewPanel stages, chips and the subject tree", () => {
  const TODAY = new Date(2026, 7, 16, 12).getTime();
  const on = (d: number) => new Date(2026, 7, d, 9).getTime();

  /** Two topics under one subject, one question in each of the three stages. */
  function renderPanel() {
    render(
      <ReviewPanel
        now={TODAY}
        loading={false}
        titles={{
          stack: "Stack",
          "linked-list": "Linked List",
          "data-structure": "Data Structure",
        }}
        subjectOf={{}}
        queue={{
          due: [
            reviewItem({ ordinal: 4, dueAt: on(14), overdueDays: 2, lapses: 3, repetitions: 0 }),
            reviewItem({ ordinal: 5, dueAt: on(14), overdueDays: 2, lapses: 1, repetitions: 0, starred: true }),
          ],
          upcoming: [
            reviewItem({
              ordinal: 1,
              topicSlug: "linked-list",
              dueAt: on(17),
              overdueDays: 0,
              lapses: 2,
              repetitions: 1,
            }),
          ],
          tracked: 3,
          unplaced: 0,
        }}
      />,
    );
  }

  const cell = (d: number) =>
    screen.getByRole("button", { name: new Date(on(d)).toDateString() });

  it("separates a question missed repeatedly from one missed once", () => {
    // Both are equally overdue and equally wrong. Only the histories differ.
    renderPanel();

    expect(dayList().getByText("Struggling")).toBeTruthy();
    expect(dayList().getByText("Relearning")).toBeTruthy();
  });

  it("marks a question that has gone right since the miss", () => {
    renderPanel();
    fireEvent.click(cell(17));

    expect(dayList().getByText("On track")).toBeTruthy();
    // Scheduled, not late: the wait reads forwards. Matched exactly, since the
    // day's own heading says "due in 1 day" about the same day.
    expect(dayList().getByText("in 1 day")).toBeTruthy();
  });

  it("marks a starred question without spending its stage colour on it", () => {
    // Starred is a second axis: a question can be starred and struggling at
    // once, so it cannot be a fourth mutually exclusive state.
    renderPanel();
    const starred = dayList().getByText("Q5").closest("li")!;

    expect(within(starred).getByText("Starred")).toBeTruthy();
    expect(within(starred).getByText("Relearning")).toBeTruthy();
  });

  it("names the questions in a calendar cell rather than only counting them", () => {
    renderPanel();

    expect(cell(14).textContent).toContain("Q4");
    expect(cell(14).textContent).toContain("Q5");
    expect(cell(17).textContent).toContain("Q1");
  });

  it("narrows the table to the topic picked out of the tree", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("radio", { name: /By topic/ }));

    const list = () => within(screen.getByRole("region", { name: /selected topic/ }));
    // Opens on the subject, so every topic under it is listed at once.
    expect(list().getByText("Q4")).toBeTruthy();
    expect(list().getByText("Q1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Linked List/ }));

    expect(list().getByText("Q1")).toBeTruthy();
    expect(list().queryByText("Q4")).toBeNull();
  });

  it("shows the whole rotation by topic, not only what is late", () => {
    // The calendar plotted everything and this view listed only what was due,
    // so the same data read as two numbers depending on which button was on.
    renderPanel();
    fireEvent.click(screen.getByRole("radio", { name: /By topic/ }));

    const list = within(screen.getByRole("region", { name: /selected topic/ }));
    expect(list.getAllByRole("row")).toHaveLength(4); // a header and three questions
  });
});

describe("App", () => {
  it("asks for the index page before anything has been recorded", async () => {
    fakeWorker([]);

    render(<App />);

    expect(await screen.findByText(/Nothing recorded yet/)).toBeTruthy();
  });

  it("renders what the database says, not what the mirror cached", async () => {
    // A stale mirror must never be what the dashboard shows.
    await mergeSummaries([{ ...SUBJECT, title: "Stale name" }]);
    fakeWorker([SUBJECT, CHILD]);
    render(<App />);

    expect(await screen.findByRole("button", { name: /Data Structure/ })).toBeTruthy();
  });

  it("does not render a failed reply as if it were data", async () => {
    // A handler that throws still has to answer. Before the reply was marked,
    // the `{ error }` object arrived here as a set of summaries and the page
    // died trying to group it.
    await mergeSummaries([SUBJECT, CHILD]);
    fakeBrowser.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse(errorReply(new Error("Cannot read properties of undefined")));
      return true;
    });

    render(<App />);

    // Falls back to the mirror rather than showing nothing.
    expect(await screen.findByRole("button", { name: /Data Structure/ })).toBeTruthy();
  });

  it("offers the data tools even with nothing recorded", async () => {
    // Importing into a fresh profile is precisely when the page is empty, so
    // hiding the tools behind having data would hide them when they are needed.
    fakeWorker([]);
    render(<App />);
    await openTab("Backups");

    expect(await screen.findByRole("button", { name: /Import a backup/ })).toBeTruthy();
  });

  it("says so when opening the page had to repair drifted records", async () => {
    fakeWorker([SUBJECT, CHILD], { repaired: 3 });
    render(<App />);

    expect(await screen.findByText(/3 question records had drifted/)).toBeTruthy();
  });

  it("stays quiet when nothing needed repairing", async () => {
    fakeWorker([SUBJECT, CHILD]);
    render(<App />);

    await screen.findByRole("button", { name: /Data Structure/ });
    expect(screen.queryByText(/drifted/)).toBeNull();
  });

  it("rebuilds on request and reports what it did", async () => {
    const asked = fakeWorker([SUBJECT, CHILD], { rebuilt: { questions: 412, topics: 111 } });
    render(<App />);
    await openTab("Backups");

    fireEvent.click(await screen.findByRole("button", { name: /Rebuild the figures/ }));

    expect(await screen.findByText(/Rebuilt 412 question records/)).toBeTruthy();
    expect(asked).toContainEqual({ kind: MessageKind.RebuildAll });
  });

  it("reports a refused import without pretending anything was merged", async () => {
    fakeWorker([SUBJECT, CHILD], {
      imported: { ok: false, rejection: BackupRejection.NotABackup, detail: "no format field" },
    });
    render(<App />);
    await openTab("Backups");
    await screen.findByRole("button", { name: /Import a backup/ });

    const picker = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(picker, {
      target: { files: [new File(['{"hello":true}'], "other.json", { type: "application/json" })] },
    });

    expect(await screen.findByText(/isn't a tracker backup/)).toBeTruthy();
  });

  it("lists what is due, linking each question to itself on the site", async () => {
    fakeWorker([SUBJECT, CHILD], {
      review: {
        due: [
          {
            goId: "422797",
            topicSlug: "stack",
            subjectSlug: "data-structure",
            ordinal: 7,
            examSlug: "gate-cse-2024-set-1",
            type: "NAT",
            marks: 2,
            starred: false,
            attemptCount: 2,
            lapses: 2,
            repetitions: 0,
            intervalDays: 1,
            lastReviewedAt: Date.UTC(2026, 7, 11),
            dueAt: Date.UTC(2026, 7, 12),
            overdueDays: 4,
          },
        ],
        upcoming: [],
        tracked: 3,
        unplaced: 1,
      },
    });
    render(<App />);
    await openTab("Review");

    const link = await screen.findByRole("link", { name: "Solve" });
    expect(link.getAttribute("href")).toBe(
      "https://practicepaper.in/gate-cse/stack?page_no=2#pptr-resume=422797",
    );
    expect(dayList().getByText("Q7")).toBeTruthy();
    // A missed question with nowhere to link is counted, not quietly dropped.
    expect(screen.getByText(/1 missed question not on any page indexed/)).toBeTruthy();
  });

  it("says nothing at all until something has been missed", async () => {
    // A new profile has no rotation to describe, and an empty panel explaining
    // one is just noise on the page.
    fakeWorker([SUBJECT, CHILD]);
    render(<App />);
    await openTab("Review");

    expect(await screen.findByText(/Nothing to review yet/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: /Group the review list/ })).toBeNull();
  });

  it("says it is caught up while questions are still in the rotation", async () => {
    fakeWorker([SUBJECT, CHILD], {
      review: { due: [], upcoming: [], tracked: 4, unplaced: 0 },
    });
    render(<App />);
    await openTab("Review");

    expect(await screen.findByText(/Nothing due right now/)).toBeTruthy();
    expect(screen.getByText(/4 questions in the rotation/)).toBeTruthy();
  });

  it("shows the month, and a day's questions when it is clicked", async () => {
    // The by-day view is a calendar: days carry a count, and picking one lists
    // what falls on it. Thirty cells of question numbers would be a wall.
    const day = (d: number) => new Date(2026, 7, d, 12).getTime();
    fakeWorker([SUBJECT, CHILD], {
      review: {
        due: [
          reviewItem({ ordinal: 7, dueAt: day(11) }),
          reviewItem({ ordinal: 9, dueAt: day(14) }),
          reviewItem({ ordinal: 12, dueAt: day(14) }),
        ],
        upcoming: [],
        tracked: 3,
        unplaced: 0,
      },
    });
    render(<App />);
    await openTab("Review");

    // Opens on the oldest thing waiting, so that day's question is listed.
    await screen.findByRole("region", { name: /selected day/ });
    expect(dayList().getByText("Q7")).toBeTruthy();
    expect(dayList().queryByText("Q9")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: new Date(day(14)).toDateString() }));

    expect(dayList().getByText("Q9")).toBeTruthy();
    expect(dayList().getByText("Q12")).toBeTruthy();
    expect(dayList().queryByText("Q7")).toBeNull();
  });

  it("says a day is empty rather than showing yesterday's questions", async () => {
    const day = (d: number) => new Date(2026, 7, d, 12).getTime();
    fakeWorker([SUBJECT, CHILD], {
      review: { due: [reviewItem({ ordinal: 7, dueAt: day(11) })], upcoming: [], tracked: 1, unplaced: 0 },
    });
    render(<App />);
    await openTab("Review");
    await screen.findByRole("region", { name: /selected day/ });
    expect(dayList().getByText("Q7")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: new Date(day(12)).toDateString() }));

    expect(screen.getByText(/Nothing scheduled for this day/)).toBeTruthy();
    expect(dayList().queryByText("Q7")).toBeNull();
  });

  it("opens a subject, and asks the background for the topic's questions", async () => {
    const asked = fakeWorker([SUBJECT, CHILD]);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Data Structure/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Stack" }));

    await waitFor(() => expect(screen.getByText("Q1")).toBeTruthy());
    expect(asked).toContainEqual({ kind: MessageKind.GetTopicDetail, slug: "stack" });
  });
});
