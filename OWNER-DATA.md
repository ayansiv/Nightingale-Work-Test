# Owner-supplied data

**What this is.** Build Spec §16 lists what the owner supplies and says the build must not block on
any of it. This document is the collection list: every item, what it feeds, what the app currently
does without it, and, where we could reach a defensible number, a working estimate the owner can
accept, correct, or override.

**How to read the estimates.** Every one states its method and its confidence. The house rule is the
one from spec §17: a cell reading *"estimated, method: X"* is doing the work the product exists to
do. Where we could not reach a defensible number we say so and leave a null; the app renders nulls
as "not collected", never as zero, and a null axis drops out of matching rather than being centred.

**Status at a glance.**

| | count |
|---|---|
| Items requiring owner input | 13 |
| Blocking the build | 0 |
| Shipped with a defensible estimate | 5 |
| Shipped with a structural placeholder | 4 |
| Shipped as an explicit, enumerated gap | 3 |
| Resolved since first draft | 3 (OD-09 in part, OD-10 in part, OD-11 requirement B) |

Every item loads from a file. `npm run verify` passes today with all of them in their current state.

---

## What the ingest spike already answered

Spec §15 step 1 says to confirm the role feeds parse **and** check whether Shallow Review agenda
pages consistently carry the assumptions field, because §6 depends on it. Both were checked before
any UI was written. Results:

| check | result |
|---|---|
| 80k job board parses | Yes. 857 vacancies, 646 AI-relevant across 248 organizations. |
| Shallow Review agendas parse | Yes. 79 rows; 5 are lab entries and become organizations, leaving **74 technical agendas**. |
| `theory_of_change` present | **73 / 74** (99%) |
| **assumptions present** (`orthodox_problems`) | **59 / 74** (80%) |
| `estimated_ftes` present | 63 / 74 (85%) |
| `target_case` present | 74 / 74 (100%) |

**The assumptions field is not only present, it is a closed vocabulary.** Every agenda draws from
the same **12 canonical orthodox problems**. That collapses the §6 workload from 74 agendas × 17
axes ≈ 1,258 hand judgements to 12 problems × 17 axes, plus 8 family priors and two small enum maps
, roughly 40 judgements, each auditable, each with a written rationale that renders in-product next
to the coordinate it produced.

So **agenda coordinates did not fall back to owner-assigned.** They are derived, and the day's plan
stands as the spec hoped. The full derivation is `data/config/derivation.json`.

One parsing trap worth recording: two vocabulary entries contain literal commas ,
`"A boxed AGI might exfiltrate itself by steganography, spearphishing"` and
`"Fair, sane pivotal processes"`, so `split(',')` shreds them into fragments matching nothing.
The parser tokenizes longest-entry-first against the vocabulary instead.

---

## OD-01, Axis weights `w_k`

**Feeds:** the distance metric in every match. **File:** `data/config/axes.json` → `weight`.
**Status:** shipped with a defensible default. **Confidence:** medium.

Spec §5 says only that "weights are unequal and live in config" and that "the misalignment chain
axes carry the most". We set them from that instruction plus the structure of the spec itself:

| tier | weight | axes | why |
|---|---|---|---|
| chain | 1.6 | `p_mis`, `p_scheme`, `containment` | The spec names these as carrying the most. |
| high | 1.3–1.4 | `internals`, `accident_deliberate`, `constraint`, `inside_outside`, `restraint_capacity` | Each routes to a different family of work on its own. |
| mid | 1.1–1.2 | `labs`, `domestic_intl`, `patch_rebuild`, `automation` | Real routing power, narrower scope. |
| low | 0.7–0.9 | `timelines`, `takeoff`, `futures`, `patienthood`, `venue_access` | Peripheral to placement, or thinly covered on the target side. |

`timelines` and `takeoff` are deliberately **low**, which is counterintuitive and worth a decision.
They dominate public argument but do comparatively little routing work: almost every agenda is
pursued by people with a range of timelines. Weighting them high would make the matcher sort by the
most-discussed axis rather than the most-discriminating one.

**What the owner should do:** these are one number each in one file. Changing them requires no code
change, and `npm run verify` re-runs the calibration afterward.

---

## OD-02, FTE and funding figures ⚠️ **the one that needs a judgement call**

