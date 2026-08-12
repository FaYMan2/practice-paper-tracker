import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { App, Overview, QuestionList, SubjectGrid, TopicTable } from "../components/dashboard";
import { QuestionFilter } from "../utils/dashboard";
import { mergeSummaries } from "../utils/summary/mirror";
import { MessageKind } from "../utils/messaging";
import type { Message, TopicDetail, TopicSummary } from "../types";
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

/** Stands in for the background worker, dispatching the same way it does. */
function fakeWorker(summaries: TopicSummary[], detail: TopicDetail): Message[] {
  const asked: Message[] = [];

  fakeBrowser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
    const message = raw as Message;
    asked.push(message);

    if (message.kind === MessageKind.GetDashboard) {
      sendResponse(Object.fromEntries(summaries.map((entry) => [entry.slug, entry])));
    }
    if (message.kind === MessageKind.GetTopicDetail) sendResponse(detail);
    return true;
  });

  return asked;
}

describe("App", () => {
  it("asks for the index page before anything has been recorded", async () => {
    fakeWorker([], DETAIL);

    render(<App />);

    expect(await screen.findByText(/Nothing recorded yet/)).toBeTruthy();
  });

  it("renders what the database says, not what the mirror cached", async () => {
    // A stale mirror must never be what the dashboard shows.
    await mergeSummaries([{ ...SUBJECT, title: "Stale name" }]);
    fakeWorker([SUBJECT, CHILD], DETAIL);
    render(<App />);

    expect(await screen.findByRole("button", { name: /Data Structure/ })).toBeTruthy();
  });

  it("opens a subject, and asks the background for the topic's questions", async () => {
    const asked = fakeWorker([SUBJECT, CHILD], DETAIL);
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Data Structure/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Stack" }));

    await waitFor(() => expect(screen.getByText("Q1")).toBeTruthy());
    expect(asked).toContainEqual({ kind: MessageKind.GetTopicDetail, slug: "stack" });
  });
});
