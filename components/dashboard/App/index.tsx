/**
 * The dashboard.
 *
 * Two levels only: every subject as a card, and one subject opened. Anything
 * deeper — a topic's individual questions — belongs inside the open subject,
 * because that is the only place the question numbers mean anything.
 */

import "./App.css";

import { useState } from "react";
import { useDashboard } from "../../../services/dashboard";
import type { TopicGroup } from "../../../utils/dashboard";
import { LOADING_LABEL, PAGE_SUBTITLE, PAGE_TITLE } from "../constants";
import { DataTools } from "../DataTools";
import { EmptyState } from "../EmptyState";
import { Overview } from "../Overview";
import { SubjectDialog } from "../SubjectDialog";
import { SubjectGrid } from "../SubjectGrid";

function findGroup(groups: TopicGroup[], key: string | null): TopicGroup | null {
  if (key === null) return null;
  return groups.find((group) => group.key === key) ?? null;
}

export function App() {
  const { view, loading, repaired } = useDashboard();
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Looked up rather than stored: a summary rewritten while the dialog is open
  // must reach it, and holding the group itself in state would freeze it.
  const open = findGroup(view.groups, openKey);

  return (
    <main className="page">
      <header className="page-head">
        <h1 className="page-title">{PAGE_TITLE}</h1>
        <p className="page-sub">{PAGE_SUBTITLE}</p>
      </header>

      {loading ? <p className="page-loading">{LOADING_LABEL}</p> : null}

      {!loading && view.empty ? <EmptyState /> : null}

      {!loading && !view.empty ? (
        <>
          <Overview view={view} />
          <SubjectGrid groups={view.groups} onOpen={setOpenKey} />
        </>
      ) : null}

      {/*
        Shown even with nothing recorded — importing a backup into a fresh
        profile is exactly the case where the page is otherwise empty.
      */}
      {loading ? null : <DataTools repaired={repaired} />}

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