**Feeds:** both data tables, and any neglectedness claim.
**File:** `data/derived/agendas.json` → `fte_2025`, `fte_share_of_field`.
**Status:** shipped with a defensible estimate **and a documented contradiction**.
**Confidence:** high on ordering, **low on level**.

Two independent measurements of the same field disagree by roughly 3×:

| source | measures | figure |
|---|---|---|
| Shallow Review 2025, summed over 74 agendas | anyone doing any work on an agenda | **1,142 – 3,172** (sum of low bounds – sum of high bounds); midpoints sum to **2,157** |
| AI Safety Field Growth Analysis 2025 | staff at dedicated AI safety organizations | **620 – 645** technical FTEs across 68–70 orgs |

**We checked the obvious explanation and it does not account for it.** Double-counting is real but
small: a researcher appears against **1.28 agendas on average**, which cannot produce a 3× gap. Even
the *sum of Shallow Review's low bounds* (1,142) is nearly double the field-wide *high* estimate.

The likelier explanation is that they measure different populations. Shallow Review counts
part-time lab researchers and academics working on an agenda; the Field Growth Analysis counts
organizational headcount and states plainly that it undercounts academia and frontier companies.
Both are probably right about their own population.

**What we did instead of picking one.** We publish the source's own range and midpoint, and add
`fte_share_of_field`, each agenda's share of summed field effort. Share is **scale-invariant**, so
it survives the disagreement intact, and share is what a neglectedness argument actually needs. The
technical table sorts by share by default and says why. The level is shown but flagged.

**What the owner must decide:** whether to (a) ship both figures with the discrepancy visible, as
now; (b) adopt one source as canonical and restate the other as a check; or (c) commission a
reconciliation. We recommend (a), the disagreement is itself informative about how well this field
knows its own size, and hiding it would be the one move inconsistent with the product's premise.

**Funding figures are a separate, unfilled gap.** Shallow Review names funders per agenda (62/74
rows) but publishes no dollar amounts, so `funding_philanthropic_usd` is null on every agenda.
Field-level anchors we found, for scale: annual technical AI safety spending is commonly put near
**$46–50M**, with Open Philanthropy / Coefficient Giving dominant (a **$40M** technical RFP in 2025,
~$336M cumulative since 2017). We did **not** distribute that across agendas, there is no defensible
allocation key, and inventing one would produce 74 fabricated numbers wearing a source's clothing.

---

## OD-03, Named researcher coordinates, with citations ⚠️ **largest remaining gap**

**Feeds:** the researcher overlay on the axis plot, a distinctive feature, currently inert.
**File:** `data/seed/people.json`. **Status:** roster shipped, **zero coordinates shipped**.

Spec §7 sets three rules: cite per coordinate, date every position, label as *"as expressed in X,
dated Y"*, never "believes". We enforced these structurally rather than by convention, and the
consequence is that **no person ships with a coordinate**.

**What we do have, and it is worth more than it sounds:** 408 named researchers, extracted from the
Shallow Review's `some_names` field, already linked to the agendas they appear against. The roster
is sourced. What is missing is the step from *"named against an agenda"* to *"holds this position on
this axis"*, and that step needs a dated citation per coordinate, which we will not fabricate.

**The worklist, ordered by leverage** (`pending_placements` in the file):

| person | axes | why this one first |
|---|---|---|
| **Neel Nanda** | `internals` | The spec's own teaching artifact: the same person argues **both poles** at different confidence levels, the LessWrong research-mindset piece and the 80,000 Hours interview. Far more persuasive to a newcomer than an outsider's critique. Needs **two** dated placements, not one. |
| **Joe Carlsmith** | `p_scheme`, `patienthood`, `futures` | Named in the source notes as the paradigm case of individual-versus-employer divergence. Publishes under his own name on exactly the axes with the weakest agenda-level coverage. |
| Rohin Shah | `internals`, `containment`, `labs` | Second clean house-view-versus-individual case. |
| Jacob Steinhardt, Jack Lindsey, Stephen Casper | various | Each appears against five agendas; high routing leverage. |

Six people × 2–3 axes ≈ **15 dated citations** makes the overlay live. That is an afternoon, and it
is the highest-value afternoon on this list.

Also needed: the correction-path address (spec §7, "ship a visible correction path"). One string,
currently empty.

---

## OD-04, Organization agenda tags and maturity tiers

