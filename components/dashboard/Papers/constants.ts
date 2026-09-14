/** Copy for the papers section. */

export const PAPERS_TITLE = "Papers you’ve sat";

export const PAPERS_NOTE =
  "Scored on the answers you gave while sitting the paper itself. Answering one " +
  "of its questions later, while practising the topic, counts towards that topic " +
  "and not towards this score.";

export const NO_PAPERS_TITLE = "No papers opened yet";

export const NO_PAPERS_BODY =
  "Open a year’s paper on practicepaper.in and it appears here with its own score: " +
  "marks out of what the paper is worth, and which subjects its questions came from. " +
  "Questions you meet here still count towards topic progress and still enter the " +
  "review rotation.";

export const PAPER_COLUMNS = {
  paper: "Paper",
  score: "Score",
  sat: "Sat",
  accuracy: "Accuracy",
  lastSat: "Last sat",
} as const;

export const NOT_SAT = "not sat yet";

/** Said where questions were met in practice rather than in the paper. */
export const MET_ELSEWHERE = (count: number): string =>
  `${count} of its questions ${count === 1 ? "has" : "have"} been answered while practising, which is not counted here.`;

export const BREAKDOWN_TITLE = "Where the marks were";

/** Shown when the round trip for a breakdown comes back empty. */
export const BREAKDOWN_FAILED =
  "Could not read this paper’s questions. Reopen the row to try again.";

export const SUBJECT_COLUMNS = {
  subject: "Subject",
  marks: "Marks",
  sat: "Sat",
  correct: "Correct",
} as const;
