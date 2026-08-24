/**
 * Ingest: 80,000 Hours job board -> data/derived/roles.json + orgs.json
 *
 * Implements Build Spec §10:
 *   1. Org-level tags are manual              -> data/classification/orgs.csv
 *   2. Research and policy roles are classified -> data/classification/signals.json (see the
 *      note there on why this is a rule table rather than an API call)
 *   3. Everything else inherits the org's primary agenda. This step is load-bearing: a large
 *      share of the board is non-research, and without inheritance the matcher routes
 *      exclusively to research roles, contradicting the boards' own framing that many roles
 *      don't require technical skills.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { Agenda, Org, Role } from './lib/types.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = <T>(p: string): T => JSON.parse(read(p));

const { agendas } = readJson<{ agendas: Agenda[] }>('data/derived/agendas.json');
const levers = readJson<{ levers: { id: string; name: string }[] }>('data/seed/policy-levers.json').levers;
const metaAgendas = readJson<{ agendas: { id: string; name: string }[] }>('data/seed/meta-agendas.json').agendas;
const signalsCfg = readJson<{
  matching: { title_multiplier: number; min_score: number; min_margin: number };
  signals: Record<string, { phrases: string[]; weight: number; negative?: string[] }[]>;
  field_building_orgs: { orgs: string[] };
}>('data/classification/signals.json');

const validAgendaIds = new Set([
  ...agendas.map((a) => a.id),
  ...levers.map((l) => l.id),
  ...metaAgendas.map((m) => m.id),
]);
const fieldBuilding = new Set(signalsCfg.field_building_orgs.orgs.map((o) => o.toLowerCase()));

// ---- org tags -------------------------------------------------------------------------------
interface OrgTagRow {
  org: string; primary_agenda_id: string; secondary_agenda_ids: string;
  maturity_tier: string; confidence: string; insider_note: string; note: string;
}
const orgTagRows: OrgTagRow[] = parse(
  read('data/classification/orgs.csv').split('\n').filter((l) => !l.startsWith('#')).join('\n'),
  { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true },
);

const orgTags = new Map<string, OrgTagRow & { secondaries: string[] }>();
const badRefs: string[] = [];
for (const r of orgTagRows) {
  const secondaries = (r.secondary_agenda_ids || '').split(';').map((s) => s.trim()).filter(Boolean);
  for (const id of [r.primary_agenda_id, ...secondaries].filter(Boolean)) {
    if (!validAgendaIds.has(id)) badRefs.push(`${r.org} -> ${id}`);
  }
  orgTags.set(r.org.trim().toLowerCase(), { ...r, secondaries });
}
if (badRefs.length) {
  console.error('FATAL: orgs.csv references agenda ids that do not exist:');
  badRefs.forEach((b) => console.error('  ' + b));
  process.exit(1);
}

// ---- classifier -----------------------------------------------------------------------------
interface ClassifyResult { agendaId: string | null; rationale: string; runnerUp?: string }

function normalise(s: string): string {
  return ' ' + (s ?? '').toLowerCase().replace(/\s+/g, ' ') + ' ';
}

/**
 * Score every agenda the org actually works on, then require a clear winner. An ambiguous title
 * falls through to inheritance rather than being forced onto the closest-looking agenda.
 */
function classify(title: string, description: string, candidates: string[]): ClassifyResult {
  const t = normalise(title);
  const d = normalise(description);
  const { title_multiplier, min_score, min_margin } = signalsCfg.matching;

  const scores: { id: string; score: number; matched: string; inTitle: boolean }[] = [];

  for (const id of candidates) {
    const groups = signalsCfg.signals[id];
    if (!groups) continue;
    let best = 0;
    let matched = '';
    let inTitle = false;

    for (const g of groups) {
      if (g.negative?.some((n) => t.includes(n.toLowerCase()) || d.includes(n.toLowerCase()))) continue;
      for (const phrase of g.phrases) {
        const p = phrase.toLowerCase();
        const hitTitle = t.includes(p);
        const hitDesc = d.includes(p);
        if (!hitTitle && !hitDesc) continue;
        const s = g.weight * (hitTitle ? title_multiplier : 1);
        if (s > best) { best = s; matched = phrase; inTitle = hitTitle; }
      }
    }
    if (best > 0) scores.push({ id, score: best, matched, inTitle });
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];

  if (!top || top.score < min_score) {
    return { agendaId: null, rationale: '' };
  }
  if (second && top.score - second.score < min_margin) {
    return {
      agendaId: null,
      rationale: '',
      runnerUp: `ambiguous between ${top.id} and ${second.id}`,
    };
  }
  return {
    agendaId: top.id,
    rationale: `Matched "${top.matched}" in the ${top.inTitle ? 'title' : 'description'}, within the agendas ${
      candidates.length
    } this organization works on.`,
    runnerUp: second?.id,
  };
}