**Feeds:** every role's inherited tag, and therefore most of browse.
**File:** `data/classification/orgs.csv`. **Status:** **146 organizations tagged by the build.**
**Confidence:** stated per row.

Spec §10 calls this "the only hand-tagging in the system" and assigns it to the owner. We did it
rather than shipping an empty file, because nothing downstream works without it, but every row
carries a `confidence` column so review can be triaged rather than exhaustive:

| confidence | rows | meaning |
|---|---|---|
| high | 57 | the organization's public identity **is** this agenda |
| medium | 35 | clear primary, real spread across secondaries |
| **low** | **26** | **inferred from thin evidence, review these first** |
| (blank) | 28 | field-building, grantmakers and infrastructure: deliberately untagged, see below |

Maturity tiers: 73 established, 64 new entrant, **9 structurally understaffed**. That last tier is
a claim, not a size: it means the remit is visibly larger than the headcount can serve. We applied it
to NIST/CAISI, the EU AI Office, congressional offices, and single-issue advocacy orgs.

**Resolved since the first draft.** Field-building organizations used to be untagged, and every role
at them carried `cross_agenda: true`, 81 roles labelled *"open to any agenda"*. Only **10** of those
were actually cohort programmes. The rest were ordinary jobs: an operations manager at Constellation,
an engineer at Lightcone, a grants associate at Coefficient Giving. The label hid 71 real jobs behind
a non-answer and diluted itself for the cases where it was true.

Field building is now a third domain (`data/seed/meta-agendas.json`) with three categories, talent
pipelines, grantmaking, and community/infrastructure. Those roles inherit normally; *"open to any
agenda"* is reserved for Fellowship, Internship and Course positions. It carries **no coordinates and
is not ranked** against quiz answers: running a fellowship programme does not commit you to a view
about scheming, so scoring it would be inventing a signal.

**Also fixed by hand:** LawZero was `new_entrant`, which reads as small-and-unproven for a
well-resourced institute with a senior team. Now `established`.

**Coverage honesty:** **130 of 248** organizations on the board are tagged. The untagged 118 are a
long tail of one- and two-role organizations, only two have more than two openings (Amodo Design,
Apple). Their **121 roles** show in browse but cannot be matched, and say so.

---

## OD-05, Philanthropic funding per agenda

**Feeds:** the technical table's funding column. **Status:** null on all 74. **See OD-02.**

Shipped as `placeholder` with the method string explaining that Shallow Review names funders but not
amounts. Renders as "not collected". Related and load-bearing: `lab_coverage` is `unknown` on every
agenda, and spec §13.2 makes it the reason low philanthropic funding must not be read as
under-resourced. **Setting `lab_coverage` is cheaper than setting funding and matters nearly as much**
, four values, 74 rows, and it defuses the worst misreading of the table.

## OD-06, Government attention per policy lever

**Feeds:** the policy table's separate government column. **Status:** null on all 12.

Spec §9 is emphatic that this is *a different quantity*, it measures the size of the problem, not
the size of the safety response. The column ships visible and empty rather than hidden, with that
sentence rendered in the cell, because an absent column is invisible and an empty one is a request.

---

## OD-07, Policy lever set and coordinates

**Feeds:** the entire policy half of the matcher. **File:** `data/seed/policy-levers.json`.
**Status:** **12 levers seeded with full coordinates.** **Confidence:** medium, all `assigned`.

Spec §6: "Policy levers have no equivalent source. Owner assigns, flagged as assigned." Every
coordinate here carries `kind: "assigned"` and a written rationale, and the UI renders assigned
differently from derived so a reader is never misled about which is which.

The set is seeded from the 80,000 Hours US AI policy landscape's own enumerated policy tools, and
the five institution types come from the same article with its notes on partisan exposure and career
capital carried through.

Two placements are worth the owner's specific attention because they encode a strategic view:

- **`pol_state_capacity`** is set to `venue_access: −0.6`, deliberately the lever that stays open to
  someone unwilling to foreclose partisan options. This is the lever `disclaimer_government_a` is
  written about, and the two should agree or both should change.
- **`pol_public_narrative`** is set to `constraint: −0.8` and `venue_access: +0.5`: advocacy only
  makes sense if political will rather than technical knowledge is what is missing, and advocacy that
  never takes a side tends not to move anything. Both are contestable and both are visible.

