# Design direction

Spec §17: *"The subject is a field that argues with itself, and the interface should read as an
instrument for reading disagreement rather than a careers marketing page."*

Four references were named. Each contributed something specific; this records what was taken, what
was left, and where the borrowing shows up in the code.

---

## 1. Our World in Data — source-forward explanation

**Taken: provenance is content, and it lives in the chart.**

OWID's stated principle is that the source is *always displayed prominently*, with deeper context
one interaction away via "Learn more about this data". The reason given is not aesthetic — it is
that the statisticians and institutions behind the numbers must be visible for the work to keep
being done.

That maps directly onto spec §17's own instruction: *"A cell reading 'estimated, method: X' is doing
the work the product exists to do — design it to be read, not tucked into a tooltip."*

So:

- **Every number carries a flag.** `sourced` / `estimated` / `placeholder` / `unknown`, rendered as
  a visible chip, never a colour alone.
- **Every method is one click, never a hover.** `EstimateCell` uses `<details>`, not `title`.
  Hover-only provenance is unreachable on touch and silent to a screen reader, which for this
  product means the primary content is missing.
- **Coverage is drawn, not written.** An axis resting on one answered item gets a visibly wider band
  behind the marker than one resting on three. Same information as the `coverage 1/3` label beside
  it, but readable at a glance.
- **Progressive disclosure, per view.** OWID's controls change with the tab rather than presenting
  everything at once. Browse shows role facets in the roles tab and org facets in the orgs tab —
  they are different objects and a merged filter bar would say otherwise.
- **Sortable headers with the sort reason stated.** The technical table defaults to *share of field
  effort*, and a sentence above it explains why that column and not headcount.

**Left:** OWID's map tab and its world-entity model. There is no geography here worth mapping, and a
choropleth of AI safety would be decoration.

## 2. LessWrong wiki-tags — concepts as navigational objects

**Taken: a tag page is a place, not a label.**

The FAQ's core claim is that tags give content longevity beyond its publication date, and that a tag
page is a hub — definition, everything tagged with it, and links into neighbouring concept space.

Two page types are built on that pattern:

- **Axis pages** (`/axis/:id`) are the reusable topic pages. Reached from entry reading, from a
  consistency flag on the results page, and from any pole label on any plot. Each carries the
  question, both poles with their reading lists, which agendas sit at each end, and links to every
  other axis. A concept lives here; it is not a footnote hanging off the results screen.
- **Agenda pages** (`/agenda/:id`) end with *"Neighbouring agendas in {family}"* — the wiki move of
  making the surrounding concept space reachable rather than leaving the reader at a dead end.

**Adapted, not copied:** LessWrong's *relevance voting* sorts posts on a tag page by collective
judgement of how central they are. There is no user base here to vote, so the analogous ordering
comes from the derivation itself: the axis page sorts agendas by their derived coordinate, and each
coordinate shows the contribution count that produced it. Same idea — ordering by strength of
association rather than alphabetically — with a sourced input instead of a crowd.

**Left:** editable wiki text. Everything here is derived from committed data, and a free-text layer
would immediately drift out of sync with the coordinates it sits beside.

## 3. Votely — the transition from personal coordinates to comparison

**Taken: the sequence, and the two-mode instrument.**

Votely's flow is answer → place → compare → read about where you landed, with a short quiz and a
long one. The short form converts; the long form is there for people who want it.

- **Both forms ship.** A 10-item short form covering the load-bearing axes, toggleable at any point
  without losing answers. Twenty-eight questions is a lot for someone whose actual goal is finding a
  job.
- **Personal position first, comparison second.** You see your own axis bars before anything is
  ranked against you. Overlays are opt-in through a dropdown, so comparison is a choice.
- **The permalink is the distribution mechanism**, exactly as Votely's shareable results are. Spec
  §11.7: *"without it the tool gets used once and not passed on."*

**Deliberately rejected: the 2D plane as the primary view.** Votely's signature is a rotatable cube
over three axes, and it is genuinely good. It does not transfer. Spec §11.3 is explicit that the
primary view must be horizontal bars, *"not an x-y plane by default — the axes are independent and a
2D projection loses that."*

