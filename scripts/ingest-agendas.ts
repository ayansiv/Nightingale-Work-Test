/**
 * Ingest: Shallow Review 2025 -> data/derived/agendas.json
 *
 * Source: github.com/arb-consulting/shallow-review-2025,
 *   main-pipeline/data/2025-12-16-draft-post-review/agendas.csv  (post-review, 79 rows)
 *   main-pipeline/data/2025-12-16-draft-post-review/papers.csv   (826 outputs, agenda-linked)
 *   main-pipeline/data/taxonomy.yaml                             (96 ids, canonical slugs)
 *
 * Snapshot ingest (Build Spec: "Data is pulled once, reviewed, and committed to the repo").
 * Kept clean enough that going live later is a cron job rather than a rewrite.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import YAML from 'yaml';
import { deriveAgendaCoordinates, type DerivationConfig } from './lib/derive.js';
import { parseFteRange, projectFte, placeholder } from './lib/estimate.js';
import type { Agenda, Axis } from './lib/types.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = <T>(p: string): T => JSON.parse(read(p));

const axes: Axis[] = readJson<{ axes: Axis[] }>('data/config/axes.json').axes;
const derivation = readJson<DerivationConfig>('data/config/derivation.json');
const axisIds = axes.map((a) => a.id);

interface Row {
  name: string; section: string; sub_section: string; full_name: string;
  one_sentence_summary: string; theory_of_change: string; see_also: string;
  orthodox_problems: string; target_case_text: string; broad_approach_text: string;
  some_names: string; estimated_ftes: string; critiques: string; funded_by: string;
  outputs_count: string;
}

const rows: Row[] = parse(read('data/raw/sr2025-agendas.csv'), {
  columns: true, skip_empty_lines: true, bom: true,
});

const papers: { agenda_full_name: string; published_year: string }[] = parse(
  read('data/raw/sr2025-papers.csv'), { columns: true, skip_empty_lines: true, bom: true },
);

// taxonomy.yaml carries the canonical slugs the classify pipeline uses; match on name so our
// agenda ids line up with the upstream category ids wherever possible.
const taxonomy = YAML.parse(read('data/raw/sr2025-taxonomy.yaml')) as {
  taxonomy: TaxNode[];
};
interface TaxNode { id: string; name: string; description?: string; children?: TaxNode[] }
const slugByName = new Map<string, string>();
const descByName = new Map<string, string>();
(function walk(ns: TaxNode[]) {
  for (const n of ns) {
    slugByName.set(n.name.toLowerCase(), n.id);
    if (n.description) descByName.set(n.name.toLowerCase(), n.description);
    if (n.children) walk(n.children);
  }
})(taxonomy.taxonomy);

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const TARGET_CASE_MAP: Record<string, Agenda['target_case']> = {
  'average': 'average', 'pessimistic': 'pessimistic', 'worst-case': 'worst',
  'mixed': 'mixed', 'varies': 'mixed',
};

/**
 * Lab rows are organizations, not agendas — the source files them under a "Labs (giant
 * companies)" section for editorial reasons. They become orgs downstream, not agendas, or the
 * data table would list Anthropic as a research agenda alongside sparse autoencoders.
 */
const LAB_SECTION = 'Labs (giant companies)';

const outputsByAgenda = new Map<string, number>();
for (const p of papers) {
  const k = p.agenda_full_name?.trim();
  if (k) outputsByAgenda.set(k, (outputsByAgenda.get(k) ?? 0) + 1);
}

const agendas: Agenda[] = [];
const labRows: Row[] = [];
const unmatchedProblems = new Set<string>();
const nullAxisTally = new Map<string, number>();

