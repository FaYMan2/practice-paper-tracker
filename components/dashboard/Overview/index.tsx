/** Everything, at a glance: the ring, the figures, and the weak subjects. */

import { accuracy, coverage, statusCounts } from "../../../utils/dashboard";
import type { DashboardView } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatPercent } from "../../../utils/format";
import { UNKNOWN_TOTAL } from "../constants";
import { TrendingUp } from "lucide-react";
import { AccuracyBars } from "../AccuracyBars";
import { Card, CardBody } from "../ui";
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
    <section className="mb-5 grid gap-4 [grid-template-columns:minmax(340px,1.1fr)_minmax(300px,1fr)] max-[900px]:grid-cols-1">
      <Card className="flex items-center gap-6 p-5">
        <StatusDonut
          stats={overall}
          size={132}
          caption={formatPercent(coverage(overall))}
          label="done"
        />

        <div className="flex min-w-0 flex-col gap-3.5">
          <StatRow>
            <Stat
              value={attemptedText(view)}
              label="attempted"
              title="Questions answered at least once, against what the site says the total is"
              lead
            />
            <Stat value={`${overall.correctRows}`} label="correct" tone="correct" />
            <Stat value={`${overall.wrongRows}`} label="wrong" tone="wrong" />
            <Stat value={formatPercent(accuracy(overall))} label="accuracy" tone="accent" />
            <Stat value={marksText(view)} label="marks" />
            <Stat value={formatDate(overall.lastActivityAt) ?? NO_VALUE} label="last solved" />
          </StatRow>

          <Legend counts={counts} />
        </div>
      </Card>

      <Card>
        <CardBody>
          <h2 className="m-0 mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
            <TrendingUp className="size-3.5" />
            {WEAKEST_TITLE}
          </h2>
          <AccuracyBars groups={view.groups} emptyMessage={NOTHING_ATTEMPTED} />
        </CardBody>
      </Card>
    </section>
  );
}
