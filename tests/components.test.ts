import { beforeEach, describe, expect, it } from "vitest";
import { startCapture } from "../utils/capture";
import {
  STRIP_ID,
  UI_CLASS,
  paintProgressStrip,
  paintQuestionMarkers,
} from "../components";
import { formatDate, pluralize, slugToTitle, topicDisplayName } from "../utils/format";
import { CLS, SEL, describeQuestions } from "../utils/selectors";
import type { AttemptInput, Message, QuestionMark, TopicSummary } from "../types";
import { MessageKind } from "../utils/messaging";
import { FIXTURES, loadHtml } from "./fixtures";

function mountPage(): { questions: ReturnType<typeof describeQuestions> } {
  document.body.innerHTML = loadHtml(FIXTURES.discreteMathP1).body.innerHTML;
  return { questions: describeQuestions(document, "discrete-mathematics") };
}

function mark(overrides: Partial<QuestionMark> & Pick<QuestionMark, "goId">): QuestionMark {
  const base: QuestionMark = {
    goId: overrides.goId,
    status: "correct",
    attemptCount: 1,
    lastAttemptAt: Date.UTC(2026, 7, 11),
    answeredIn: ["discrete-mathematics"],
  };
  return { ...base, ...overrides };
}

function summary(overrides: Partial<TopicSummary> = {}): TopicSummary {
  const base: TopicSummary = {
    slug: "discrete-mathematics",
    title: "Discrete Mathematics",
    solvedRows: 12,
    correctRows: 9,
    wrongRows: 3,
    distinctSolved: 12,
    totalFromSite: 465,
    indexedRows: 465,
    fullyIndexed: true,
    marksEarned: 14,
    totalMarksFromSite: 600,
    lastAnsweredOrdinal: 12,
    lastAnsweredGoId: "x0",
    lastVisitedPage: 3,
    firstUnattemptedOrdinal: 13,
    firstUnattemptedGoId: "x",
    lastActivityAt: null,
  };
  return { ...base, ...overrides };
}

