import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { TrackerDB, setDb } from "../utils/db";
import { reviewQueue } from "../services/messages/review";
import {
  DAY_MS,
  MIN_EASINESS,
  ReviewOrder,
  ReviewStage,
  dayStartOf,
  defaultSelectedDay,
  groupByDay,
  groupBySubject,
  itemsOnDay,
  monthGrid,
  overdueDays,
  scheduleAll,
  scheduleFor,
  stageOf,
} from "../utils/review";
import type { ReviewItem } from "../utils/review";
import type { AttemptRecord, RowRecord, Verdict } from "../types";

const DAY_ZERO = Date.UTC(2026, 0, 1);

function attemptsFrom(verdicts: Verdict[], goId = "523106"): AttemptRecord[] {
  return verdicts.map((verdict, index) => {
    const attempt: AttemptRecord = {
      eventId: `${goId}:load-${index}`,
      goId,
      verdict,
      choices: [],
      // A day apart, so ordering is unambiguous and the last one is the newest.
      ts: DAY_ZERO + index * DAY_MS,
      topicSlug: "pipeline-processor",
      ordinal: 3,
      pageNo: 1,
      examSlug: "gate-cse-2024-set-1",
      type: "MCQ",
      marks: 2,
      pageLoadId: `load-${index}`,
    };
    return attempt;
  });
}

function scheduleOf(verdicts: Verdict[]) {
  return scheduleFor("523106", attemptsFrom(verdicts));
}

describe("what enters the rotation", () => {
  it("leaves out a question that has only ever been right", () => {
    // The whole point of the queue is what you are missing. Scheduling what you
    // already know buries it.
    expect(scheduleOf(["correct"])).toBeNull();
    expect(scheduleOf(["correct", "correct"])).toBeNull();
  });

  it("leaves out a question never attempted", () => {
    expect(scheduleFor("523106", [])).toBeNull();
  });

  it("takes one in the moment it is first missed", () => {
    expect(scheduleOf(["wrong"])).toMatchObject({ lapses: 1, intervalDays: 1 });
  });

  it("keeps one that was missed once and has been right ever since", () => {
    // Getting it right does not undo having got it wrong; it earns a longer gap.
    expect(scheduleOf(["wrong", "correct"])).toMatchObject({ lapses: 1 });
  });
});

describe("intervals", () => {
  it("walks 1, 6 and then easiness-multiplied", () => {
    // Hand-computed from SM-2 with the two qualities this data can produce.
    // A miss takes easiness 2.5 -> 2.18; each correct answer adds 0.1, and the
    // interval multiplies by the easiness that answer has just earned — the
    // order SM-2 specifies, adjust and then multiply.
    expect(scheduleOf(["wrong"])?.intervalDays).toBe(1);
    expect(scheduleOf(["wrong", "correct"])?.intervalDays).toBe(1);
    expect(scheduleOf(["wrong", "correct", "correct"])?.intervalDays).toBe(6);
    // round(6 * 2.48), not round(6 * 2.38): multiplying by the easiness as it
    // stood *before* the answer loses a step at every rung, and compounds.
    expect(scheduleOf(["wrong", "correct", "correct", "correct"])?.intervalDays).toBe(15);
  });

  it("sends a question all the way back when it is missed again", () => {
    const recovered = scheduleOf(["wrong", "correct", "correct", "correct"]);
    const relapsed = scheduleOf(["wrong", "correct", "correct", "correct", "wrong"]);

    expect(recovered?.intervalDays).toBe(15);
    expect(relapsed?.intervalDays).toBe(1);
    expect(relapsed?.repetitions).toBe(0);
    // Easiness keeps the penalty, so the climb back is slower each time.
    expect(relapsed!.easiness).toBeLessThan(recovered!.easiness);
  });

  it("never lets easiness fall through the floor", () => {
    // Without this a question missed a few times running collapses to a
    // near-zero interval and reappears forever.
    const struggling = scheduleOf(Array.from({ length: 12 }, () => "wrong" as const));

    expect(struggling?.easiness).toBe(MIN_EASINESS);
    expect(struggling?.intervalDays).toBe(1);
    expect(struggling?.lapses).toBe(12);
  });

  it("counts the wait in calendar days, not elapsed hours", () => {
    // The real case: answered wrong on the 13th at 09:00, so due the 14th at
    // 09:00. By 08:00 on the 16th only 47 hours have passed — but the question
    // has been sitting there since the 14th, and the calendar has it two
    // columns back. Reporting "1 day" beside that reads as a bug.
    const answered = new Date(2026, 7, 13, 9).getTime();
    const schedule = scheduleFor("460847", [
      { ...attemptsFrom(["wrong"], "460847")[0]!, ts: answered },
    ]);

    expect(schedule?.intervalDays).toBe(1);
    expect(overdueDays(schedule!, new Date(2026, 7, 16, 8).getTime())).toBe(2);
    // Still nothing on the morning it comes due.
    expect(overdueDays(schedule!, new Date(2026, 7, 14, 8).getTime())).toBe(0);
  });

  it("is due one interval after the last answer", () => {
    const schedule = scheduleOf(["wrong", "correct", "correct"]);

    expect(schedule?.dueAt).toBe(schedule!.lastReviewedAt + 6 * DAY_MS);
  });
});

