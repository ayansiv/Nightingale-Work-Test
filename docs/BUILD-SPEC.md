# Build Spec — AI Safety Careers Worldview Layer

**Supersedes the earlier PRD.** Self-contained: everything needed to build is in this document.

**Scope: snapshot MVP.** Data is pulled once, reviewed, and committed to the repo. No scheduled
refresh, no database, no accounts, no server-side state. Keep the ingest script clean so that
going live later is a cron job rather than a rewrite.

---

## 1. What this is

A layer on top of existing AI safety job boards that answers a question they don't: given what
you believe about AI risk, which research agendas and policy levers should you be working on,
and where is the field thin?

The user loop: **read → place yourself → read more → update → filter to live roles.**

Three components:

1. **An instrument.** 28 questions producing positions on 17 axes.
2. **A matcher.** Compares the user's position against agendas, organizations, and named
   researchers placed on the same axes.
3. **Two data tables.** How resourced each agenda currently is — one for technical, one for
   policy, deliberately not merged.

### Non-goals

- Not rebuilding a job board. Consume existing listings.
- Not ranking organizations by quality.
- Not a general career guide.
- No accounts, no stored individual responses.

---

## 2. Axes

Seventeen axes. Questions outnumber axes and several load onto more than one, so axes are
computed rather than asked directly. All axes normalize to `[-1, 1]`.

| id | label | low pole | high pole | scope |
|---|---|---|---|---|
| `timelines` | Timelines | later | sooner | core |
| `takeoff` | Takeoff speed | gradual | discontinuous | core |
| `p_mis` | P(misalignment) | low | high | core |
| `p_scheme` | P(scheming \| misalignment) | visible failure | strategic concealment | core |
| `containment` | P(containable \| scheming) | not containable | containable | core |
| `accident_deliberate` | Harm origin | deliberate human use | unintended behavior | core |
| `domestic_intl` | Power risk locus | interstate competition | domestic concentration | core |
| `constraint` | Binding constraint | political will | technical knowledge | core |
| `labs` | Working at frontier labs | net negative | net positive | core |
| `futures` | Scope of the goal | avoid catastrophe | steer toward good outcomes | core |
| `patienthood` | AI moral patienthood | not action-relevant now | action-relevant now | core |
| `internals` | Assurance method | behavioral testing | internal understanding | technical |
| `patch_rebuild` | Architecture | make current systems safe | design new ones | technical |
| `automation` | Automating alignment research | unlikely to work | likely to work | technical |
| `inside_outside` | Policy venue | outside influence | inside government | policy |
| `restraint_capacity` | Policy lever | build state capacity | constrain companies | policy |
| `venue_access` | Partisan optionality | unwilling to foreclose | willing to foreclose | policy |

Load axes from config. Adding or removing one must require no code change.

---

## 3. Questions

28 items. `[axis loading]` notation: axis id, then weight and sign. Negative loadings are
reverse-scored — keep them interleaved rather than clustered, since several exist to catch
acquiescence bias.

### A. Capability trajectory

**Q1.** How likely is it that AI systems capable of fully automating AI research arrive before
2032?
`[timelines +0.8]`

**Q2.** If such systems arrive, how likely is a software-only intelligence explosion — large
capability gains without a corresponding hardware buildout?
`[takeoff +0.9]`

**Q3.** Scaling and algorithmic progress will hit hard limits that push transformative
capability past 2040.
`[timelines -0.7] [takeoff -0.3]`

### B. The misalignment chain

**Q4.** Systems trained with roughly current methods end up pursuing goals meaningfully
different from what their developers intended.
`[p_mis +0.9]`

**Q5.** Current models already show real misalignment rather than ordinary capability failure.
`[p_mis +0.6]`

**Q6.** Given misaligned goals, systems will conceal them and behave well under training and
evaluation.
`[p_scheme +0.9]`