That constraint is load-bearing rather than fussy. Two people can sit in the same place on the whole
misalignment chain and route to entirely different work because they differ on `internals` alone. A
plane over two axes would show them as the same point. The plane exists as a labelled secondary
toggle; it is never what you see first.

**Also rejected:** ideology *names*. Votely resolves you to one of 81 named ideologies, which is
satisfying and would be actively harmful here — a label like "control-pilled empiricist" would
become the thing people identify with instead of the position, and the field has enough of that.
Matches are ranked agendas with per-axis explanations, never a name.

## 4. Lightweight academic layout — theories of change, assumptions, limitations, citations

**Taken: the order, because it is the order a reader can check the argument in.**

Agenda pages run: theory of change → the assumptions it rests on → coordinates with their audit
trail → resourcing → who works on it → critiques → neighbours.

That ordering does real work. By the time a reader reaches a coordinate, they have already seen the
assumptions it was derived from, so the placement is checkable rather than asserted. Spec §6 wants
exactly this: *"store the source assumption text alongside each coordinate so a reader can audit the
placement by following the link."*

Also from the academic register:

- **Critiques are a section, not a rebuttal.** Carried through from the Shallow Review's own
  per-agenda critical commentary, positioned after the substance and before the neighbours.
- **Limitations are in the flow, not in a footer.** The seven §13 caveats render on the surfaces
  they apply to. `<Caveat>` **throws** on an unknown id, and `npm run verify` asserts that every
  caveat is rendered somewhere — a caveat that silently vanishes is worse than one never written.
- **Numbers carry their uncertainty inline.** "30 (10–50)" rather than "30", because those are
  different claims and a table that flattens them is lying quietly.

**Left:** serif type and a paper-column measure. Spec §17 rules out cream-and-serif explicitly, and
it is right to — it would read as an essay about the field rather than an instrument for reading it.

---

## The visual system

Spec §17: *"Reach for the vernacular of research tooling: dense tabular type, visible precision,
sourcing shown rather than hidden. Avoid cream-and-serif and dark-with-acid-accent defaults."*

| decision | value | reason |
|---|---|---|
| Ground | near-white `#ffffff`, sunk `#f7f7f5` | Reads as a working document, not a landing page |
| Ink | `#1a1a18`, muted `#5c5b56`, faint `#8a8985` | Three levels is enough; a fourth invites decoration |
| User marker | `#1c4ed8` | The only saturated colour on the page. It marks *you*, and nothing else |
| Overlays | amber `#b45309`, teal `#0f766e` | Distinguished by **shape as well as colour** — diamond and square — so colour is never the sole channel |
| Numerals | tabular, `font-feature-settings: 'tnum'` | Columns of figures must align or they cannot be compared |
| Type | Inter / system stack | Neutral. The data is the thing with a voice |

**Where the boldness is spent.** Spec §17 says to spend it on the axis plot and keep tables and
browse quiet. So the plot is the only component with a saturated marker, a coverage band and
interactive pole labels; the tables are grey rules, tabular numerals and nothing else.

**Quality floor, unannounced.** Responsive to mobile (tables scroll inside their own container, the
page body never does). Visible keyboard focus via a global `:focus-visible` ring. Reduced motion
respected globally. Interactive controls are real `<button>` elements with `aria-pressed`, so the
instrument is operable from the keyboard.

---

## Three places the design carries an argument

1. **Skip sits outside the answer row, behind a dashed rule.** Spec §4 warns that conflating
   "unsure" with "abstain" *"silently destroys the difference between a middle position and no
   position."* Unsure is inside the option row because it is an answer. Skip is outside it because
   it is not. The separation is the argument, made physically.

2. **An excluded axis renders as an empty dashed bar with a written reason** — never omitted, never
   centred. Omitting it would make the axis look irrelevant; centring it would fabricate a moderate
   position. The dashed bar says *"you skipped all 2 questions feeding this axis, so it is excluded
   from every comparison — not set to the middle."*

3. **Three tag strengths, three renderings.** *From role content* (a phrase in the role's own
   description), *from the organization* (inheritance — weaker, and mandated by spec §10.3 for
   non-research roles), and *open to any agenda* (field-building). Flattening these into one badge
   would be the single most misleading thing this interface could do, because 209 of 646 roles carry
   the middle one.
