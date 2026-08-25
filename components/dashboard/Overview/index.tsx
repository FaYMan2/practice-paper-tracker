/** Everything, at a glance: the ring, the figures, and the weak subjects. */

import { accuracy, averageTimeMs, coverage, statusCounts } from "../../../utils/dashboard";
import type { DashboardView } from "../../../utils/dashboard";
import { NO_VALUE, formatDate, formatDuration, formatPercent } from "../../../utils/format";
import { AVERAGED_OVER_TITLE, TIMED_STAT_LABEL, UNKNOWN_TOTAL } from "../constants";
import { TrendingUp } from "lucide-react";
import { AccuracyBars } from "../AccuracyBars";
import { Card, CardBody } from "../ui";
import { Legend } from "../Legend";
import { Stat, StatRow } from "../Stat";
import { StatusDonut } from "../StatusDonut";
import { NOTHING_ATTEMPTED, OVERALL_LABEL, WEAKEST_TITLE } from "./constants";

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
      <Card className="flex items-center gap-6 p-5" aria-label={OVERALL_LABEL}>
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
            {/*
              Only once anything has been timed. A dash here on a profile that
              has never used the stopwatch is a column of nothing explaining
              itself, and the tooltip says how thin the evidence is.
            */}
            {overall.timedQuestions > 0 ? (
              <Stat
                value={formatDuration(averageTimeMs(overall)) ?? NO_VALUE}
                label={TIMED_STAT_LABEL(overall.timedQuestions)}
                title={AVERAGED_OVER_TITLE(overall.timedQuestions)}
              />
            ) : null}
            <Stat value={formatDate(overall.lastActivityAt) ?? NO_VALUE} label="last solved" />
          </StatRow>

          {/*
            The legend names the three colours in the ring beside it. It is the
            only place they are spelled out now: the subject cards below used to
            repeat the same three counts a second time, at a smaller size.
          */}
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