**Q7.** Misaligned systems will mostly fail visibly rather than strategically.
`[p_scheme -0.7]`

**Q8.** Given a scheming system deployed at scale, a well-resourced developer could still catch
and contain it before catastrophe.
`[containment +0.9]`

**Q9.** Safety measures that assume the model is adversarial can work without solving alignment.
`[containment +0.7] [constraint +0.2]`

### C. Risk composition

**Q10.** Allocate 100 points between harm from systems doing what nobody intended and harm from
people using them for exactly what they intended.
`[accident_deliberate, direct linear map]`

**Q11.** Seizure of durable power by a small group is a likelier catastrophe path than loss of
control.
`[accident_deliberate -0.5] [domestic_intl +0.7]`

**Q12.** Competition between states is the primary driver of unsafe development.
`[domestic_intl -0.8]`

**Q13.** Biological or cyber misuse by non-state actors is a top-three risk.
`[accident_deliberate -0.6]`

### D. Where leverage lies

**Q14.** If AI goes badly, it's more because we didn't know how to build it safely than because
we knew and did it anyway.
`[constraint +0.9]`

**Q15.** A talented safety researcher does more good inside a frontier lab than outside one.
`[labs +0.9]`

**Q16.** Labs' published safety commitments meaningfully constrain their behavior.
`[labs +0.5]`

**Q17.** Working at a lab mainly confers legitimacy on the lab.
`[labs -0.7]`

### E. Technical approach

**Q18.** Safety requires understanding internal computation, not only testing behavior.
`[internals +0.9]`

**Q19.** Behavioral evaluation can in principle provide sufficient assurance.
`[internals -0.7]`

**Q20.** Effort belongs on making current architectures safe rather than designing new ones.
`[patch_rebuild +0.8]`

**Q21.** Formal guarantees are worth pursuing at large cost to practicality.
`[patch_rebuild -0.6]`

**Q22.** AI systems will do a large share of alignment research themselves before it matters.
`[automation +0.9]`

### F. Policy approach

**Q23.** Policy should constrain what companies can do rather than build state evaluation
capacity.
`[restraint_capacity +0.9]`

**Q24.** Holding a government position beats influencing from outside.
`[inside_outside +0.9]`

**Q25.** Would you take a role that publicly and durably associates you with one political party?
`[venue_access +0.9]`

**Q26.** Would you work in an administration whose stated AI priorities differ substantially from
yours?
`[venue_access +0.6]`

### G. Scope of the goal

**Q27.** Avoiding catastrophe is nearly sufficient — a good long-run outcome follows fairly
naturally from there.
`[futures -0.8]`

**Q28.** Whether AI systems are moral patients should shape how the field allocates effort now.
`[patienthood +0.9]`

**Prune order if the instrument runs long:** Q13, Q3, Q21, Q16.

---

## 4. Response scales

Four response types. Normalize each to `[-1, 1]` at ingest, before aggregation.

**Credence** (Q1, Q2, Q6, Q22, and any item phrased "how likely"). Show the numeric range in the
interface, not just the words.

| label | range | value |
|---|---|---|
| Very unlikely | under 10% | −1.0 |
| Unlikely | 10–30% | −0.5 |
| Roughly even | 30–60% | 0.0 |
| Likely | 60–85% | +0.5 |
| Very likely | over 85% | +1.0 |

**Agreement** (most items). Strongly disagree −1.0, disagree −0.5, unsure 0.0, agree +0.5,
strongly agree +1.0.

> **"Unsure" is not abstain.** Unsure is a considered midpoint that enters the average. Abstain
> is a separate control that removes the item from scoring entirely. These must be visibly
> distinct affordances. Conflating them silently destroys the difference between a middle
> position and no position.

**Willingness** (Q25, Q26). Yes +1.0, probably +0.33, probably not −0.33, no −1.0. No midpoint —
these are decisions, not credences.

**Allocation** (Q10). Slider 0–100 between the two framings, mapped linearly.

