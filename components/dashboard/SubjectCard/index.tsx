/**
 * One subject, summarised.
 *
 * The ring shows how much of the subject is done and how it went; everything
 * else on the card is there to answer "is this the one I should open next?".
 */

import "./SubjectCard.css";

import { accuracy, coverage, statusCounts } from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent, pluralize } from "../../../utils/format";
import { NOT_STARTED, PARTIAL_INDEX_NOTE, UNKNOWN_TOTAL } from "../constants";
import { Legend } from "../Legend";
import { StatusDonut } from "../StatusDonut";

export interface SubjectCardProps {
  group: TopicGroup;
  onOpen: (key: string) => void;
}

/** "40 / 298", or "≥40 / 298" while questions in the subject are undiscovered. */
function attemptedText(group: TopicGroup): string {
  const { solvedRows, totalFromSite, fullyIndexed } = group.stats;
  const prefix = fullyIndexed ? "" : "≥";
  return `${prefix}${solvedRows} / ${totalFromSite ?? UNKNOWN_TOTAL}`;
}

export function SubjectCard({ group, onOpen }: SubjectCardProps) {
  const { stats } = group;
  const counts = statusCounts(stats);
  const touched = stats.solvedRows > 0;

  return (
    <button type="button" className="card" onClick={() => onOpen(group.key)}>
      <div className="card-head">
        <div className="card-heading">
          <h3 className="card-title">{group.label}</h3>
          <span className="card-topics">
            {pluralize(group.children.length, "topic")}
            {stats.fullyIndexed ? "" : ` · ${PARTIAL_INDEX_NOTE}`}
          </span>
        </div>

        <StatusDonut
          stats={stats}
          size={72}
          caption={formatPercent(coverage(stats))}
          label="done"
        />
      </div>

      <div className="card-figures">
        <span className="card-figure num">{attemptedText(group)}</span>
        <span className="caption">attempted</span>
        <span className="card-figure num">{touched ? formatPercent(accuracy(stats)) : NO_VALUE}</span>
        <span className="caption">accuracy</span>
      </div>

      <Legend counts={counts} />

      <div className="card-foot">
        <span>
          {stats.marksEarned}
          {stats.totalMarksFromSite === null ? "" : ` / ${stats.totalMarksFromSite}`} marks
        </span>
        <span>{touched ? (formatDate(stats.lastActivityAt) ?? "") : NOT_STARTED}</span>
      </div>
    </button>
  );
}