---

## OD-08, Framing text per pole

**Feeds:** the entry reading surface and every axis page. **File:** `data/content/readings.json`.
**Status:** **sources complete, frames empty.**

Spec §12 splits this cleanly: "Owner writes a two-sentence frame per pole; the sources below carry
the argument." The sources are transcribed in full, 17 axes, both poles, every item from the spec's
reading list, including the curriculum-bias warning which ships in-product.

The **34 two-sentence frames** are the owner's. Where one is missing the UI prints *"Framing not yet
written, the sources below carry the argument in the meantime"* rather than collapsing the section,
so the gap is visible to the owner and non-fatal to the reader.

Two things carried through deliberately:
- The `internals` axis has a **teaching note** rendered above both poles, saying that both sides are
  argued from inside interpretability and one of them by the same person at different confidence
  levels. Spec §12 says "use it", so it is used.
- Most sources have **no URL**. The spec supplies titles and publishers; resolving links is
  mechanical but must be done by hand to avoid citing the wrong piece, so they render as text.

**Also owner-supplied:** the **default / house view** (spec §16), currently absent. Spec §11.3 wants
it attributed to a person, not to the data. Until it lands, the results page overlays only agendas
and levers.

---

## OD-09, Loading validation, and the single-item axes ⚠️ **partly resolved**

**Feeds:** every axis score. **File:** `data/config/questions.json`.
**Status:** **two defects fixed by calibration; two axes hardened; one issue remains open.**

The source notes say loadings are unvalidated and suggest scoring a few well-documented researchers
to catch sign errors. We ran the analogous check against **agendas** whose positions are derivable
from first principles (`data/config/calibration.json`, run by `npm run verify`). It earned its place
immediately:

1. **Seven inverted `patch_rebuild` signs.** The axis runs low = *"make current systems safe"* to
   high = *"design new ones"*; several family priors had been written as if it ran the other way.
   The symptom was Agent foundations, the paradigm rebuild agenda, landing at **+0.10**,
   essentially neutral on architecture. Now +0.63.
2. **Debate deriving as internals-positive.** Debate lists *"Superintelligence can fool human
   supervisors"* among its assumptions, but as **the problem it attacks**, not as a claim that
   assurance therefore requires interpretability. This is a general hazard in deriving beliefs from
   stated assumptions and it will recur. Fixed by making a family prior authoritative on the axis
   that defines the family, so an assumption can move a magnitude but not flip a defining sign.

### A third defect, found later: two inverted question loadings

The agenda fixtures check the *derivation*. They cannot catch a question whose loading is
backwards, because the question never enters that path, so **q20 and q21 shipped with their
`patch_rebuild` loadings inverted** against the axis, which runs low = *make current systems safe*
to high = *design new ones*. Both came straight from spec §3 and were transcribed without
checking.

Live effect: anyone who agreed that formal guarantees are worth pursuing was routed **away** from
Guaranteed-Safe AI and toward the behavioural agendas, the exact opposite of what they asked for.

Fixed, and the gap that let it through is closed: `calibration.json` now carries **respondent
fixtures** that score a synthetic answer set and assert what it should rank. They check families
rather than named agendas, because the Theory family alone holds nine agendas a formalist would be
happy with. A formalist must reach Theory and Safety-by-construction and must not reach Black-box
safety; the empiricist is the mirror image. If either loading flips again, both fail.

### The single-item axis problem, measured

Spec §5 calls smooth degradation *"the main benefit of having more questions than axes"*, but the
property did not hold for five axes that rested on one question each. Two of them were the worst
possible candidates:

| axis | scope | weight | targets with a value |
|---|---|---|---|
| `restraint_capacity` | policy | **1.3** | **12/12 levers** |
| `inside_outside` | policy | **1.3** | **12/12 levers** |

Highest-weighted policy axes, and the only ones every lever has a value on, so they carried the
policy match, each on a single item. Measured, on one user with one abstention:

```
all answered       -> Misuse prevention    83.7   5 axes used
skips Q23 only     -> Testing & standards  90.3   4 axes used   <- top answer changed
skips Q15 (3-item) -> Misuse prevention    83.7   unchanged     <- control
```