for (const r of rows) {
  if (r.section?.trim() === LAB_SECTION) { labRows.push(r); continue; }

  const derived = deriveAgendaCoordinates(r, derivation, axisIds);
  derived.unmatched_problems.forEach((p) => unmatchedProblems.add(p));
  for (const a of axisIds) if (derived.coordinates[a] == null) {
    nullAxisTally.set(a, (nullAxisTally.get(a) ?? 0) + 1);
  }

  const fte2025 = parseFteRange(r.estimated_ftes, 'Shallow Review 2025');
  const { matched } = (() => {
    const vocab = Object.keys(derivation.orthodox_problems);
    // Re-parse for storage so the agenda record keeps the assumptions verbatim (spec §6:
    // "store the source assumption text alongside each coordinate").
    return { matched: derived.contributions
      ? Object.values(derived.contributions).flat()
          .filter((c) => c!.kind === 'orthodox_problem').map((c) => c!.source)
      : [] as string[] };
  })();

  const id = slugByName.get(r.name.trim().toLowerCase()) ?? slugify(r.name);

  agendas.push({
    id,
    name: r.name.trim(),
    full_name: r.full_name.trim(),
    domain: 'technical',
    family: r.section.trim(),
    sub_section: r.sub_section?.trim() ?? '',
    target_case: TARGET_CASE_MAP[r.target_case_text?.trim().toLowerCase()] ?? null,
    broad_approach: r.broad_approach_text?.trim() ?? '',
    one_sentence_summary: r.one_sentence_summary?.trim() ?? '',
    theory_of_change: r.theory_of_change?.trim() ?? '',
    assumptions: [...new Set(matched)],
    coordinates: derived.coordinates,
    coordinate_sources: derived.coordinate_sources,

    funding_philanthropic_usd: placeholder(
      'Shallow Review names funders per agenda but publishes no dollar figures.', 'OD-05'),
    funding_government_usd: placeholder(
      'Not applicable to technical agendas; the column exists for policy levers only.', 'OD-06'),
    org_count: placeholder(
      'Derived downstream from orgs.json once org tagging is reviewed.', 'OD-04'),

    fte_2025: fte2025,
    fte_2026_est: projectFte(fte2025),
    fte_method: fte2025.method,

    postings_count: 0, // filled by ingest-roles.ts; kept separate per caveat §13.1
    outputs_count: outputsByAgenda.get(r.full_name.trim()) ?? (Number(r.outputs_count) || 0),

    lab_coverage: 'unknown',
    sensitivity_tier: 1,
    some_names: (r.some_names ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    critiques: r.critiques?.trim() ?? '',
    funded_by: r.funded_by?.trim() ?? '',
    source_url: 'https://shallowreview.ai/',
  });
}

// ---- FTE reconciliation (see docs/INGEST-SPIKE.md, finding 3) -------------------------------
//
// Two independent measurements of the same field disagree by ~3x:
//   Shallow Review 2025, summed over agendas : 1142 (low bounds) .. 3172 (high bounds)
//   AI Safety Field Growth Analysis 2025     :  620 .. 645 technical FTEs across 68-70 orgs
//
// They are not the same population. Shallow Review counts anyone doing any work on an agenda,
// including part-time lab researchers and academics; the Field Growth Analysis counts staff at
// dedicated AI safety organizations and says plainly that it undercounts academia and frontier
// companies. Double-counting explains only part of it: a researcher appears on 1.28 agendas on
// average, which is nowhere near a 3x factor.
//
// We do not silently rescale either one. We publish the source's own number AND the share of
// field effort, which is scale-invariant and therefore survives the disagreement intact. The
// share is the quantity the neglectedness argument actually needs; the level is not.
const fteTotal = agendas.reduce((s, a) => s + (a.fte_2025.value ?? 0), 0);
const FIELD_ANCHOR_LOW = 620;
const FIELD_ANCHOR_HIGH = 645;
for (const a of agendas) {
  if (a.fte_2025.value == null) {
    a.fte_share_of_field = { value: null, flag: 'unknown', method: 'No FTE baseline for this agenda.' };
    continue;
  }
  const share = a.fte_2025.value / fteTotal;
  a.fte_share_of_field = {
    value: Number((share * 100).toFixed(2)),
    low: Number((share * FIELD_ANCHOR_LOW).toFixed(1)),
    high: Number((share * FIELD_ANCHOR_HIGH).toFixed(1)),
    flag: 'estimated',
    method:
      `${(share * 100).toFixed(2)}% of the summed Shallow Review FTE estimates. Shown as a share ` +
      'because the two independent measurements of field size disagree by roughly 3x on the LEVEL ' +
      `(Shallow Review sums to ~${Math.round(fteTotal)}; AI Safety Field Growth Analysis 2025 measures ` +
      `${FIELD_ANCHOR_LOW}–${FIELD_ANCHOR_HIGH}) while broadly agreeing on the ORDERING. Applied to the ` +
      `field-wide anchor this is roughly ${(share * FIELD_ANCHOR_LOW).toFixed(0)}–${(share * FIELD_ANCHOR_HIGH).toFixed(0)} FTEs. ` +
      'Treat the rank, not the level.',
    source: 'Shallow Review 2025 x AI Safety Field Growth Analysis 2025',
  };
}

fs.mkdirSync(path.join(ROOT, 'data/derived'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'data/derived/agendas.json'),
  JSON.stringify({ generated_at: new Date().toISOString().slice(0, 10), source: 'Shallow Review 2025 (arb-consulting/shallow-review-2025, 2025-12-16 post-review export)', agendas }, null, 2),
);
fs.writeFileSync(
  path.join(ROOT, 'data/derived/_lab-rows.json'),
  JSON.stringify(labRows, null, 2),
);

// ---- Ingest spike report (Build Spec §15 step 1) ----
const withAssumptions = agendas.filter((a) => a.assumptions.length > 0).length;
const withToC = agendas.filter((a) => a.theory_of_change).length;
const withFte = agendas.filter((a) => a.fte_2025.value != null).length;

console.log(`agendas written: ${agendas.length}  (lab rows diverted to orgs: ${labRows.length})`);
console.log(`  theory_of_change present : ${withToC}/${agendas.length}`);
console.log(`  assumptions present      : ${withAssumptions}/${agendas.length}`);
console.log(`  fte_2025 parsed          : ${withFte}/${agendas.length}`);
console.log(`  unmatched problem tokens : ${[...unmatchedProblems].join(' | ') || 'none'}`);
console.log('\n  null coordinates per axis (out of ' + agendas.length + '):');
for (const a of axes) {
  const n = nullAxisTally.get(a.id) ?? 0;
  const bar = '#'.repeat(Math.round((n / agendas.length) * 30));
  console.log(`    ${a.id.padEnd(20)} ${String(n).padStart(3)}  ${bar}`);
}