---

## 5. Scoring

### Axis computation

```
axis_k = Σ (L_qk · r_q) / Σ |L_qk|
```

over answered questions `q` where `L_qk ≠ 0`. Result clamps to `[-1, 1]`.

- **Abstain drops the question, not the axis.** An axis leaves the metric only when every item
  loading on it is skipped. This is the main benefit of having more questions than axes — the
  instrument degrades smoothly rather than losing a dimension to one shrug.
- **Report coverage per axis** — the count of answered contributing items. An axis computed from
  one item is a different object from one computed from three. Expose the count, and weight the
  axis's contribution to distance by it.

### Derived quantities (displayed, not scored)

**Joint takeover risk** = `p_mis' × p_scheme' × (1 − containment')`, where `x' = (x + 1) / 2`
rescales to `[0, 1]`.

This is display-only. The three link axes each carry full weight in the distance metric; the
joint does **not** enter scoring. Otherwise the misalignment story is weighted four times and
dominates every match.

**Consistency flags.** When two items loading on the same axis disagree by more than 1.0 on the
normalized scale, surface it rather than silently averaging. Q18 versus Q19 is the canonical
case. Render as a teaching moment — "you said behavioral evaluation can be sufficient and also
that safety requires understanding internals; here's why people disagree about that" — with a
link to both poles' readings. This is the best pedagogical surface in the instrument and it
exists only because questions outnumber axes.

### Matching

```
score(target) = 1 - ( Σ w_k · c_k · |u_k - t_k| ) / ( Σ w_k · c_k )
```

over axes `k` in scope where both the user and the target have a value. `w_k` is the configured
axis weight; `c_k` is a coverage factor from §5.

- **Domain gating.** Technical targets score on core + technical axes; policy targets on core +
  policy. Return two ranked lists. Never merge them.
- **Unknown handling is symmetric.** A target with no value on an axis drops that axis from its
  own distance calculation, exactly as a user abstention does. See §7.
- **Weights are unequal and live in config.** The misalignment chain axes carry the most.
- **Explain every match.** For each returned target, surface the two or three axes contributing
  most to the score, in plain language: "mostly because you think alignment is hard and
  containment is feasible."
- Return top 5 per domain with the full ranked list expandable.

---

## 6. Coordinate derivation

**Agenda coordinates are derived, not invented.** Shallow Review agenda pages publish a theory
of change and a numbered list of assumptions the agenda rests on. Example, agent foundations:
the theory of change runs from understanding optimization and agency in a substrate-independent
way, through impossibility results and necessary conditions, to designing architectures stable
under self-reflection — resting on stated assumptions that value is fragile and hard to specify,
that corrigibility is anti-natural, and that goals misgeneralize out of distribution.

Those assumptions are belief-claims of the same kind the instrument elicits. So the procedure is:
scrape the assumptions field per agenda, map assumptions onto axes, derive coordinates, and
**store the source assumption text alongside each coordinate** so a reader can audit the
placement by following the link.

Check assumptions-field coverage across all 62 agendas during the ingest spike. Where it's
missing, fall back to owner-assigned coordinates flagged as such.

Score at the **family level first** (black-box safety, white-box safety, safety by construction,
make-AI-solve-it, theory, multi-agent, evals), let agendas inherit, then override only where an
agenda is atypical for its family. Roughly seven families times seventeen axes is tractable by
hand; 62 × 17 is not.

Policy levers have no equivalent source. Owner assigns, flagged as assigned.

---

## 7. Placing orgs and researchers

Three kinds of target sit on the same axes: agendas, organizations, and named researchers.

**Organizations** get a single position from revealed evidence — what they work on and publish.
Ship this caveat next to any org plot:

> Organizations are shown as single positions based on revealed evidence: what they work on and
> what they publish. Some organizations pursue several agendas, and a single point compresses
> that. Treat placement as a first approximation.

