# PracticePaper Tracker

A Chrome extension that gives [practicepaper.in](https://practicepaper.in/gate-cse/topic-wise-practice-of-gate-cse-previous-year-papers) the progress tracking it doesn't have.

The site hosts GATE CSE previous-year questions organised by topic, but keeps your score in `sessionStorage` — three counters that vanish when you close the tab. Worse, they're shared across every topic while being divided by a per-topic denominator, so the percentage goes wrong the moment you open a second topic.

That leaves you doing the bookkeeping by hand: remembering which page number you reached in each of ~100 topics, and re-solving questions you've already done because the same question appears under several topics.

This extension records every answer locally, shows them back on the page, and gets you back to where you stopped.

---

## Features

### Every answer is recorded, permanently

Each answer is appended to a local log with the option you picked, the exam it came from, the marks, and a timestamp. Nothing is ever overwritten — answer a question wrong today and right next week and both are kept, so "did I get this right first try?" stays answerable.

Works for MCQ, MSQ and NAT questions. The site's own grading decides the verdict; the extension only watches for it, so there's no second implementation of the marking rules to drift out of sync.

### Solved questions are marked on the page

Return to a topic and every question you've already answered carries a badge — green for correct, red for wrong — with the attempt count and date on hover.

### Cross-topic recognition

The same question often appears under several topics: something in `probability-theory` also shows up under `discrete-mathematics`. Solve it once and it's marked in both places, with an amber **★ Solved elsewhere** badge naming where you did it.

This works because every question on the site carries a GateOverflow link, and that id is stable across topics. No text matching, no heuristics.

It also feeds the numbers. The site labels every question with the other topic it's filed under — a probability question listed on the Discrete Mathematics page says so beneath itself — so solving it there counts towards Probability Theory too, and that topic shows real progress before you've ever opened one of its pages.

A subject counts everything its topics carry, label or no label. `/gate-cse/computer-organization` serves every question `/gate-cse/pipeline-processor` serves, so answering it under the topic answers it under the subject, and a subject you've never opened still shows what you've done beneath it.

### A progress strip that isn't broken

Above each question list: attempted, correct, wrong and marks for *that* topic, updating live as you answer. It replaces the site's counters, which are shared across topics and drift as soon as you switch.

Where the extension hasn't seen every question in a topic yet, it says `at least 12 / 465` rather than implying a precision it doesn't have.

### Two ways to pick up where you left off

Both appear on the progress strip and beside each topic on the index page:

- **Resume** — the first question you haven't attempted.
- **Last attempt** — the furthest question you *have* attempted.

They're the same until you skip a hard question, and then they aren't: resume keeps pointing at the gap while your real progress moves on. Both are useful, so both are offered.

Either one opens the right page and scrolls to the question, briefly outlining it so you can see where you landed.

### A dashboard for the whole syllabus

Click the toolbar icon for a card per subject — a ring showing how much of it is done and how it went, plus attempted, accuracy, marks and when you last touched it. Above them, your overall numbers and a chart of accuracy by subject, weakest first, which is the one thing a revision plan actually needs.

Open a subject and its topics come up in a dialog with the same figures each, plus resume links. Expand a topic to list its questions with status and attempt count, filter to just the ones you got wrong, and click any of them to open that exact question on the site.

The subject hierarchy is scraped from the site's own topic-wise page, so it matches how the syllabus is organised. Visit that page once and every topic appears, including the ones you've never opened — the dashboard shows what's left, not only what you've started.

Totals add up subjects only, never a subject *and* its topics: `/gate-cse/data-structure` serves every question `stack` serves, so adding both would count each answer twice.

### Index a whole topic

Counts start as a floor, because the tracker only knows about pages you've opened — `at least 12 / 465`. The progress strip offers **Index this topic**, which walks the rest of that topic's pages in the background of the tab and records what's on them. After it finishes the counts are real totals, the partial-index note goes away, and resume can point at your actual next unanswered question instead of estimating.

It never answers anything — a crawl records that a question exists, nothing more. It's opt-in per topic because it costs the site around ninety requests for a large subject, it goes one page at a time with a pause between each, and you can stop it at any point and pick up later from where it stopped.

### Star the ones worth returning to

A star beside each question, and a **Starred** filter in the dashboard drill-down. It's per question rather than per row, so starring in one topic stars it everywhere that question appears.

This is the only thing in the database that isn't derived from your answers, so it's also the only thing a full rebuild has to carry across untouched.

### Spaced repetition for the ones you got wrong

Get a question wrong and it joins a review rotation: due again tomorrow, then six days later, then at widening intervals for as long as you keep getting it right. Miss it again and it goes back to the start, and climbs more slowly the next time. Once it's been right often enough to be due in three months, it stops appearing — a syllabus is something you finish, unlike a flashcard deck.

Questions you've only ever got right never enter. Putting them there would bury the ones that matter.

The **Review** tab shows the rotation two ways. **By day** is a month calendar carrying the questions themselves, so you can see what is coming as well as what is late; picking a day lists it beside the grid. **By topic** is the subject hierarchy as a navigator — subjects collapse, and choosing one puts just its questions in the table.

Both show the whole rotation rather than only what's due, because every question in it was answered wrong at least once and "wrong" can't be the distinction. What separates them is a tag reading what happened *since*: **Struggling** (missed more than once, not right since), **Relearning** (missed once), **On track** (right since the miss, spacing out). Starred sits alongside those rather than replacing one, since a question can be both.

There's no review mode: you answer on the real page against the site's own marking, and the attempt that produces reschedules it. A separate review screen would mean a second copy of every question and a second implementation of the grading.

The schedule itself is stored nowhere. SM-2 is a deterministic fold over a question's attempts, so it's recomputed from the log whenever it's needed — the same way the pass/fail state is. Nothing to migrate, nothing extra in a backup, and no second copy that can disagree with what you actually answered.

### Export, import, and a rebuild button

At the foot of the dashboard: **Export a backup** writes the whole database to one JSON file — every answer with the option you picked, plus the questions, rows and topics. **Import a backup** merges one back in.

Merges, not replaces, and that distinction is the whole feature. Answers are matched on the event id they were recorded under, so importing the same file twice adds nothing the second time, and importing a file onto a profile you've kept using keeps both sides' answers rather than picking one. Nothing is ever removed by an import, a stale file can't roll back a page you've indexed since, and a star you set here survives a file that predates it.

Afterwards every status and count is recomputed from the merged answer log rather than trusted from the file — neither side's cached figures have seen both halves, so only a rebuild gets it right. **Rebuild the figures** runs that same pass on demand.

It also runs a check on its own. `questions` is only ever a cache of the answer log, so opening the dashboard recomputes it and compares; if anything has fallen out of step it's repaired and the page says how many. Normally that's nothing, and the point of saying it out loud is that a cache quietly correcting itself is indistinguishable from one that was never wrong.

### It tells you when it breaks

The site is WordPress and its markup can change without warning. A self-check runs on every page; if the selectors stop matching, the toolbar icon shows a `!` rather than silently recording nothing for months.

---

## Install

Not on the Chrome Web Store — build it and load it unpacked.

```sh
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3`.

For development, `pnpm dev` rebuilds on change; load `.output/chrome-mv3-dev` instead.

| Command | Does |
| --- | --- |
| `pnpm dev` | Build and watch |
| `pnpm build` | Production build |
| `pnpm test` | Run the test suite |
| `pnpm compile` | Typecheck |
| `pnpm zip` | Package for distribution |

Requires Node 22+ and pnpm.

### Your data

Everything stays in your browser — IndexedDB for the records, `chrome.storage.local` for a small cache. No account, no server, nothing leaves your machine. The extension asks for access to `practicepaper.in` and nothing else.

Bear in mind it lives in your browser profile, so clearing extension data or wiping the profile takes your history with it. Export a backup from the dashboard now and then, and keep the file somewhere else.

---

## Upcoming

Roughly in order:

**Weak-area heatmap** — accuracy per child topic against the parent subject, turning "I should revise data structures" into "your hashing accuracy is 40% across 15 attempts".

**Time per question** — GATE is as much a speed exam as a knowledge one.

**Year-paper scoring** — year pages share the same question pool, so tracking already works there; this surfaces it as "GATE 2024 Set 1: 41 of 65 attempted, 32 correct".

**Duplicate surfacing** — one question occupies five different rows on this site. Knowing which questions examiners keep recycling is a genuinely useful signal.

---

## Requesting a feature

[Open an issue](https://github.com/FaYMan2/practice-paper-tracker/issues/new), label it **`Feature request`**, and assign it to [@FaYMan2](https://github.com/FaYMan2).

Say what you're trying to do rather than what to build — the problem is more useful than the proposed solution, and the site often has a quirk that changes the answer.

## Contributing

1. **Open an issue first** describing what you want to change, and ping [@FaYMan2](https://github.com/FaYMan2) for a review of the approach. This matters more than usual here: the extension reads someone else's markup, and there are a few assumptions that look arbitrary but aren't.
2. **Wait for a nod on the approach** before writing much code.
3. **Fork the repo** and work on a branch.
4. **Make the change**, keeping `pnpm test` and `pnpm compile` green.
5. **Open a PR** with a **demo video** — [neetoRecord](https://neeto.com/neetorecord) or Loom both work. Screenshots are fine for anything with no interaction, but most of this extension is interaction.
6. Link the issue in the PR body.

### Before you start

A few things in the code look odd and are load-bearing. Worth knowing so a review doesn't surprise you:

- **`attempts` is append-only.** Everything on `questions` except `starred` is a cached projection, and `rebuildQuestionProjections()` must be able to reconstruct it from the log alone. If a change makes that impossible, it's the wrong change — the log is what makes future features like spaced repetition possible at all.
- **Never write the site's `mtq_correct_stamp` / `mtq_wrong_stamp` classes.** The capture observer watches those, so painting them records a phantom attempt for a question nobody answered. Our classes are namespaced `pptr-`.
- **Never derive a verdict yourself.** The site already implements the MSQ countdown and the NAT range check. Read its stamp instead of reimplementing them.
- **The database belongs to the background worker.** IndexedDB opened from a content script lives in practicepaper.in's origin, where the extension's own pages can't reach it. Content scripts message the background; they never write directly.
- **React stops at the dashboard.** The content script is plain DOM on purpose: it is injected into someone else's page and every kilobyte is paid on each page load. The dashboard is our own page and a real application, so it gets React and its charts — and none of that ships to the site.
- **The crawl runs in the content script, not the worker.** An MV3 service worker has no `DOMParser`, and parsing fetched HTML any other way would be a second copy of `utils/selectors`. The trade is that a crawl belongs to its tab.
- **Every DOM assumption lives in `utils/selectors`.** Add selectors there, not inline, and extend `selfCheck` when you add one worth monitoring.

### Layout

```
entrypoints/    registration only — background worker, content script, dashboard
services/
  messages/     one file per message the background handles
  page/         one file per thing that happens on a page
  dashboard/    what the dashboard page shows and does
components/     injected UI, one folder per component with its own stylesheet
  dashboard/    the dashboard's own UI — React, never imported by a content script
utils/          selectors, url parsing, capture, database, summaries, resume
types/          shared domain types
tests/          vitest, run against real saved pages in tests/fixtures
```

Tests run against unmodified HTML saved from the live site, so a change that breaks on real markup usually fails locally too.

---

## How it works

Two contexts that can't share memory:

```
┌─ practicepaper.in page ────────┐         ┌─ extension background ────────┐
│  content script                │ message │  service worker               │
│  reads the DOM, watches answers├────────►│  owns IndexedDB, only writer  │
│  reads storage.local (fast)    │         │  projects → storage.local     │
└────────────────────────────────┘         └───────────────────────────────┘
            ▲                                     ▲      │
            │                            message  │      │
            │                  ┌─ dashboard page ─┴──┐   │
            │                  │  reads only         │   │
            └──── chrome.storage.local ──────────────┴───┘
```

The split is forced rather than stylistic: an IndexedDB opened from a content script belongs to practicepaper.in's origin partition, so the extension's own pages could never read it. And since MV3 kills the background worker after ~30 seconds idle, waking it on every page load would be slow — hence the `storage.local` mirror, which the content script reads directly for anything small enough to cache.

When you answer, a capture-phase click listener records *what* you picked, then a `MutationObserver` on the site's own verdict stamp records *how it went*. Those two facts become one appended attempt.

---

## Built with

[WXT](https://wxt.dev) · [Dexie](https://dexie.org) · [Ramda](https://ramdajs.com) · [React](https://react.dev) · [Recharts](https://recharts.org) · [Vitest](https://vitest.dev) · TypeScript