// ---- roles ----------------------------------------------------------------------------------
interface Vacancy {
  '!Title': string; '!Org': string; 'Vacancy Button': string; '!Location': string;
  'Date published': string; '!Date it closes': string; '!Problem area (filters)': string;
  '!Description': string; '!Required degree': string; '!MinimumExperienceLevel': string;
  '!Role type': string; '!Position': string; '!Salary (display)': string;
  "Org's home page": string; "Org's vacancies page": string; "Org's logo": string;
  'Highlighted role': string;
}

const vacancies: Vacancy[] = parse(read('data/raw/80k-vacancies.csv'), {
  columns: true, skip_empty_lines: true, bom: true,
});

const splitList = (s: string) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

/** 80k's location field is quoted oddly: '"Washington, DC metro area.USA",London.UK'. */
const splitLocations = (s: string) =>
  (s ?? '').replace(/"/g, '').split(',').map((x) => x.trim()).filter(Boolean);

const CLASSIFY_ROLE_TYPES = new Set(['Research', 'Policy']);
const AI_PROBLEM_PREFIXES = ['1.', 'D.', '6.'];

// Manual corrections. Spec §10 step 4: "Manual corrections are straight edits." These are edits
// to the OUTPUT of the rule table, recorded here so they survive a re-run and are visible in review.
interface Override { role_title: string; org: string; agenda_id: string; why: string }
const overrides: Override[] = JSON.parse(read('data/classification/role-overrides.json')).overrides;
const overrideKey = (org: string, title: string) => `${org}||${title}`.toLowerCase();
const overrideMap = new Map(overrides.map((o) => [overrideKey(o.org, o.role_title), o]));
const overridesUsed = new Set<string>();

const reviewQueue: { org: string; title: string; assigned_by_inheritance: string; candidates: string[]; note: string }[] = [];
const roles: Role[] = [];
const stats = {
  total: 0, aiRelevant: 0, classified: 0, inherited: 0, crossAgenda: 0,
  untagged: 0, classifyAttempted: 0, classifyFellThrough: 0, ambiguous: 0,
  manual: 0,
  // The metric that actually matters. Falling through at a single-agenda org is harmless: the
  // org's primary IS the only possible answer, so inheritance loses nothing. Falling through at
  // a multi-agenda org is a real loss of information — that is where the tag gets weaker.
  fellThroughSingleCandidate: 0, fellThroughMultiCandidate: 0,
  inheritedSingleCandidate: 0, inheritedMultiCandidate: 0,
};

for (const v of vacancies) {
  stats.total++;
  const problem = v['!Problem area (filters)']?.trim() ?? '';
  if (!AI_PROBLEM_PREFIXES.some((p) => problem.startsWith(p))) continue;
  stats.aiRelevant++;

  const orgName = v['!Org']?.trim() ?? '';
  const tag = orgTags.get(orgName.toLowerCase());
  const roleTypes = splitList(v['!Role type']);
  const isResearchOrPolicy = roleTypes.some((t) => CLASSIFY_ROLE_TYPES.has(t));

  let agendaId: string | null = null;
  let tagSource: Role['tag_source'] = 'untagged';
  let rationale = '';
  let crossAgenda = false;

  const override = overrideMap.get(overrideKey(orgName, v['!Title']?.trim() ?? ''));

  // "Open to any agenda" is now a claim about the ROLE, not about the employer. A cohort
  // programme really does place you wherever your mentor works. An operations manager at the
  // same organization does not — that is an ordinary job, and calling it agenda-neutral hid 71
  // real jobs behind a non-answer while diluting the label for the ~10 where it is true.
  const isCohortProgramme = ['Fellowship', 'Internship', 'Course'].includes(v['!Position']?.trim() ?? '');

  if (override) {
    overridesUsed.add(overrideKey(override.org, override.role_title));
    agendaId = override.agenda_id;
    tagSource = 'manual';
    rationale = `Manually corrected. ${override.why}`;
    stats.manual++;
  } else if (fieldBuilding.has(orgName.toLowerCase()) && isCohortProgramme) {
    crossAgenda = true;
    stats.crossAgenda++;
    // Still record the host's own category, so the role is browsable rather than orphaned.
    agendaId = tag?.primary_agenda_id ?? null;
    tagSource = tag?.primary_agenda_id ? 'inherited' : 'untagged';
    rationale =
      'A cohort programme: which agenda you end up working on depends on your mentor rather than ' +
      'on the host organization, so this is shown under every agenda as well as under the host.';
  } else if (tag?.primary_agenda_id) {
    const candidates = [tag.primary_agenda_id, ...tag.secondaries];

    if (isResearchOrPolicy) {
      stats.classifyAttempted++;
      const c = classify(v['!Title'], v['!Description'], candidates);
      if (c.agendaId) {
        agendaId = c.agendaId;
        tagSource = 'classified';
        rationale = c.rationale;
        stats.classified++;
      } else {
        stats.classifyFellThrough++;
        if (candidates.length === 1) stats.fellThroughSingleCandidate++;
        else {
          stats.fellThroughMultiCandidate++;
          reviewQueue.push({
            org: orgName,
            title: v['!Title']?.trim() ?? '',
            assigned_by_inheritance: tag.primary_agenda_id,
            candidates,
            note: c.runnerUp?.startsWith('ambiguous') ? c.runnerUp : 'no signal fired',
          });
        }
        if (c.runnerUp?.startsWith('ambiguous')) stats.ambiguous++;
        // Spec §10 step 3: fall through to inheritance rather than force a tag.
        agendaId = tag.primary_agenda_id;
        tagSource = 'inherited';
        rationale =
          'No distinguishing signal in the title or description, so this takes the organization\'s ' +
          `primary agenda. ${c.runnerUp?.startsWith('ambiguous') ? c.runnerUp[0].toUpperCase() + c.runnerUp.slice(1) + '. ' : ''}` +
          'A research role tagged by inheritance is a weaker claim than one tagged by content.';
        stats.inherited++;
      }
    } else {
      if (candidates.length === 1) stats.inheritedSingleCandidate++;
      else stats.inheritedMultiCandidate++;
      agendaId = tag.primary_agenda_id;
      tagSource = 'inherited';
      rationale =
        `Non-research role (${roleTypes.join(', ') || 'unspecified'}), so it takes the organization's ` +
        'primary agenda. This inheritance is deliberate: without it the matcher would route only to ' +
        'research roles, contradicting the job boards\' own framing that many roles need no technical background.';
      stats.inherited++;
    }
  } else {
    stats.untagged++;
    rationale =
      'Organization not yet tagged to an agenda. Left untagged rather than guessed — it will appear ' +
      'in browse but cannot be matched until the org tag lands.';
  }

  roles.push({
    id: `${orgName}::${v['!Title']}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120),
    title: v['!Title']?.trim() ?? '',
    org_id: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    org_name: orgName,
    agenda_id: agendaId,
    tag_source: tagSource,
    tag_rationale: rationale,
    skill_set: roleTypes,
    experience_level: splitList(v['!MinimumExperienceLevel']),
    role_type: roleTypes,
    position: v['!Position']?.trim() ?? '',
    location: splitLocations(v['!Location']),
    salary_display: v['!Salary (display)']?.trim() ?? '',
    url: v['Vacancy Button']?.trim() ?? '',
    posted_date: v['Date published']?.trim() ?? '',
    closes_date: v['!Date it closes']?.trim() ?? '',
    problem_area: problem,
    required_degree: v['!Required degree']?.trim() ?? '',
    description: v['!Description']?.trim() ?? '',
    highlighted: v['Highlighted role']?.trim() === 'checked',
    ...(crossAgenda ? { cross_agenda: true } : {}),
  } as Role);
}

// ---- orgs -----------------------------------------------------------------------------------
const orgById = new Map<string, Org>();
for (const r of roles) {
  const existing = orgById.get(r.org_id);
  if (existing) { existing.postings_count++; continue; }
  const tag = orgTags.get(r.org_name.toLowerCase());
  const v = vacancies.find((x) => x['!Org']?.trim() === r.org_name);
  orgById.set(r.org_id, {
    id: r.org_id,
    name: r.org_name,
    aliases: [],
    primary_agenda_id: tag?.primary_agenda_id || null,
    secondary_agenda_ids: tag?.secondaries ?? [],
    maturity_tier: (tag?.maturity_tier as Org['maturity_tier']) || 'unknown',
    // Spec §7: orgs get positions from revealed evidence. We do not have those yet — an org's
    // position is a separate judgement from which agenda it works on. Null, not centred.
    coordinates: Object.fromEntries(
      readJson<{ axes: { id: string }[] }>('data/config/axes.json').axes.map((a) => [a.id, null]),
    ),
    coordinate_sources: {},
    description: tag?.note ?? '',
    homepage: v?.["Org's home page"]?.trim() ?? '',
    vacancies_page: v?.["Org's vacancies page"]?.trim() ?? '',
    logo: v?.["Org's logo"]?.trim() ?? '',
    tag_source: tag ? 'manual' : 'untagged',
    postings_count: 1,
  });
}
const orgs = [...orgById.values()].sort((a, b) => b.postings_count - a.postings_count);

// postings_count back onto agendas — reported separately, NEVER summed into a composite (§13.1)
const postingsByAgenda = new Map<string, number>();
for (const r of roles) if (r.agenda_id) {
  postingsByAgenda.set(r.agenda_id, (postingsByAgenda.get(r.agenda_id) ?? 0) + 1);
}
for (const a of agendas) a.postings_count = postingsByAgenda.get(a.id) ?? 0;

fs.writeFileSync(path.join(ROOT, 'data/derived/roles.json'),
  JSON.stringify({ generated_at: new Date().toISOString().slice(0, 10), source: '80,000 Hours job board public Airtable view', roles }, null, 2));
fs.writeFileSync(path.join(ROOT, 'data/derived/orgs.json'),
  JSON.stringify({ generated_at: new Date().toISOString().slice(0, 10), orgs }, null, 2));
fs.writeFileSync(path.join(ROOT, 'data/derived/agendas.json'),
  JSON.stringify({ generated_at: new Date().toISOString().slice(0, 10), source: 'Shallow Review 2025 (arb-consulting/shallow-review-2025, 2025-12-16 post-review export)', agendas }, null, 2));

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(0)}%`;
console.log(`vacancies read      : ${stats.total}`);
console.log(`AI-relevant         : ${stats.aiRelevant}`);
console.log(`orgs seen           : ${orgs.length}  (tagged ${orgs.filter((o) => o.primary_agenda_id).length})`);
console.log('');
console.log(`classified          : ${stats.classified}  (${pct(stats.classified, stats.aiRelevant)} of AI roles)`);
console.log(`inherited           : ${stats.inherited}  (${pct(stats.inherited, stats.aiRelevant)})`);
console.log(`cross-agenda        : ${stats.crossAgenda}  (${pct(stats.crossAgenda, stats.aiRelevant)}) field-building`);
console.log(`untagged org        : ${stats.untagged}  (${pct(stats.untagged, stats.aiRelevant)})`);
console.log('');
console.log(`manual overrides    : ${stats.manual}`);
console.log('');
console.log(`classifier attempts : ${stats.classifyAttempted} research/policy roles at tagged orgs`);
console.log(`  -> resolved       : ${stats.classified} (${pct(stats.classified, stats.classifyAttempted)})`);
console.log(`  -> fell through   : ${stats.classifyFellThrough} (${pct(stats.classifyFellThrough, stats.classifyAttempted)}), of which ${stats.ambiguous} ambiguous`);
console.log('');
console.log('TAG STRENGTH — these are three different claims and the UI must not merge them:');
console.log(`  strong  (role content)      : ${stats.classified + stats.manual}  "this role is about X", from a phrase in its own text`);
console.log(`  by design (org proxy)       : ${stats.inherited - stats.fellThroughSingleCandidate - stats.fellThroughMultiCandidate}  "this role is at an org whose primary work is X"`);
console.log(`                                 spec §10.3 mandates this for non-research roles, and it is load-bearing`);
console.log(`  review queue               : ${stats.fellThroughMultiCandidate}  research/policy roles at a MULTI-agenda org where no signal fired`);
console.log(`                                 (+${stats.fellThroughSingleCandidate} at single-agenda orgs, where inheritance is the only possible answer anyway)`);
console.log(`  untagged                   : ${stats.untagged}  org not yet tagged`);
console.log(`  cross-agenda               : ${stats.crossAgenda}  field-building; shown under every agenda by design`);
console.log('');
console.log(`The review queue is ${pct(stats.fellThroughMultiCandidate, stats.aiRelevant)} of AI roles. That is the honest cost of`);
console.log('classifying by rule table instead of by model, and it is a finite, enumerable list —');
console.log('written to data/derived/review-queue.json for the owner to work through.');

fs.writeFileSync(path.join(ROOT, 'data/derived/review-queue.json'), JSON.stringify({
  generated_at: new Date().toISOString().slice(0, 10),
  what: 'Research/policy roles at organizations that work on more than one agenda, where no signal '
      + 'phrase fired. Each currently carries the org primary agenda by inheritance, which is a '
      + 'weaker claim than a content-based tag. Resolve by adding a phrase to signals.json (if the '
      + 'pattern will recur) or a row to role-overrides.json (if it is a one-off).',
  count: reviewQueue.length,
  roles: reviewQueue,
}, null, 2));

const unused = overrides.filter((o) => !overridesUsed.has(overrideKey(o.org, o.role_title)));
if (unused.length) {
  console.log('');
  console.log(`WARNING: ${unused.length} override(s) matched no role (title drift in the source?):`);
  unused.forEach((o) => console.log(`  ${o.org} :: ${o.role_title}`));
}
