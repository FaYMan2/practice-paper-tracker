/**
 * The dashboard.
 *
 * Three sections behind a tab bar — progress, review, backups — because they
 * answer three different questions, and stacking them down one page put the
 * one you open daily furthest from the top.
 *
 * Within progress there are still only two levels: every subject as a card, and
 * one subject opened. Anything deeper — a topic's individual questions —
 * belongs inside the open subject, because that is the only place the question
 * numbers mean anything.
 */

import "../theme.css";

import { useState } from "react";
import { Database, LayoutGrid, Timer } from "lucide-react";
import { useDashboard, useReview } from "../../../services/dashboard";
import {
  DashboardTab,
  SubjectView,
  subjectBySlug,
  visibleGroups,
} from "../../../utils/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { pluralize } from "../../../utils/format";
import {
  LOADING_LABEL,
  PAGE_SUBTITLE,
  PAGE_TITLE,
  REPAIRED_NOTE,
  SUBJECT_VIEWS,
  SUBJECT_VIEW_LABEL,
  UNSTARTED_HINT,
} from "../constants";
import { DataTools } from "../DataTools";
import { EmptyState } from "../EmptyState";
import { Overview } from "../Overview";
import { ReviewTable } from "../ReviewTable";
import { SubjectDialog } from "../SubjectDialog";
import { SubjectGrid } from "../SubjectGrid";
import { Badge, Segmented, Tab, TabList, TabPanel, Tabs } from "../ui";

function findGroup(groups: TopicGroup[], key: string | null): TopicGroup | null {
  if (key === null) return null;
  return groups.find((group) => group.key === key) ?? null;
}

export function App() {
  const { view, loading, repaired } = useDashboard();
  const { queue, loading: reviewLoading } = useReview();

  const [tab, setTab] = useState<string>(DashboardTab.Home);
  const [subjects, setSubjects] = useState<SubjectView>(SubjectView.Started);
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Looked up rather than stored: a summary rewritten while the dialog is open
  // must reach it, and holding the group itself in state would freeze it.
  const open = findGroup(view.groups, openKey);
  const shown = visibleGroups(view.groups, subjects);
  const hidden = view.groups.length - shown.length;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pt-8 pb-20">
      <header className="mb-5">
        <h1 className="m-0 text-[22px] font-bold tracking-tight">{PAGE_TITLE}</h1>
        <p className="mt-1 mb-0 text-muted">{PAGE_SUBTITLE}</p>
      </header>

      {loading ? <p className="text-muted italic">{LOADING_LABEL}</p> : null}

      {!loading ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabList>
            <Tab value={DashboardTab.Home}>
              <LayoutGrid />
              Progress
            </Tab>
            <Tab value={DashboardTab.Review}>
              <Timer />
              Review
              {queue.due.length > 0 ? <Badge tone="accent">{queue.due.length}</Badge> : null}
            </Tab>
            <Tab value={DashboardTab.Backups}>
              <Database />
              Backups
            </Tab>
          </TabList>

          <TabPanel value={DashboardTab.Home}>
            {/*
              The repair notice belongs here rather than beside the rebuild
              button: it is about *these* figures, and saying it on another tab
              would be reporting wrong numbers somewhere the numbers are not.
            */}
            {repaired > 0 ? (
              <p
                role="status"
                className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn"
              >
                {pluralize(repaired, "question record")} {REPAIRED_NOTE}
              </p>
            ) : null}

            {view.empty ? <EmptyState /> : null}

            {!view.empty ? (
              <>
                <Overview view={view} />

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Segmented
                    options={SUBJECT_VIEWS}
                    value={subjects}
                    onChange={setSubjects}
                    label={SUBJECT_VIEW_LABEL}
                  />
                  {hidden > 0 && subjects === SubjectView.Started ? (
                    <span className="text-xs text-faint">
                      {hidden} {UNSTARTED_HINT}
                    </span>
                  ) : null}
                </div>

                <SubjectGrid groups={shown} onOpen={setOpenKey} />
              </>
            ) : null}
          </TabPanel>

          <TabPanel value={DashboardTab.Review}>
            <ReviewTable
              queue={queue}
              loading={reviewLoading}
              titles={view.titles}
              // A fallback for items from a background that predates the field.
              subjectOf={subjectBySlug(view.groups)}
            />
          </TabPanel>

          <TabPanel value={DashboardTab.Backups}>
            <DataTools />
          </TabPanel>
        </Tabs>
      ) : null}

      {open ? (
        <SubjectDialog
          key={open.key}
          group={open}
          titles={view.titles}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </main>
  );
}