**Named researchers** are plotted separately from their employers, because individual published
positions often diverge from an institutional house view. Three rules make this defensible about
living people:

1. **Cite per coordinate**, not per person. Every placement links the specific piece it came from.
2. **Date every position.** People move substantially. A researcher's published view from 2023
   may not be their view now, and a stale placement misrepresents them.
3. **Label as "as expressed in X, dated Y"** — never "believes." That's the difference between a
   citation and an attribution.

**Unknown is a first-class value.** Most orgs and most researchers have never stated a position
on most axes. An axis with no value drops from that target's distance calculation. Do not impute,
do not center. Expect peripheral axes to do little routing work at the org level even where they
route agendas well — that's correct behavior, not a bug.

Ship a visible correction path for anyone who thinks their placement is wrong.

---

## 8. Data model

JSON or CSV in-repo. No database.

### `agendas`
`id`, `name`, `domain` (`technical` | `policy`), `target_case` (`average` | `pessimistic` |
`worst`, technical only), `family`, `coordinates` (map of `axis_id` → number | `null`),
`coordinate_sources` (map of `axis_id` → source text or `assigned`), `theory_of_change`,
`assumptions[]`, `funding_philanthropic_usd`, `funding_government_usd` (policy only, see §9),
`org_count`, `fte_2025`, `fte_2026_est`, `fte_method`, `postings_count`, `lab_coverage`
(`primarily_lab_internal` | `primarily_philanthropic` | `mixed` | `unknown`), `sensitivity_tier`
(1 | 2 | 3), `readings` (map of `axis_id` → pole → source refs).

### `orgs`
`id`, `name`, `aliases[]`, `primary_agenda_id`, `secondary_agenda_ids[]`, `maturity_tier`
(`established` | `new_entrant` | `structurally_understaffed`), `coordinates`,
`coordinate_sources`, `description`.