const badges = () => [...document.querySelectorAll(`.${UI_CLASS.badge}`)];
const stripText = () => document.getElementById(STRIP_ID)?.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("question markers", () => {
  it("marks a question answered correctly in this topic", () => {
    const { questions } = mountPage();
    const painted = paintQuestionMarkers(document, {
      questions,
      marks: { "523093": mark({ goId: "523093" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });

    expect(painted).toBe(1);
    expect(badges()).toHaveLength(1);
    expect(badges()[0]!.textContent).toContain("Correct");
    expect(badges()[0]!.classList.contains(CLS.solved)).toBe(true);
  });

  it("marks a wrong answer distinctly", () => {
    const { questions } = mountPage();
    paintQuestionMarkers(document, {
      questions,
      marks: { "523093": mark({ goId: "523093", status: "wrong" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });

    expect(badges()[0]!.classList.contains(CLS.wrong)).toBe(true);
    expect(badges()[0]!.textContent).toContain("Wrong");
  });

  it("stars a question solved under a different topic", () => {
    // 523093 appears under both probability-theory and discrete-mathematics.
    // Solving it in one has to show up in the other — the whole point of
    // keying questions by GateOverflow id.
    const { questions } = mountPage();
    paintQuestionMarkers(document, {
      questions,
      marks: { "523093": mark({ goId: "523093", answeredIn: ["probability-theory"] }) },
      topicSlug: "discrete-mathematics",
      topicTitles: { "probability-theory": "Probability Theory" },
    });

    const badge = badges()[0]!;
    expect(badge.classList.contains(CLS.elsewhere)).toBe(true);
    expect(badge.textContent).toContain("Solved elsewhere");
    expect(badge.getAttribute("title")).toContain("Probability Theory");
  });

  it("prefers the local status when answered here and elsewhere", () => {
    const { questions } = mountPage();
    paintQuestionMarkers(document, {
      questions,
      marks: {
        "523093": mark({
          goId: "523093",
          answeredIn: ["discrete-mathematics", "probability-theory"],
          attemptCount: 2,
        }),
      },
      topicSlug: "discrete-mathematics",
      topicTitles: { "probability-theory": "Probability Theory" },
    });

    const badge = badges()[0]!;
    expect(badge.classList.contains(CLS.solved)).toBe(true);
    expect(badge.getAttribute("title")).toContain("2 attempts");
    expect(badge.getAttribute("title")).toContain("also seen in Probability Theory");
  });

  it("leaves unanswered questions unmarked", () => {
    const { questions } = mountPage();
    const painted = paintQuestionMarkers(document, {
      questions,
      marks: {},
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });

    expect(painted).toBe(0);
    expect(badges()).toEqual([]);
  });

  it("replaces rather than stacks badges when repainted", () => {
    const { questions } = mountPage();
    const input = {
      questions,
      marks: { "523093": mark({ goId: "523093" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    };

    paintQuestionMarkers(document, input);
    paintQuestionMarkers(document, input);
    expect(badges()).toHaveLength(1);
  });

  it("removes a badge when the question is no longer marked", () => {
    const { questions } = mountPage();
    const base = { questions, topicSlug: "discrete-mathematics", topicTitles: {} };

    paintQuestionMarkers(document, { ...base, marks: { "523093": mark({ goId: "523093" }) } });
    paintQuestionMarkers(document, { ...base, marks: {} });
    expect(badges()).toEqual([]);
  });
});

describe("painting does not look like answering", () => {
  it("records no attempt when markers are painted over a live capture", async () => {
    // Painting must never write the site's stamp classes: our own observer
    // watches those, and would log an attempt the user never made.
    document.body.innerHTML = loadHtml(FIXTURES.discreteMathP1).body.innerHTML;
    const attempts: AttemptInput[] = [];

    const handle = startCapture(document, {
      topicSlug: "discrete-mathematics",
      pageNo: 1,
      pageLoadId: "load-1",
      send: (async (message: Message) => {
        if (message.kind === MessageKind.RecordAttempt) attempts.push(message.attempt);
        return { ok: true, data: { stored: true, duplicate: false } };
      }) as never,
    })!;

    paintQuestionMarkers(document, {
      questions: describeQuestions(document, "discrete-mathematics"),
      marks: { "523093": mark({ goId: "523093" }), "523142": mark({ goId: "523142" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    handle.stop();

    expect(attempts).toEqual([]);
    expect(badges()).toHaveLength(2);
  });

  it("never writes the site's own stamp classes", () => {
    const { questions } = mountPage();
    paintQuestionMarkers(document, {
      questions,
      marks: { "523093": mark({ goId: "523093" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });

    expect(document.querySelectorAll(`.${CLS.correctStamp}`)).toHaveLength(0);
    expect(document.querySelectorAll(`.${CLS.wrongStamp}`)).toHaveLength(0);
    for (const el of document.querySelectorAll(SEL.stamp)) {
      expect(el.className).toBe("mtq_stamp");
    }
  });
});

describe("progress strip", () => {
  it("shows attempted, correct, wrong and marks", () => {
    mountPage();
    paintProgressStrip(document, summary());

    expect(stripText()).toContain("12 / 465 attempted");
    expect(stripText()).toContain("9 correct");
    expect(stripText()).toContain("3 wrong");
    expect(stripText()).toContain("14 / 600 marks");
  });

  it("sits above the question list", () => {
    mountPage();
    paintProgressStrip(document, summary());

    const strip = document.getElementById(STRIP_ID)!;
    expect(strip.nextElementSibling).toBe(document.querySelector(SEL.quizArea));
  });

  it("says counts are a floor while the topic is partly indexed", () => {
    mountPage();
    paintProgressStrip(document, summary({ fullyIndexed: false, indexedRows: 20 }));

    expect(stripText()).toContain("at least 12 / 465");
    expect(stripText()).toContain("partial index");
  });

  it("says so when nothing has been recorded", () => {
    mountPage();
    paintProgressStrip(document, summary({ solvedRows: 0 }));
    expect(stripText()).toContain("nothing recorded");
  });

  it("handles a topic with no stored summary at all", () => {
    mountPage();
    paintProgressStrip(document, null);
    expect(stripText()).toContain("nothing recorded");
  });

  it("replaces rather than stacks when repainted", () => {
    mountPage();
    paintProgressStrip(document, summary());
    paintProgressStrip(document, summary({ correctRows: 10 }));

    expect(document.querySelectorAll(`.${UI_CLASS.strip}`)).toHaveLength(1);
    expect(stripText()).toContain("10 correct");
  });
});

describe("formatting helpers", () => {
  it("prefers the stored topic title", () => {
    expect(topicDisplayName("probability-theory", { "probability-theory": "Probability" })).toBe(
      "Probability",
    );
  });

  it("falls back to a readable form of the slug", () => {
    expect(topicDisplayName("discrete-mathematics", {})).toBe("Discrete Mathematics");
    expect(slugToTitle("b-plus-tree")).toBe("B Plus Tree");
  });

  it("passes a missing date through", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(Date.UTC(2026, 7, 11))).toContain("2026");
  });

  it("pluralizes counts", () => {
    expect(pluralize(1, "attempt")).toBe("1 attempt");
    expect(pluralize(2, "attempt")).toBe("2 attempts");
  });
});

describe("namespacing", () => {
  it("gives every injected element the pptr class the stylesheet keys off", () => {
    // The CSS selectors are all `.pptr.pptr-x`, doubled up so the site's own
    // theme rules cannot outweigh them. Drop the namespace class and every
    // component silently loses its styling.
    const { questions } = mountPage();
    paintQuestionMarkers(document, {
      questions,
      marks: { "523093": mark({ goId: "523093" }) },
      topicSlug: "discrete-mathematics",
      topicTitles: {},
    });
    paintProgressStrip(document, summary());

    const injected = [...document.querySelectorAll(`.${UI_CLASS.badge}, .${UI_CLASS.strip}`)];
    expect(injected).toHaveLength(2);
    expect(injected.every((node) => node.classList.contains(CLS.ours))).toBe(true);
  });
});
