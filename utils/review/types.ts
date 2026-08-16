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

export interface ReviewQueue {
  /** Due now, most overdue first. */
  due: ReviewItem[];
  /** Scheduled but not yet due — the next few, soonest first. */
  upcoming: ReviewItem[];
  /** Everything in the rotation, due or not. */
  tracked: number;
  /** Questions that have been missed but never placed, so cannot be linked. */
  unplaced: number;
}