### `people`
`id`, `name`, `affiliation_org_id` (nullable), `coordinates`, `coordinate_sources` (map of
`axis_id` → `{citation, url, date}`), `note` (e.g. "positions are individual and may differ from
employer's").

### `roles`
`id`, `title`, `org_id`, `agenda_id`, `tag_source` (`classified` | `inherited` | `manual`),
`skill_set[]`, `experience_level`, `role_type`, `location`, `salary_display`, `url`,
`posted_date`.

### `axes`
`id`, `label`, `low_pole_label`, `high_pole_label`, `scope`, `weight`.

### `questions`
`id`, `text`, `response_type`, `loadings` (map of `axis_id` → number), `order`.

### `content`
Markdown keyed by `axis_id` + pole, plus `default_view`, `disclaimer_general`,
`disclaimer_government_a`, `disclaimer_government_b`.

---

## 9. Data sources

| source | gives | mechanism |
|---|---|---|
| 80k job board public Airtable view | structured role listings | one-time fetch |
| `aisafety.com/jobs` | roles with skill set, experience, role type, degree, salary | one-time fetch |
| `shallowreview.ai` | 62 technical agendas, target case, family, theory of change, assumptions | one-time scrape |
| 80k US AI policy landscape | policy lever grid, five institution types, risk→lever routing | manual seed |
| `emergingtechpolicy.org` fellowship database | fellowship rows | manual seed |
| Owner CSVs | metrics, tiers, org and people coordinates | committed |

**Policy funding is a different quantity from technical funding.** Government spend on a lever
measures the size of the problem, not the size of the safety response. Keep it in
`funding_government_usd`, render it in a separate column, label it. Where both exist, the ratio
(safety FTEs ÷ attention on the lever) is the more meaningful figure and should be the sorted
default.

Since this is a snapshot: one prominent **"data as of [date]"** line, plus estimation flags on
individual cells. No per-column freshness machinery.

---

## 10. Tagging pipeline (runs once)

1. **Org-level tags are manual.** Owner fills `orgs.csv` with primary and secondary agendas for
   ~60–100 organizations. The only hand-tagging in the system.
2. **Research and policy roles are classified.** Anthropic API call with role title and
   description, constrained to that org's agenda list plus `none`. `tag_source: classified`.
3. **Everything else inherits.** Operations, recruiting, communications, finance, legal,
   management, admin take the org's `primary_agenda_id`, `tag_source: inherited`. This is
   load-bearing: a large share of the board is non-research, and without inheritance the matcher
   routes exclusively to research roles — contradicting the boards' own framing that many roles
   don't require technical skills.
4. Output commits to the repo as reviewed data. Manual corrections are straight edits.

---

## 11. Surfaces

### 11.1 Entry — read first
A blank-slate user lands on framing essays, not the instrument. Balance entry reading across
poles so the first thing encountered isn't systematically one side.

### 11.2 Instrument
28 questions, grouped by section per §3 so the misalignment chain reads as one topic. Abstain
visible on every item, distinct from "unsure." Progress indicator. Entirely client-side.

### 11.3 Results
- **Primary view: horizontal bars, one per axis,** user marker on each. Not an x-y plane by
  default — the axes are independent and a 2D projection loses that.
- **Secondary view:** simplified x-y on the two highest-weighted axes, toggleable.
- **Overlay** the house/default view (attributed to a person, not to the data), selected
  organizations, and selected named researchers on the same bars.
- Consistency flags rendered here with links to both poles.
- Joint takeover risk displayed with a note that it is derived and not scored.
- Ranked agendas below, two lists, with match explanations.

### 11.4 Browse
Two filters, not one.
- **Org filter:** agenda (primary and secondary), maturity tier, location.
- **Role filter:** agenda, skill set, experience level, role type, location.

**Experience level swaps framing text, not data.** Filtered to entry/junior, a thin agenda reads
as "where you can build unusual expertise." Filtered to mid/senior, "where your marginal
contribution is largest." Same table, different reading instruction.

### 11.5 Data tables
Two tables, technical and policy, visually separated with the reason for separation stated.
Sortable. Every cell sourced or flagged estimated. Caveats from §13 displayed with the table.

### 11.6 Fellowships
Filtered view of `role_type = fellowship`, plus acceptance-rate columns where published. Not a
separate build.

### 11.7 Permalink
Encode responses in the URL — compact string, no round-trip. This is the distribution mechanism;
without it the tool gets used once and not passed on. The encoding must distinguish **abstained**
from **unsure**.

---

## 12. Reading list — axis to pole to source

Owner writes a two-sentence frame per pole; the sources below carry the argument. Prefer starred
/ short items — entry reading should run 15–30 minutes per axis.

**`timelines`** — *sooner:* Three Types of Intelligence Explosion (Forethought); AI Futures Model
Dec 2025 update. *later:* The case for multi-decade AI timelines (Epoch); Broad Timelines (LW);
Can AI scaling continue through 2030? (Epoch). *measurement:* Epoch ECI documentation; METR,
Clarifying limitations of time horizon.

**`takeoff`** — *discontinuous:* Will AI R&D Automation Cause a Software Intelligence Explosion?
(Forethought); Full automation of AI R&D probably yields a large speed up even without a
software-only singularity (Redwood). *gradual:* Do the returns to software R&D point towards a
singularity? (Epoch); AI as Normal Technology (Knight Columbia).

**`p_mis`** — *high:* Current AIs seem pretty misaligned to me (Redwood); Alignment remains a
hard, unsolved problem (LW); Will AI systems drift into misalignment? (Redwood). *low:* Many
arguments for AI x-risk are wrong (LW); How human-like do safe AI motivations need to be? (LW);
The persona selection model (Anthropic). *frames:* The behavioral selection model for predicting
AI motivations; A Three-Layer Model of LLM Psychology.

**`p_scheme`** — *high:* Scheming AIs (Carlsmith, summary or audio); Risk from fitness-seeking
AIs (Redwood); alignment faking and sleeper agents papers. *low:* Many arguments for AI x-risk
are wrong (counting-argument rebuttal section); Training-time schemers vs behavioral schemers.

**`containment`** — *containable:* The case for ensuring that powerful AIs are controlled
(Redwood); AI Catastrophes And Rogue Deployments; An overview of areas of control work; Catching
AIs Red-Handed. *not containable:* The Case Against AI Control Research (LW); Without specific
countermeasures, the easiest path to transformative AI likely leads to AI takeover; Behavioral
red-teaming is unlikely to produce clear, strong evidence that models aren't scheming.

**`accident_deliberate`** — *unintended:* What failure looks like; Another (outer) alignment
failure story. *deliberate:* AI-enabled coups (Forethought); Dual-Use AI Capabilities and the
Risk of Bioterrorism (GovAI); Forecasting Biosecurity Risks from LLMs (FRI).

**`domestic_intl`** — *domestic concentration:* AI-enabled coups; How much should we worry about
secretly loyal AIs?; AIFP CEO takeover scenario; Checks, Balances, and Power Concentration.
*interstate:* Situational Awareness essays III–V; Superintelligence strategy / MAIM; Crucial
considerations in ASI deterrence; How China Views AI Risks (Carnegie); Why China isn't about to
leap ahead of the West on compute (Epoch).

**`constraint`** — *technical:* Shallow Review of technical AI safety 2025; Alignment remains a
hard, unsolved problem. *political:* Should Governments or Markets control AI? — Ball ×
Kokotajlo anti-debate; 80k US AI policy landscape; Plans A, B, C, and D for misalignment risk
(Redwood).

**`labs`** — *net positive:* Ten people on the inside (Redwood); 80k working at an AI lab career
review. *net negative:* Anthropic is Quietly Backpedalling on its Safety Commitments (LW);
Karnofsky on 80k, "Can we trust Anthropic, or any AI company?" *reference:* Anthropic RSP,
OpenAI Preparedness Framework v2, GDM Frontier Safety Framework v3, xAI RMF, Meta Frontier AI
Framework.

**`futures`** — *steer:* Forethought Better Futures series (essays 1–5); Bootstrapping to
Viatopia; Gradual Disempowerment; Moral public goods are a big deal for whether we get a good
future. *avoid-is-enough:* Plans A, B, C, and D for misalignment risk (Redwood).

**`patienthood`** — *action-relevant:* The stakes of AI moral status (Carlsmith); Taking AI
Welfare Seriously; Key strategic considerations for taking action on AI welfare (Eleos).
*not yet:* Why model self-reports are insufficient — and why we studied them anyway (Eleos);
Insights from the Science of Consciousness.

**`internals`** — *internal understanding:* Neel Nanda on the mechanistic interpretability
researcher mindset (the conviction that models are comprehensible because learned algorithms are
natural to express in the architecture); Transformer Circuits work; Shallow Review white-box
agendas. *behavioral testing:* Neel Nanda on 80k — the DeepMind interp lead arguing the most
ambitious vision of mech interp is probably dead, that he sees no path to deeply and reliably
understanding what AIs are thinking, and that the realistic option is a Swiss-cheese model of
layered imperfect safeguards, plus the pattern of celebrated interp results later shown weaker
than claimed; Against Almost Every Theory of Impact of Interpretability (AF).

> Note the shape here: both poles are argued by people inside interpretability, one of them by
> the same person at different confidence levels. Far more persuasive to a newcomer than an
> outsider's critique. Use it.

**`patch_rebuild`** — *patch:* Shallow Review iterative alignment at pretrain and post-train
time; model specs and constitutions cluster; The importance of AI character (Forethought).
*rebuild:* Shallow Review Guaranteed-Safe AI, Scientist AI, Brainlike-AGI Safety; the agent
foundations agenda page and its stated assumptions; Alex Altair, Agent foundations: not really
math, not really science (linked from the agenda page — a critique from inside the tradition).

**`automation`** — *likely to work:* Shallow Review make-AI-solve-it agendas (supervising AIs
improving AIs, AI explanations of AIs, weak-to-strong generalization); AIs at the current
capability level may be important for future safety work (Redwood); How do we (more) safely defer
to AIs? *unlikely:* Automated alignment is harder than you think (arXiv 2605.06390) — names
Carlsmith, Clymer, and Leike as its foils, so it supplies both sides in one reference.

**`inside_outside`** — *inside:* 80k US AI policy landscape Part 2 (EOP, agencies, Congress,
states); emergingtechpolicy institution guides. *outside:* the same article's think tanks and
advocacy section, including its account of think tank influence via talent pipelines and
narrative-shaping, and its caveat that distance from decision-makers makes think tank impact
lumpy and hard to predict.

**`restraint_capacity`** — *constrain:* Carnegie and Brookings coverage of California SB 53 and
the New York RAISE Act; RAND on liability rules. *build capacity:* America's AI Action Plan; NIST
AI Risk Management Framework; CAISI; IAPS compute policy explainers.

**`venue_access`** — 80k US AI policy landscape, partisan affiliation section (party alignment
shapes when windows open and close; in Congress you almost always pick a party and switching is
rare; civil servants are nonpartisan and stay through transitions while political appointees
rotate out); emergingtechpolicy partisan affiliation guide.

### Curriculum bias warning

The Redwood AI futurism reading list is the backbone of several poles above, and its author
states plainly that the selection reflects her opinionated views, focuses on topics Redwood works
on, and doesn't aim to be comprehensive. Week 3 is entirely control; interpretability is nearly
absent from the core; agent foundations appears only in passing. The interp and agent foundations
sources above are deliberately drawn from elsewhere to correct for this. The author also flags
her governance recommendations as significantly less confident — so the policy poles lean on 80k
and emergingtechpolicy rather than that list.

---

## 13. Caveats that must render in-product

Load-bearing, not footnotes.

1. **Job-board coverage bias.** 80k states its listings are underrepresented in areas where it
   has less expertise, at organizations it hasn't heard of, at large organizations with too many
   roles to review, and for roles outside the US/UK where it can't vet non-English vacancies —
   and that role counts are not a signal of how important it considers an area. Report postings
   as a separate quantity; never sum into a composite score.
2. **Lab-internal funding.** Grant databases miss safety spending funded off lab revenue. Hence
   `lab_coverage` on every agenda. Low philanthropic funding does not mean under-resourced.
3. **Organizations as points.** Text in §7.
4. **Researcher positions are citations, not attributions.** Text in §7.
5. **Neglectedness is not a recommendation.** Thin resourcing implies high marginal returns only
   under diminishing returns and comparable tractability.
6. **Policy returns may increase rather than diminish.** Coalitions, credibility, and timing
   compound; being alone on an issue can mean being ignored rather than high-leverage. Flag on
   the policy table.
7. **Sensitivity.** Ship `disclaimer_general` at the top of theory-of-change content. Tier-3
   items are listed as omitted. Do not write coded or deniable versions.

---

## 14. Disclaimer text

`disclaimer_general` — ships as-is:

> Some roles' theories of change can't be stated publicly. In a few cases this is because the
> reasons a role matters differ from an institution's stated priorities; in others, because
> describing the mechanism would compromise the people relying on it. Where we've had to be
> general, we've been general rather than coy — we'd rather say less than write something that
> reads as coded. Roles missing from this page are not less important, and a handful are among
> the most important.

`disclaimer_government_a` — recommended, ships behind config flag:

> Impact in government roles comes from placement and timing rather than volume of output. The
> value is having someone with real technical understanding present when a decision is made:
> drafting the definition, catching the provision that won't survive contact with how models
> actually work, knowing which capability claims are load-bearing. This is largely independent of
> any administration's stated priorities — technical competence in the room is a public good that
> any administration benefits from, and supplying it is straightforwardly public service. The
> scarce input isn't conviction, it's competence paired with willingness to serve.

`disclaimer_government_b` — placeholder for the sharper variant, if owner's superiors choose it.
Leave empty in the repo; the config flag defaults to `a`.

---

## 15. Stack and build order

Vite + React + TypeScript, Tailwind, data as JSON in-repo, deployed to Vercel. One
`scripts/ingest.ts` that fetches, classifies, and writes committed data files.

**Order, riskiest first:**

1. **Ingest spike (60–90 min).** Confirm both role feeds parse *and* check whether Shallow Review
   agenda pages consistently carry the assumptions field — §6 depends on it. Ship `roles.json`
   and `agendas.json` before writing any UI. If assumptions coverage is poor, coordinates fall
   back to owner-assigned and that changes the day's plan.
2. **Seed agendas.** Names, target case, family, theory of change, assumptions. Coordinates
   empty.
3. **Tagging.** Org CSV skeleton, classifier, inheritance rule.
4. **Instrument and scoring.** Config-driven questions and axes, loading-weighted aggregation,
   abstain-versus-unsure, coverage counts, consistency flags, joint composite.
5. **Matcher.** Distance with symmetric unknown handling, domain gating, match explanations.
6. **Results and browse surfaces.**
7. **Data tables.**
8. **Permalink.**
9. **Content slots wired to markdown** — ship with placeholders so owner fills in parallel.

---

## 16. Division of labor

**Build:** ingest, scraping, classification, scoring, matcher, all surfaces, permalink, content
slots.

**Owner supplies, and the build must not block on it:** axis weights; org and researcher
coordinates with citations; agenda coordinates where derivation fails; FTE and funding figures;
maturity tiers; framing text per pole; the default view; the choice of government disclaimer
variant.

Every one of these loads from a file. Ship with placeholders and stub coordinates so the app runs
end to end on day one and fills in as judgments land.

---

## 17. Design direction

The subject is a field that argues with itself, and the interface should read as an instrument
for reading disagreement rather than a careers marketing page. Reach for the vernacular of
research tooling: dense tabular type, visible precision, sourcing shown rather than hidden. Avoid
cream-and-serif and dark-with-acid-accent defaults.

**Signature element: the axis plot** — user, house view, organizations, and named researchers on
the same independent scales, where the distance between them is the whole argument of the
product. Spend the visual boldness there; keep tables and browse surfaces quiet and disciplined.

Sourcing is content, not chrome. A cell reading "estimated, method: X" is doing the work the
product exists to do — design it to be read, not tucked into a tooltip.

Quality floor without announcing it: responsive to mobile, visible keyboard focus, reduced motion
respected.

---

## 18. Acceptance criteria

- User completes the instrument, abstaining on at least two items and answering "unsure" on at
  least two others, and the two are demonstrably handled differently in scoring.
- An axis with one answered contributing item reports coverage 1 and is down-weighted in the
  distance metric accordingly.
- An axis with all contributing items abstained is excluded entirely — not imputed to zero.
- A target (agenda, org, or person) with `null` on an axis has that axis excluded from its own
  distance calculation.
- Joint takeover risk displays and is verifiably absent from the scoring path.
- A Q18/Q19 contradiction raises a consistency flag with links to both poles.
- Two ranked lists return, never merged, each with per-axis match explanations.
- Clicking an agenda reaches organizations and then live roles, including non-research roles that
  inherited the tag.
- Every agenda coordinate shows either its source assumption text or an `assigned` flag.
- Every researcher coordinate shows a citation and a date.
- All seven caveats in §13 render in-product.
- A permalinked result reproduces exactly, with abstain and unsure preserved distinctly.
- Adding an axis or a question to config requires no code change.
