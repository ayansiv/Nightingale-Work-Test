# Build plan

Chunked so that each piece is independently shippable, independently reviewable, and leaves the app
running. Spec §15 orders the work riskiest-first; this follows that order and records what actually
happened in the chunks already done.

**Legend:** ✅ done · ◐ partial · ○ not started

---

## Phase 0 — De-risk (done)

### ✅ Chunk 0.1 — Ingest spike
> Spec §15.1: *"Confirm both role feeds parse and check whether Shallow Review agenda pages
> consistently carry the assumptions field — §6 depends on it."*

**Outcome: the risk did not materialise, and the upside was larger than expected.** The Shallow
Review pipeline publishes `orthodox_problems` on 59/74 agendas, drawn from a **closed vocabulary of
12**. Coordinates are derived, not assigned. Full findings in `OWNER-DATA.md`.

Files: `scripts/ingest-agendas.ts`, `data/config/derivation.json`, `data/raw/`.

**Deferred from this chunk:** the second role feed. `aisafety.com/jobs` (spec §9) is **not
ingested** — the 80k board alone covers 646 AI-relevant roles, and adding a second feed brings a
dedup problem that is not worth solving before the UI is validated. See chunk 4.3.

### ✅ Chunk 0.2 — Calibration harness
> Source notes: *"score people whose views you know... catches sign errors and bad loadings before
> anyone else sees them."*

Built as sign expectations over agendas rather than people, since agenda positions are derivable
from first principles and people's are not (OD-03). **It caught two real defects on first run** —
seven inverted `patch_rebuild` signs, and Debate deriving as internals-positive because it lists an
assumption it *attacks*. Both are written up in `data/config/calibration.json`.

Files: `scripts/verify-data.ts`, `data/config/calibration.json`. Run: `npm run verify`.

---

## Phase 1 — Data (done)

### ✅ Chunk 1.1 — Agendas
74 technical agendas with derived coordinates, per-coordinate audit trail, FTE estimates with method
strings, and the FTE reconciliation (OD-02).

### ✅ Chunk 1.2 — Policy levers
12 levers seeded by hand from the 80k US AI policy landscape, all coordinates flagged `assigned`,
five institution types with partisan-exposure notes.

### ✅ Chunk 1.3 — Org tagging
146 organizations tagged with primary + secondary agendas, maturity tier and a per-row confidence
column. 28 field-building orgs deliberately untagged.

### ✅ Chunk 1.4 — Role classification
All 646 AI-relevant roles classified. Rule table instead of an API call — see `signals.json` for why
that is a choice rather than a compromise. 126-row review queue emitted rather than hidden.

Files: `scripts/ingest-roles.ts`, `data/classification/`.

---

## Phase 2 — Scoring and matching (done)

### ✅ Chunk 2.1 — Instrument and scoring
17 axes, 30 questions (the 28 from spec §3, plus q29/q30 added after measurement — see OD-09), four
response scales, all config-driven. Loading-weighted aggregation, abstain-versus-unsure, per-axis
coverage, consistency flags, joint takeover risk as display-only.

### ✅ Chunk 2.2 — Matcher
Distance with symmetric unknown handling, coverage weighting, domain gating, two never-merged lists,
per-axis match explanations.

### ✅ Chunk 2.3 — Permalink
One character per question, abstain and unsure on distinct characters, exact round-trip asserted.
Bumped to **v2** when q29/q30 landed; `decode` refuses a body of the wrong length, so a stale link
fails closed rather than decoding into someone else's answers.

Files: `src/lib/scoring.ts`, `src/lib/permalink.ts`.

---

## Phase 3 — Surfaces (done)

### ✅ Chunk 3.1 — Entry, instrument, results
Entry balances poles structurally (alternating lead per axis). Instrument separates Skip from Unsure
with a rule between them. Results leads with horizontal bars, not a plane.

### ✅ Chunk 3.2 — Browse and tables
Two filters not one. Experience level swaps framing text, not data. Two tables, visually separated,
default-sorted by the scale-invariant column.

