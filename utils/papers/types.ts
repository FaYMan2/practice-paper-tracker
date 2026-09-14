/** What a sat paper looks like once its own attempts have been counted. */

import type { QuestionType, Verdict } from "../../types";

/** One question of a paper, judged only on what happened during the paper. */
export interface PaperQuestion {
  goId: string;
  ordinal: number;
  marks: number;
  type: QuestionType;
  /**
   * The verdict from the paper itself, or null when the question was never
   * answered *here*. Answering it later under its topic does not fill this in.
   */
  verdict: Verdict | null;
  /** When it was answered during the paper. */
  answeredAt: number | null;
  /** The topic the site files it under, for the subject breakdown. */
  topicSlug: string | null;
  /** True when the question has been answered somewhere else, but not here. */
  metElsewhere: boolean;
}

/** A paper's figures, all of them scoped to answers given on the paper itself. */
export interface PaperScore {
  /** Questions the paper is known to hold, from its own page. */
  total: number | null;
  /** Questions of it that have been indexed, which is the honest denominator. */
  indexed: number;
  attempted: number;
  correct: number;
  wrong: number;
  marksEarned: number;
  marksAvailable: number;
  /** Correct as a share of attempted, or null with nothing attempted. */
  accuracy: number | null;
  /** Latest answer given during the paper. */
  lastSatAt: number | null;
  /** Questions met while practising a topic but never answered in the paper. */
  metElsewhere: number;
}

export interface PaperSummary {
  slug: string;
  /** "GATE CSE 2019", from the slug rather than the page title. */
  label: string;
  score: PaperScore;
}

/** One subject's share of a paper, and how it went. */
export interface PaperSubject {
  key: string;
  label: string;
  questions: number;
  marksAvailable: number;
  marksEarned: number;
  attempted: number;
  correct: number;
}

export interface PaperDetail {
  slug: string;
  score: PaperScore;
  questions: PaperQuestion[];
}
