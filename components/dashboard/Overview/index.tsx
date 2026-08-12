/** Everything, at a glance: the ring, the figures, and the weak subjects. */

import "./Overview.css";

import { accuracy, coverage, statusCounts } from "../../../utils/dashboard";
import type { DashboardView } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent } from "../../../utils/format";
import { UNKNOWN_TOTAL } from "../constants";
import { AccuracyBars } from "../AccuracyBars";
import { Legend } from "../Legend";
import { Stat, StatRow } from "../Stat";
import { StatusDonut } from "../StatusDonut";
import { NOTHING_ATTEMPTED, WEAKEST_TITLE } from "./constants";

export * from "./constants";

export interface OverviewProps {
  view: DashboardView;
}

function attemptedText(view: DashboardView): string {
  const { solvedRows, totalFromSite, fullyIndexed } = view.overall;
  const prefix = fullyIndexed ? "" : "≥";
  return `${prefix}${solvedRows} / ${totalFromSite ?? UNKNOWN_TOTAL}`;
}

function marksText(view: DashboardView): string {
  const { marksEarned, totalMarksFromSite } = view.overall;
  return totalMarksFromSite === null ? `${marksEarned}` : `${marksEarned} / ${totalMarksFromSite}`;
}

export function Overview({ view }: OverviewProps) {
  const { overall } = view;
  const counts = statusCounts(overall);

  return (
    <section className="overview">
      <div className="overview-summary">
        <StatusDonut
          stats={overall}
          size={132}
          caption={formatPercent(coverage(overall))}
          label="done"
        />

        <div className="overview-figures">
          <StatRow>
            <Stat
              value={attemptedText(view)}
              label="attempted"
              title="Questions answered at least once, against what the site says the total is"
            />
            <Stat value={`${overall.correctRows}`} label="correct" tone="correct" />
            <Stat value={`${overall.wrongRows}`} label="wrong" tone="wrong" />
            <Stat value={formatPercent(accuracy(overall))} label="accuracy" tone="accent" />
            <Stat value={marksText(view)} label="marks" />
            <Stat value={formatDate(overall.lastActivityAt) ?? NO_VALUE} label="last solved" />
          </StatRow>

          <Legend counts={counts} />
        </div>
      </div>

      <div className="overview-weakest">
        <h2 className="overview-heading">{WEAKEST_TITLE}</h2>
        <AccuracyBars groups={view.groups} emptyMessage={NOTHING_ATTEMPTED} />
      </div>
    </section>
  );
}