### ✅ Chunk 3.3 — Agenda, axis and fellowship pages
Agenda pages follow the academic layout (theory of change → assumptions → coordinates with audit
trail → resourcing → who → critiques → neighbours). Axis pages are reusable topic pages in the
LessWrong wiki-tag sense.

---

## Phase 4 — Next, in recommended order

### ○ Chunk 4.1 — Owner data intake *(no code; unblocks everything below)*
Work `OWNER-DATA.md` in its recommended order. Each item is a file edit; `npm run verify` after each.
**The app stays usable throughout** — nothing here is a prerequisite for anything else.

### ○ Chunk 4.2 — House view overlay
> Spec §11.3: *"Overlay the house/default view (attributed to a person, not to the data)."*

Blocked on OD-08. The overlay machinery exists — `AxisPlot` already takes an `overlays` array and
the results page drives it from a dropdown. This is a data file plus one more overlay source, maybe
half a day once the position and its author exist.

### ○ Chunk 4.3 — Second role feed: `aisafety.com/jobs`
> Spec §9: gives skill set, experience, role type, degree, salary.

Deferred deliberately from chunk 0.1. The work is a second parser plus **org-name reconciliation** —
the two feeds will disagree about names ("METR" vs "Model Evaluation and Threat Research", which
already appears in the 80k data). Budget the dedup, not the parse. Do this after the review queue
(4.5), or the queue doubles.

### ○ Chunk 4.4 — Named researcher overlay
Blocked on OD-03. Rendering is the same overlay path as 4.2. The work is citation collection, not
code. Person pages do not exist yet and should be added with this chunk, not before — an empty
person page is worse than none.

### ○ Chunk 4.5 — Review-queue burn-down
126 rows in `data/derived/review-queue.json`. Mechanical, parallelisable, and each resolution either
adds a phrase (helps future rows) or an override (helps one). Track the queue size — it is the
honest measure of classification quality.

### ○ Chunk 4.6 — Bundle split
The JS bundle is **2.1 MB raw / 358 KB gzipped**, almost entirely `roles.json` with full
descriptions inlined. Acceptable for a snapshot, but the fix is cheap: split descriptions into a
lazily-imported chunk, since only the "why this tag" disclosure needs them. Half a day, and it is
the difference between a fast first paint and a slow one on mobile.

### ○ Chunk 4.7 — Emerging Tech Policy fellowship database
> Spec §9: fellowship rows. §11.6 wants acceptance-rate columns where published.

The Fellowships surface already renders an empty, explicitly-labelled acceptance-rate column, so
this chunk fills a hole the UI already shows rather than adding a feature.

### ○ Chunk 4.8 — Going live
The ingest scripts are deliberately clean and idempotent, so this is a cron job rather than a
rewrite, as the spec asks. What it needs beyond scheduling: a diff step so a refresh does not
silently overwrite manual overrides (`role-overrides.json` and `orgs.csv` are the files at risk),
and per-column freshness to replace the single "data as of" line.

---

## What is deliberately not built

| thing | why |
|---|---|
| Second role feed | Chunk 4.3 — dedup cost exceeds value until the UI is validated |
| Person detail pages | An empty person page is worse than no page; ships with 4.4 |
| Accounts, stored responses | Spec non-goal. Permalink is the distribution mechanism |
| Scheduled refresh | Spec scope: snapshot. Scripts kept clean so 4.8 is cheap |
| Org coordinates | Spec §7 wants revealed-evidence positions. Which agenda an org works on is a *different* judgement from where it sits on 17 axes, and only the first is done. All org coordinates are null and drop out of matching |
| Secondary x-y results view | Spec §11.3 wants it toggleable. The primary bar view is the load-bearing one; the plane is a convenience and can wait |

---

## Running it

```
npm install
npm run ingest      # rebuilds data/derived/ from data/raw/ + data/classification/
npm run verify      # acceptance criteria + calibration; exits non-zero on failure
npm run dev
```

`npm run verify` is the gate. It checks the spec §18 criteria that silently stop holding — the
abstain-versus-unsure distinction is one `?? 0` away from being false, and nothing about the UI
would look wrong if it broke.