describe("graduation", () => {
  it("stops offering a question answered right often enough", () => {
    // 1, 6, 15, 39, 105 — past three months it is something you have learned.
    const learned = scheduleOf([
      "wrong",
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);

    expect(learned?.intervalDays).toBe(105);
    expect(learned?.graduated).toBe(true);
  });

  it("keeps offering one still short of it", () => {
    // 39 days is a gap, not a graduation: the threshold is the interval passing
    // three months, not the number of right answers behind it.
    expect(scheduleOf(["wrong", "correct", "correct", "correct", "correct"])).toMatchObject({
      intervalDays: 39,
      graduated: false,
    });
  });
});

describe("scheduleAll", () => {
  it("folds each question's own attempts, in order, whatever order they arrive", () => {
    // The table is one flat log; nothing guarantees it comes out sorted, and
    // the fold *is* the algorithm.
    const shuffled = [
      ...attemptsFrom(["wrong", "correct", "correct"], "A").reverse(),
      ...attemptsFrom(["correct"], "B"),
      ...attemptsFrom(["wrong"], "C"),
    ];

    const schedules = scheduleAll(shuffled);

    expect(schedules.map((schedule) => schedule.goId).sort()).toEqual(["A", "C"]);
    expect(schedules.find((schedule) => schedule.goId === "A")?.intervalDays).toBe(6);
  });
});

let db: TrackerDB;
let dbCount = 0;

function row(goId: string, overrides: Partial<RowRecord> = {}): RowRecord {
  const record: RowRecord = {
    topicSlug: "pipeline-processor",
    ordinal: 3,
    goId,
    examSlug: "gate-cse-2024-set-1",
    type: "MCQ",
    marks: 2,
    relatedSlugs: [],
    lastSeenAt: DAY_ZERO,
  };
  return { ...record, ...overrides };
}

beforeEach(async () => {
  fakeBrowser.reset();
  db = new TrackerDB(`test-review-${dbCount++}`);
  await db.open();
  setDb(db);
});

afterEach(() => {
  setDb(null);
});

describe("the queue", () => {
  let ordinal = 0;

  /** Missed once, so due a day later. Each gets its own place in the topic. */
  async function missOne(goId: string, at: number): Promise<void> {
    ordinal += 1;
    await db.attempts.add({
      ...attemptsFrom(["wrong"], goId)[0]!,
      ts: at,
      eventId: `${goId}:miss`,
    });
    await db.rows.put(row(goId, { ordinal }));
  }

  beforeEach(() => {
    ordinal = 0;
  });

  it("offers nothing when nothing has been missed", async () => {
    await db.attempts.bulkAdd(attemptsFrom(["correct"], "523106"));

    expect(await reviewQueue(db, DAY_ZERO + 30 * DAY_MS)).toMatchObject({
      due: [],
      tracked: 0,
    });
  });

  it("offers a missed question once its interval has passed, and not before", async () => {
    await missOne("523106", DAY_ZERO);

    const sameDay = await reviewQueue(db, DAY_ZERO + DAY_MS / 2);
    const nextDay = await reviewQueue(db, DAY_ZERO + DAY_MS);

    expect(sameDay.due).toHaveLength(0);
    expect(sameDay.upcoming.map((item) => item.goId)).toEqual(["523106"]);
    expect(nextDay.due.map((item) => item.goId)).toEqual(["523106"]);
  });

  it("puts the longest wait first", async () => {
    await missOne("oldest", DAY_ZERO);
    await missOne("newest", DAY_ZERO + 5 * DAY_MS);
    await missOne("middle", DAY_ZERO + 2 * DAY_MS);

    const queue = await reviewQueue(db, DAY_ZERO + 10 * DAY_MS);

    expect(queue.due.map((item) => item.goId)).toEqual(["oldest", "middle", "newest"]);
    expect(queue.due[0]?.overdueDays).toBe(9);
  });

  it("drops a question from the queue once it has been answered again", async () => {
    // No rebuild, no bookkeeping: the next attempt lands in the log and the
    // schedule is recomputed from it.
    await missOne("523106", DAY_ZERO);
    const now = DAY_ZERO + 3 * DAY_MS;
    expect((await reviewQueue(db, now)).due).toHaveLength(1);

    await db.attempts.add({
      ...attemptsFrom(["correct"], "523106")[0]!,
      ts: now,
      eventId: "523106:again",
    });

    const after = await reviewQueue(db, now);
    expect(after.due).toHaveLength(0);
    // Still tracked — due again tomorrow, one interval on.
    expect(after.tracked).toBe(1);
    expect(after.upcoming[0]?.dueAt).toBe(now + DAY_MS);
  });

  it("links a question through the topic it was last answered under", async () => {
    // One question can sit in several topics. The listing it was met in is the
    // one whose question numbers will look familiar.
    await db.attempts.bulkAdd(attemptsFrom(["wrong"], "49487"));
    await db.rows.bulkPut([
      row("49487", { topicSlug: "computer-organization", ordinal: 118 }),
      row("49487", { topicSlug: "pipeline-processor", ordinal: 3 }),
    ]);

    const queue = await reviewQueue(db, DAY_ZERO + 2 * DAY_MS);

    expect(queue.due[0]).toMatchObject({ topicSlug: "pipeline-processor", ordinal: 3 });
  });

  it("counts a missed question it cannot link to rather than dropping it silently", async () => {
    // Answered on a page whose rows were never recorded: there is nowhere to
    // send anyone, but the number still has to add up.
    await db.attempts.bulkAdd(attemptsFrom(["wrong"], "523106"));

    const queue = await reviewQueue(db, DAY_ZERO + 5 * DAY_MS);

    expect(queue.due).toHaveLength(0);
    expect(queue.unplaced).toBe(1);
    expect(queue.tracked).toBe(1);
  });

  it("leaves out a question that has graduated", async () => {
    await db.rows.put(row("523106"));
    await db.attempts.bulkAdd(
      attemptsFrom(["wrong", "correct", "correct", "correct", "correct", "correct"]),
    );

    expect(await reviewQueue(db, DAY_ZERO + 900 * DAY_MS)).toMatchObject({
      due: [],
      tracked: 0,
    });
  });
});

function due(over: Partial<ReviewItem> = {}): ReviewItem {
  const item: ReviewItem = {
    goId: "523106",
    topicSlug: "pipeline-processor",
    subjectSlug: "computer-organization",
    ordinal: 3,
    examSlug: "gate-cse-2024-set-1",
    type: "NAT",
    marks: 2,
    starred: false,
    attemptCount: 2,
    lapses: 1,
    repetitions: 0,
    intervalDays: 1,
    lastReviewedAt: DAY_ZERO,
    dueAt: DAY_ZERO,
    overdueDays: 0,
  };
  return { ...item, ...over };
}

/** Two days apart at midday, so no timezone can move either into the other's day. */
function onDay(offset: number, over: Partial<ReviewItem> = {}): ReviewItem {
  const at = DAY_ZERO + offset * DAY_MS + 12 * 60 * 60 * 1000;
  return due({ dueAt: at, overdueDays: 10 - offset, ...over });
}

describe("grouping by day", () => {
  it("gathers a day's questions under one heading", () => {
    const groups = groupByDay(
      [onDay(0, { ordinal: 1 }), onDay(2, { ordinal: 2 }), onDay(0, { ordinal: 3 })],
      ReviewOrder.Oldest,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.items.map((item) => item.ordinal)).toEqual([1, 3]);
    expect(groups[0]?.overdueDays).toBe(10);
  });

  it("puts the longest wait first, or last when asked", () => {
    const items = [onDay(4, { ordinal: 1 }), onDay(0, { ordinal: 2 })];

    expect(groupByDay(items, ReviewOrder.Oldest).map((g) => g.items[0]?.ordinal)).toEqual([2, 1]);
    expect(groupByDay(items, ReviewOrder.Newest).map((g) => g.items[0]?.ordinal)).toEqual([1, 2]);
  });
});

describe("grouping by topic", () => {
  it("nests subject, then topic, then the questions", () => {
    const groups = groupBySubject(
      [
        onDay(0, { ordinal: 1, topicSlug: "pipeline-processor", subjectSlug: "computer-organization" }),
        onDay(1, { ordinal: 2, topicSlug: "probability-theory", subjectSlug: "discrete-mathematics" }),
        onDay(2, { ordinal: 3, topicSlug: "cache-memory", subjectSlug: "computer-organization" }),
      ],
      ReviewOrder.Oldest,
    );

    // Computer Organization first: it holds the longest-waiting question.
    expect(groups.map((group) => group.subjectSlug)).toEqual([
      "computer-organization",
      "discrete-mathematics",
    ]);
    expect(groups[0]?.total).toBe(2);
    expect(groups[0]?.topics.map((topic) => topic.topicSlug)).toEqual([
      "pipeline-processor",
      "cache-memory",
    ]);
    expect(groups[0]?.topics[0]?.items.map((item) => item.ordinal)).toEqual([1]);
  });

  it("survives an item from a background that predates the field", () => {
    // Exactly what a stale service worker sends after an extension reload: the
    // key is absent, not null, so grouping on it produced a heading that every
    // null check downstream missed and the page died naming it.
    const stale = due();
    delete (stale as Partial<ReviewItem>).subjectSlug;

    const groups = groupBySubject([stale], ReviewOrder.Oldest);

    expect(groups[0]?.subjectSlug).toBeNull();
    expect(groups[0]?.topics[0]?.items).toHaveLength(1);
  });

  it("keeps a topic with no subject rather than dropping its questions", () => {
    // The ISRO group heading is a bare `<strong>`, so its topics genuinely have
    // no parent to sit under.
    const groups = groupBySubject([onDay(0, { subjectSlug: null })], ReviewOrder.Oldest);

    expect(groups[0]?.subjectSlug).toBeNull();
    expect(groups[0]?.total).toBe(1);
  });
});

describe("what stage a question is in", () => {
  it("separates one slip from a question that keeps going wrong", () => {
    expect(stageOf({ lapses: 1, repetitions: 0 })).toBe(ReviewStage.Relearning);
    expect(stageOf({ lapses: 2, repetitions: 0 })).toBe(ReviewStage.Struggling);
  });

  it("reads the run since the last miss, not the total damage", () => {
    // Missed three times over the year but right twice since: that is a
    // question on its way out, and colouring it red would say the opposite.
    expect(stageOf({ lapses: 3, repetitions: 2 })).toBe(ReviewStage.OnTrack);
  });

  it("survives an item from a worker that predates the field", () => {
    // Every extension reload passes through a state where the page is new and
    // the background worker is not. A missing field must not throw.
    expect(stageOf({})).toBe(ReviewStage.Relearning);
  });
});

describe("the month grid", () => {
  /** Midday local, so no timezone can shift a day into its neighbour. */
  function localNoon(year: number, month: number, day: number): number {
    return new Date(year, month, day, 12).getTime();
  }

  const AUGUST = new Date(2026, 7, 1).getTime();

  it("always draws six weeks, so paging does not change its height", () => {
    const short = monthGrid(new Date(2026, 1, 1).getTime(), AUGUST, []);
    const long = monthGrid(new Date(2026, 7, 1).getTime(), AUGUST, []);

    expect(short.weeks).toHaveLength(6);
    expect(long.weeks).toHaveLength(6);
    expect(short.weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("starts every row on a Monday", () => {
    const grid = monthGrid(AUGUST, AUGUST, []);

    expect(grid.weeks.map((week) => new Date(week[0]!.ts).getDay())).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("pads with the neighbouring months rather than leaving holes", () => {
    // 1 August 2026 is a Saturday, so the row it lands in opens in July.
    const grid = monthGrid(AUGUST, AUGUST, []);
    const first = grid.weeks[0]!;

    expect(first.filter((day) => !day.inMonth).length).toBeGreaterThan(0);
    expect(first.some((day) => day.inMonth && day.dayOfMonth === 1)).toBe(true);
  });

  it("counts each day's questions, and totals only the month's own", () => {
    const items = [
      due({ dueAt: localNoon(2026, 7, 14) }),
      due({ dueAt: localNoon(2026, 7, 14) }),
      due({ dueAt: localNoon(2026, 7, 20) }),
      // In the trailing row, but September's — it must not be totalled here.
      due({ dueAt: localNoon(2026, 8, 2) }),
    ];
    const grid = monthGrid(AUGUST, localNoon(2026, 7, 16), items);
    const days = grid.weeks.flat();

    expect(days.find((day) => day.inMonth && day.dayOfMonth === 14)?.due).toBe(2);
    expect(grid.overdue + grid.dueToday + grid.upcoming).toBe(3);
  });

  it("separates what is late from what is merely scheduled", () => {
    // The grid plots the whole rotation, so calling all of it "due" is what made
    // a calendar showing five look like it disagreed with a list showing three.
    const items = [
      due({ dueAt: localNoon(2026, 7, 14) }),
      due({ dueAt: localNoon(2026, 7, 15) }),
      due({ dueAt: localNoon(2026, 7, 16) }),
      due({ dueAt: localNoon(2026, 7, 17) }),
      due({ dueAt: localNoon(2026, 7, 17) }),
    ];
    const grid = monthGrid(AUGUST, localNoon(2026, 7, 16), items);

    expect(grid.overdue).toBe(2);
    expect(grid.dueToday).toBe(1);
    expect(grid.upcoming).toBe(2);
  });

  it("marks a day overdue only once it has passed", () => {
    const items = [due({ dueAt: localNoon(2026, 7, 10) }), due({ dueAt: localNoon(2026, 7, 20) })];
    const grid = monthGrid(AUGUST, localNoon(2026, 7, 16), items);
    const days = grid.weeks.flat();
    const on = (n: number) => days.find((day) => day.inMonth && day.dayOfMonth === n);

    expect(on(10)?.overdue).toBe(true);
    // Due, but not yet: a future day is a plan, not a debt.
    expect(on(20)?.overdue).toBe(false);
    expect(on(16)?.isToday).toBe(true);
  });

  it("carries each day's questions, in due order, not only a tally", () => {
    // The cells show the questions themselves, so the grid has to hold them.
    const early = due({ ordinal: 1, dueAt: localNoon(2026, 7, 14) - 3600_000 });
    const late = due({ ordinal: 2, dueAt: localNoon(2026, 7, 14) });
    const grid = monthGrid(AUGUST, localNoon(2026, 7, 16), [late, early]);
    const day = grid.weeks.flat().find((entry) => entry.inMonth && entry.dayOfMonth === 14);

    expect(day?.items.map((item) => item.ordinal)).toEqual([1, 2]);
    expect(day?.due).toBe(day?.items.length);
  });

  it("opens on the oldest thing still waiting", () => {
    const items = [due({ dueAt: localNoon(2026, 7, 20) }), due({ dueAt: localNoon(2026, 7, 3) })];

    expect(defaultSelectedDay(items, localNoon(2026, 7, 16))).toBe(
      dayStartOf(localNoon(2026, 7, 3)),
    );
  });

  it("opens on today when there is nothing waiting", () => {
    expect(defaultSelectedDay([], localNoon(2026, 7, 16))).toBe(
      dayStartOf(localNoon(2026, 7, 16)),
    );
  });

  it("lists a day's questions in due order", () => {
    const early = due({ ordinal: 1, dueAt: localNoon(2026, 7, 14) - 3600_000 });
    const late = due({ ordinal: 2, dueAt: localNoon(2026, 7, 14) });
    const other = due({ ordinal: 3, dueAt: localNoon(2026, 7, 15) });

    const listed = itemsOnDay([late, other, early], dayStartOf(localNoon(2026, 7, 14)));

    expect(listed.map((item) => item.ordinal)).toEqual([1, 2]);
  });
});