One skipped question changed the top-ranked policy lever. Worse, **the score went up**, 83.7 to
90.3, because dropping an axis removes its disagreement from the numerator. To a reader 90 means
*better match*; it actually meant *we know less about you*.

### What we did

Added **q29** and **q30**, one reverse-scored item each for `restraint_capacity` and
`inside_outside`, interleaved into section F rather than clustered (spec §3's acquiescence-bias
rule). The quiz is now **30 questions**. Re-measured:

```
all 30 answered  -> Misuse prevention   83.7   rc 2/2  io 2/2
skips Q23 only   -> Misuse prevention   82.9   rc 1/2  io 2/2   <- top answer holds, score falls
skips Q24 only   -> Compute governance  82.6   rc 2/2  io 1/2   <- shifts, but score still falls
```

The axis now survives at half coverage and is down-weighted accordingly, and **the score moves in
the honest direction**. Single-item axes are down from five to three: `futures`, `automation`, and
`patienthood`.

Side effect handled: adding questions shifts the permalink encoding, which would have made old
links decode into *wrong* answers rather than failing. The version is bumped to **v2**, and `decode`
now refuses any body whose length does not match the question count, so a future forgotten bump
fails closed. Both are asserted in `npm run verify`.

### Still open, and it is your call

**The score still inflates whenever an axis drops out entirely**, visible above in the
skip-both-items case (90.3). This is not specific to these axes; it is a property of
`score = 1 − Σ(w·c·d)/Σ(w·c·2)`, which is the spec's own formula. Options:

- Leave it. "4 axes compared, 10 dropped as unknown" already renders beside the number.
- **Render the score as a band that widens as axes drop**, rather than a point. Honest, and it uses
  machinery the axis plot already has. *Our suggestion.*
- Suppress the numeric score below a coverage threshold and show rank only.

**The remaining three single-item axes are lower priority.** `futures` and `automation` are 0.9 and
1.1 weight with partial target coverage. `patienthood` has one question **and zero targets**, it
contributes nothing to any match today and will stay inert until OD-03 lands placements.

## OD-10, Role classification review queue

**Feeds:** browse and every agenda's role list. **File:** `data/derived/review-queue.json`.
**Status:** **all 646 AI-relevant roles classified.** **126 flagged for review.**

Per instruction, classification was done without an API key. It is a rule table
(`data/classification/signals.json`) of phrases mapped to agendas, constrained per spec §10 to each
organization's own agenda list. This is not merely a substitute for the model call, for a product
whose premise is that sourcing is content, a tag that names *the phrase it matched, in the role's own
words* is better than one no reader can check. It is also re-runnable and diffable in review.

The honest accounting, and the reason the review queue exists:

| tag strength | roles | what the tag actually claims |
|---|---|---|
| **strong**, from role content | 102 | a phrase in the role's own description named this agenda |
| **by design**, from the organization | 420 | the role sits at an org whose primary work is this agenda |
| **review queue** | **126** | research/policy role at a **multi-agenda** org where no phrase fired |
| untagged org | 121 | see OD-04 |
| cross-agenda | **10** | genuine cohort programmes only, down from 81 |

The 420 "by design" rows are not a failure, spec §10.3 mandates inheritance for operations,
recruiting, finance and legal roles and calls it load-bearing. But it is a **materially weaker claim**
than a content tag, and the UI renders the three differently everywhere they appear rather than
flattening them into one badge.

The 126-row queue is the real cost of the rule table, and it is finite and enumerated. Each row
lists the org, the title, the inherited tag and the candidate agendas. Resolving one means adding a
phrase to `signals.json` (if the pattern will recur) or a row to `role-overrides.json` (if it is a
one-off). Five overrides are already in place as worked examples.

## OD-11, Sensitivity tiers ⚠️ **scope narrowed; one half fixed**

**Feeds:** which theories of change are shown, generalised, or listed as omitted.
**Status:** disclaimer placement **fixed**; tier assignment still outstanding, but the exposure is
narrower than first stated.

Spec §13.7 is two requirements. We had only met one.

**Requirement A, tier-3 items are listed as omitted.** All 74 agendas ship as `sensitivity_tier: 1`,
so if any is genuinely tier 3 it is currently shown in full.

On inspection the risk is **narrower than "74 unreviewed agendas"** suggests, and the precise version
is more useful:

- **The 74 technical agendas quote `theory_of_change` verbatim from shallowreview.ai.** That text is
  already published. Republishing public text cannot leak anything, so tier 1 is very likely correct
  for all of them.
- **The 12 policy levers are the real exposure.** Those theories of change were written from scratch
  for this build, not quoted. `pol_power_concentration` and `pol_security_infosec` are the two where
  a stated mechanism could plausibly be sensitive.
- **Role-level theories of change are what the disclaimer is really about**, *"the reasons a role
  matters differ from an institution's stated priorities."* We hold no such data, so nothing is
  exposed and nothing is served.

So the review is **12 judgements, not 74**, and it is the policy levers that need eyes.

**Requirement B, ship `disclaimer_general` at the top of theory-of-change content.** We had it on
the entry page only, which is not what the spec asks. **Now fixed:** it renders on every agenda and
lever page directly above the theory of change, as a collapsed *"What this section does not say"* ,
the point at which a reader is deciding whether they are seeing the whole story. `sensitivityTier` is
now read from the data rather than assumed, so setting a 3 changes the page with no code change.

Still yours: whether any of the 12 levers should be tier 2 or 3. This remains the one placeholder
whose failure mode is worse than a blank cell, a blank says *"not collected"*, a wrong tier 1 says
*"this is the whole story."*

## OD-12, Government disclaimer variant

**Feeds:** the government-roles disclaimer. **File:** `data/content/caveats.json` → `config`.
**Status:** set to `a`, per spec §14. `disclaimer_government_b` ships empty, deliberately.

No action unless the owner's superiors choose the sharper variant, in which case: one string, one
flag. `npm run verify` asserts the default is `a` and that `b` is empty, so a half-finished switch
fails loudly.

## OD-13, What people in the field know that a listing does not say ⚠️ **empty by design**

**Feeds:** an `insider_note` line on every organization, on the Roles tab and on agenda pages.
**File:** `data/classification/orgs.csv`, column `insider_note`. **Status:** column added, **all 146
rows empty**.

This is the difference between someone who has been around the field for two years and someone
reading the job board for the first time: how selective a programme really is, what the work is
actually like day to day, which listing understates the role, who a place suits and who it does
not. None of it is on any website, and it is the single highest-value thing a reader could get
here that they cannot get from the 80,000 Hours board directly.

**We did not fill it, and will not.** Every other estimate in this document is defensible from a
public source, that is what makes the flags meaningful. Guessing at non-public facts about named
organizations would produce claims a reader has no way to check, attached to real institutions'
names, with the authority of everything around them. It is the one column where being wrong is
worse than being empty.

It renders as nothing at all when blank, no placeholder, no empty section, so partial coverage
looks like partial coverage rather than like a broken feature.

**Suggested shape**, one or two sentences, concrete:
- *"Takes ~4% of applicants; the bottleneck is research taste, not credentials."*
- *"The listing says 'operations' but it is closer to chief of staff."*
- *"Strong fit if you want breadth early; weak if you want to go deep on one agenda."*

**Where to start:** the 30 or so organizations with the most open roles, and the field-building
programmes, those are where a newcomer's model is furthest from reality and where the advice
changes their behaviour most.

---

## Recommended order

Ordered by value per hour, not by importance:

1. **OD-13, insider notes on the top ~30 organizations**, the highest-value thing here that a reader
   cannot get from the job board directly, and the only column we deliberately left blank.
2. **OD-03, six researchers × 2–3 axes**, an afternoon, and it activates a distinctive feature that is currently inert.
3. **OD-05, `lab_coverage` only**, four values × 74 rows, and it defuses the worst misreading of the funding column.
4. **OD-11, sensitivity tiers on the 12 policy levers**, twelve judgements, not 74. The technical
   agendas quote already-published text; the levers were written here.
5. **OD-08, 34 framing sentences**, the entry surface is the first thing a blank-slate user meets.
6. **OD-02 decision**, not data collection, a call: ship the discrepancy or resolve it.
7. **OD-04, the 26 low-confidence org rows**, triaged, not exhaustive.
8. **OD-09 decision**, how to present a match score when axes drop out. The two policy axes are
   already hardened; this is the presentation question, not the data one.
9. **OD-10, the 126-row queue**, mechanical, parallelisable, and the app is usable throughout.

Nothing above blocks anything below it, and the app runs end to end today with all thirteen in
their current state.
