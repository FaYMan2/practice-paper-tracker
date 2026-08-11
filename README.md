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

### A progress strip that isn't broken

Above each question list: attempted, correct, wrong and marks for *that* topic, updating live as you answer. It replaces the site's counters, which are shared across topics and drift as soon as you switch.

Where the extension hasn't seen every question in a topic yet, it says `at least 12 / 465` rather than implying a precision it doesn't have.

### Two ways to pick up where you left off

Both appear on the progress strip and beside each topic on the index page:

- **Resume** — the first question you haven't attempted.
- **Last attempt** — the furthest question you *have* attempted.

They're the same until you skip a hard question, and then they aren't: resume keeps pointing at the gap while your real progress moves on. Both are useful, so both are offered.

Either one opens the right page and scrolls to the question, briefly outlining it so you can see where you landed.

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

Bear in mind it lives in your browser profile, so clearing extension data or wiping the profile takes your history with it. Export/import is on the roadmap for exactly this reason.

---

## Upcoming

Roughly in order:

**Dashboard** — an extension page with every topic's accuracy and coverage, grouped by parent subject, with drill-down into individual questions.

**Coverage crawl** — an opt-in, per-topic background pass that fills in the questions you haven't browsed yet, so counts stop being a floor.

**Manual starring** — flag questions to revisit, independently of whether you got them right.

**Export and import** — a JSON dump so a profile wipe doesn't cost you months of tracking.

**Spaced repetition** — the attempt log already carries a timestamp and verdict for every attempt, so a review queue of questions you got wrong is mostly scheduling on top of data that already exists.

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
- **Every DOM assumption lives in `utils/selectors`.** Add selectors there, not inline, and extend `selfCheck` when you add one worth monitoring.

### Layout

```
entrypoints/    registration only — background worker and content script
services/
  messages/     one file per message the background handles
  page/         one file per thing that happens on a page
components/     injected UI, one folder per component with its own stylesheet
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
            ▲                                            │
            └──────────── chrome.storage.local ◄─────────┘
```

The split is forced rather than stylistic: an IndexedDB opened from a content script belongs to practicepaper.in's origin partition, so the extension's own pages could never read it. And since MV3 kills the background worker after ~30 seconds idle, waking it on every page load would be slow — hence the `storage.local` mirror, which the content script reads directly for anything small enough to cache.

When you answer, a capture-phase click listener records *what* you picked, then a `MutationObserver` on the site's own verdict stamp records *how it went*. Those two facts become one appended attempt.

---

## Built with

[WXT](https://wxt.dev) · [Dexie](https://dexie.org) · [Ramda](https://ramdajs.com) · [Vitest](https://vitest.dev) · TypeScript
