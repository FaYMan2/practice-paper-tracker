/** What the scheduler produces, and what the dashboard shows of it. */

import type { QuestionType } from "../../types";

/**
 * A question's place in the review rotation, computed from its attempts.
 *
 * Not stored anywhere. Every field here is a fold over the attempt log, so
 * there is no copy of it that can fall out of step — the same reason
 * `questions.status` is rebuildable, applied to scheduling.
 */
export interface ReviewSchedule {
  goId: string;
  /** SM-2 easiness. Higher means the interval grows faster. */
  easiness: number;
  /** Consecutive correct answers. Reset to zero by any wrong one. */
  repetitions: number;
  intervalDays: number;
  lastReviewedAt: number;
  dueAt: number;
  /** Times this question has been answered wrong. Never reset. */
  lapses: number;
  /** True once the interval is long enough to stop offering it. */
  graduated: boolean;
}

/**
 * One line of the queue: the schedule, plus enough about the question to show
 * it and to link back to it on the site.
 *
 * `topicSlug` and `ordinal` come from a row rather than the attempt, so the
 * link points at where the question lives now — an attempt records where it was
 * when it was answered, and ordinals shift as exam years are added.
 */
export interface ReviewItem {
  goId: string;
  topicSlug: string;
  /**
   * The subject that topic sits under, for the hierarchical view. Null where
   * the index page gave the topic no linked parent, which is a real case — the
   * ISRO group heading is a bare `<strong>`.
   */
  subjectSlug: string | null;
  ordinal: number;
  examSlug: string | null;
  type: QuestionType;
  marks: number;
  starred: boolean;
  attemptCount: number;
  lapses: number;
  /**
   * Consecutive correct answers since the last miss. Zero means it has been
   * missed and not put right yet, which is the difference between a question
   * that is working its way out of the rotation and one that is stuck in it.
   */
  repetitions: number;
  intervalDays: number;
  lastReviewedAt: number;
  dueAt: number;
  /** Days since it came due. Negative would mean not yet due, so never here. */
  overdueDays: number;
}

/** One calendar day's worth of the queue. */
export interface ReviewDayGroup {
  /** Local midnight of the day these fell due, as the grouping key. */
  dayStart: number;
  /** Days this whole group has been waiting. Shared, since they share a day. */
  overdueDays: number;
  items: ReviewItem[];
}

export interface ReviewTopicGroup {
  topicSlug: string;
  items: ReviewItem[];
}

/** A subject and its topics, each holding the questions due beneath it. */
export interface ReviewSubjectGroup {
  subjectSlug: string | null;
  topics: ReviewTopicGroup[];
  /** Questions across every topic here, so the header can say how many. */
  total: number;
}

/** One cell of the month grid. */
export interface CalendarDay {
  /** Local midnight, and the key everything else joins on. */
  ts: number;
  dayOfMonth: number;
  /** False for the lead-in and trailing days that pad the grid. */
  inMonth: boolean;
  isToday: boolean;
  /**
   * What falls on this day, in due order.
   *
   * The cells carry the questions themselves rather than only a tally: a month
   * that says "2" tells you to click, and a month that says "Q4 · Q5, one of
   * them struggling" is the thing you were going to click for.
   */
  items: ReviewItem[];
  /** `items.length`, kept so the sums below read as sums. */
  due: number;
  /** Due, and the day has already passed. */
  overdue: boolean;
}

/**
 * A month, and what is on it.
 *
 * The three counts are split the same way the cells are coloured, because the
 * grid plots the whole rotation rather than only what is due — seeing what is
 * coming is the point of a month view. Calling all of it "due" was how a
 * calendar showing five came to disagree with a list showing three.
 */
export interface CalendarMonth {
  monthStart: number;
  weeks: CalendarDay[][];
  /** Days already passed with questions still on them. */
  overdue: number;
  dueToday: number;
  /** Scheduled for a day that has not arrived. Not yet due, and not late. */
  upcoming: number;
}

export interface ReviewQueue {
  /** Due now, most overdue first. */
  due: ReviewItem[];
  /** Scheduled but not yet due, soonest first. All of them: the calendar plots the month. */
  upcoming: ReviewItem[];
  /** Everything in the rotation, due or not. */
  tracked: number;
  /** Questions that have been missed but never placed, so cannot be linked. */
  unplaced: number;
}
