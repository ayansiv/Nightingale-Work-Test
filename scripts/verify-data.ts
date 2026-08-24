/**
 * `npm run verify` — checks the Build Spec §18 acceptance criteria that can be checked without a
 * browser, plus the calibration fixtures from data/config/calibration.json.
 *
 * This exists because several of the spec's criteria are the kind that silently stop holding.
 * "An axis with all contributing items abstained is excluded entirely — not imputed to zero" is
 * one `?? 0` away from being false, and nothing about the UI would look wrong.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ABSTAIN, computeAxes, consistencyFlags, jointTakeoverRisk, match, matchTarget,
  type Axis, type Question, type Responses, type Target,
} from '../src/lib/scoring.js';
import { encode, decode, roundTrips } from '../src/lib/permalink.js';
import type { Agenda } from './lib/types.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const axes: Axis[] = readJson<{ axes: Axis[] }>('data/config/axes.json').axes;
const qcfg = readJson<{ questions: Question[]; consistency_pairs: any[] }>('data/config/questions.json');
const questions = qcfg.questions;
const { agendas } = readJson<{ agendas: Agenda[] }>('data/derived/agendas.json');
const calibration = readJson<any>('data/config/calibration.json');

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { console.log(`  PASS  ${name}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? '\n        ' + detail : ''}`); }
};

// ---------------------------------------------------------------------------------------------
console.log('\nCONFIG INTEGRITY');
{
  const axisIds = new Set(axes.map((a) => a.id));
  const unknown = questions.flatMap((q) =>
    Object.keys(q.loadings).filter((k) => !axisIds.has(k)).map((k) => `${q.id}->${k}`));
  check('every question loading names a real axis', unknown.length === 0, unknown.join(', '));

  const covered = new Set(questions.flatMap((q) => Object.keys(q.loadings)));
  const orphans = axes.filter((a) => !covered.has(a.id)).map((a) => a.id);
  check('every axis has at least one question', orphans.length === 0, orphans.join(', '));

  // Spec §18: "Adding an axis or a question to config requires no code change." The best proxy
  // we can check automatically is that nothing hard-codes an axis id outside config.
  const srcFiles = fs.readdirSync(path.join(ROOT, 'src/lib')).filter((f) => f.endsWith('.ts'));
  const hardcoded: string[] = [];
  for (const f of srcFiles) {
    const body = fs.readFileSync(path.join(ROOT, 'src/lib', f), 'utf8');
    for (const a of axes) {
      // jointTakeoverRisk legitimately names the three chain axes; that is the spec's own formula.
      if (['p_mis', 'p_scheme', 'containment'].includes(a.id)) continue;
      if (body.includes(`'${a.id}'`) || body.includes(`"${a.id}"`)) hardcoded.push(`${f}:${a.id}`);
    }
  }
  check('no axis id hard-coded in src/lib outside the joint-risk formula',
    hardcoded.length === 0, hardcoded.join(', '));

  const singleItem = axes
    .map((a) => ({ id: a.id, n: questions.filter((q) => (q.loadings[a.id] ?? 0) !== 0).length }))
    .filter((x) => x.n === 1);
  console.log(`  NOTE  ${singleItem.length} axes rest on a single question: ${singleItem.map((x) => x.id).join(', ')}`);
  console.log('        One abstention removes these axes entirely. That is correct behaviour, but it');
  console.log('        means the "degrades smoothly" property does not hold for them. See OWNER-DATA OD-09.');
}

// ---------------------------------------------------------------------------------------------
console.log('\nSCORING INVARIANTS (spec §18)');
{
  // Build a response set that abstains on 2 items and answers "unsure" on 2 others.
  const r: Responses = {};
  for (const q of questions) r[q.id] = q.response_type === 'allocation' ? 0 : 0.5;
  r['q18'] = ABSTAIN;
  r['q19'] = ABSTAIN;   // both internals items -> axis must vanish
  r['q20'] = 0;         // unsure
  r['q21'] = 0;         // unsure
  r['q13'] = ABSTAIN;

  const scores = computeAxes(r, questions, axes);

  check('an axis with ALL contributing items abstained is absent, not zero',
    !('internals' in scores),
    'internals' in scores ? `internals present with value ${scores['internals'].value}` : '');

  check('an axis whose items were answered "unsure" IS present with value 0',
    scores['patch_rebuild']?.value === 0,
    `patch_rebuild = ${JSON.stringify(scores['patch_rebuild'])}`);

  check('abstain and unsure are therefore handled differently',
    !('internals' in scores) && scores['patch_rebuild']?.value === 0);

  // One abstention on a 3-item axis must NOT remove the axis.
  check('abstain drops the question, not the axis (accident_deliberate has 3 items, 1 abstained)',
    scores['accident_deliberate'] !== undefined && scores['accident_deliberate'].coverage === 2,
    JSON.stringify(scores['accident_deliberate']));

  // Coverage reporting.
  const r2: Responses = { q15: 0.5 }; // one of three labs items
  const s2 = computeAxes(r2, questions, axes);
  check('an axis computed from one item reports coverage 1',
    s2['labs']?.coverage === 1 && s2['labs']?.contributingItems === 3,
    JSON.stringify(s2['labs']));

  // Joint risk is display-only.
  const scoringSrc = fs.readFileSync(path.join(ROOT, 'src/lib/scoring.ts'), 'utf8');
  const matchBody = scoringSrc.slice(scoringSrc.indexOf('export function matchTarget'));
  check('joint takeover risk is absent from the scoring path',
    !matchBody.includes('jointTakeoverRisk'));
  check('joint takeover risk still computes for display',
    typeof jointTakeoverRisk(computeAxes(
      Object.fromEntries(questions.map((q) => [q.id, 0.5])), questions, axes)) === 'number');
}

// ---------------------------------------------------------------------------------------------
console.log('\nCONSISTENCY FLAGS (spec §18)');
{
  // q18 "+0.9 internals" strongly agree, q19 "-0.7 internals" strongly agree -> contradiction.
  const r: Responses = { q18: 1, q19: 1 };
  const flags = consistencyFlags(r, questions, qcfg.consistency_pairs);
  check('a q18/q19 contradiction raises a flag',
    flags.some((f) => f.questionA === 'q18' && f.questionB === 'q19'),
    JSON.stringify(flags));

  // The consistent case: agree with q18, disagree with q19. Must NOT flag.
  const r2: Responses = { q18: 1, q19: -1 };
  const flags2 = consistencyFlags(r2, questions, qcfg.consistency_pairs);
  check('the CONSISTENT q18/q19 pattern does not flag',
    !flags2.some((f) => f.questionA === 'q18'),
    JSON.stringify(flags2));
}

// ---------------------------------------------------------------------------------------------
console.log('\nMATCHING (spec §18)');
{
  const r: Responses = {};
  for (const q of questions) r[q.id] = q.response_type === 'allocation' ? 0 : 0.5;
  const scores = computeAxes(r, questions, axes);

  const targets: Target[] = agendas.map((a) => ({
    id: a.id, name: a.name, domain: 'technical', coordinates: a.coordinates,
  }));

  const result = match(scores, targets, axes);
  check('technical and policy lists are returned separately',
    Array.isArray(result.technical) && Array.isArray(result.policy));
  check('every returned match carries per-axis explanation',
    result.technical.every((m) => m.contributions.length > 0 && m.explanation.length > 0));

  // Domain gating: a technical target must never be scored on a policy axis.
  const policyAxes = new Set(axes.filter((a) => a.scope === 'policy').map((a) => a.id));
  const leaked = result.technical.flatMap((m) =>
    m.contributions.filter((c) => policyAxes.has(c.axis)).map((c) => `${m.target.id}:${c.axis}`));
  check('no technical match scored on a policy axis', leaked.length === 0, leaked.slice(0, 5).join(', '));

  // Symmetric unknowns.
  const nullTarget: Target = {
    id: 'test', name: 'test', domain: 'technical',
    coordinates: Object.fromEntries(axes.map((a) => [a.id, a.id === 'p_mis' ? 0.5 : null])),
  };
  const m = matchTarget(scores, nullTarget, axes);
  check('a target null on an axis has that axis excluded from its own distance',
    m !== null && m.axesUsed === 1,
    JSON.stringify({ used: m?.axesUsed, dropped: m?.axesDropped }));
}

// ---------------------------------------------------------------------------------------------
console.log('\nPERMALINK (spec §18)');
{
  // Use a value that is VALID for each scale. Willingness has no 0.5 level, and the encoder
  // correctly snaps an invalid value to the nearest one — feeding it 0.5 tests the snap, not the
  // round trip.
  const valid = (q: Question): number =>
    q.response_type === 'allocation' ? 0.4 : q.response_type === 'willingness' ? 0.33 : 0.5;
  const r: Responses = {};
  for (const q of questions) r[q.id] = valid(q);
  r['q4'] = ABSTAIN;
  r['q5'] = 0;      // unsure
  r['q25'] = -0.33; // willingness, valid level

  check('round-trips exactly, preserving abstain and unsure distinctly',
    roundTrips(r, questions));

  const decoded = decode(encode(r, questions), questions);
  check('abstain decodes back to ABSTAIN, not to 0', decoded['q4'] === ABSTAIN,
    String(decoded['q4'] as any));
  check('unsure decodes back to 0, not to ABSTAIN', decoded['q5'] === 0,
    String(decoded['q5'] as any));
  // q4 is the 4th question in config order, and the body starts after the "v1." prefix.
  const q4Index = 'v1.'.length + [...questions].sort((a, b) => a.order - b.order)
    .findIndex((q) => q.id === 'q4');
  // A stale link from a previous question set must fail closed, not misalign.
  const stale = 'v1.' + 'd'.repeat(questions.length - 2);
  check('a permalink from a previous question set decodes to nothing, not to wrong answers',
    Object.keys(decode(stale, questions)).length === 0);
  const wrongLength = encode(r, questions).slice(0, -3);
  check('a truncated permalink is refused rather than partially read',
    Object.keys(decode(wrongLength, questions)).length === 0);

  check('abstain and unsure use different characters',
    encode({ q4: ABSTAIN }, questions)[q4Index] !== encode({ q4: 0 }, questions)[q4Index],
    `abstain->'${encode({ q4: ABSTAIN }, questions)[q4Index]}' unsure->'${encode({ q4: 0 }, questions)[q4Index]}'`);
  console.log(`  NOTE  encoded length ${encode(r, questions).length} chars for ${questions.length} questions`);
}

// ---------------------------------------------------------------------------------------------
console.log('\nCOORDINATE DERIVATION CALIBRATION');
{
  const byName = new Map(agendas.map((a) => [a.name.toLowerCase(), a]));
  for (const exp of calibration.agenda_sign_expectations) {
    const a = byName.get(exp.agenda.toLowerCase());
    if (!a) { check(`${exp.agenda} exists`, false); continue; }
    const bad = Object.entries(exp.expect as Record<string, number>).filter(
      ([axis, sign]) => a.coordinates[axis] == null || Math.sign(a.coordinates[axis]!) !== sign);
    check(`${exp.agenda}: ${Object.keys(exp.expect).join(', ')}`, bad.length === 0,
      bad.map(([ax, s]) => `${ax} expected sign ${s}, got ${a.coordinates[ax]}`).join('; '));
  }

  for (const axis of calibration.null_expectations.must_be_null_on_all_technical_agendas) {
    const nonNull = agendas.filter((a) => a.coordinates[axis] != null);
    check(`${axis} is null on all technical agendas (nothing imputed)`,
      nonNull.length === 0, nonNull.slice(0, 3).map((a) => a.name).join(', '));
  }
}

// ---------------------------------------------------------------------------------------------
console.log('\nDATA PROVENANCE (spec §18: every coordinate shows a source or an assigned flag)');
{
  const missing: string[] = [];
  for (const a of agendas) {
    for (const [axis, v] of Object.entries(a.coordinates)) {
      if (v === null) continue;
      if (!a.coordinate_sources?.[axis]) missing.push(`${a.name}:${axis}`);
    }
  }
  check('every non-null agenda coordinate carries a source', missing.length === 0,
    missing.slice(0, 5).join(', '));

  const noMethod = agendas.filter((a) => !a.fte_2025.method);
  check('every FTE estimate carries a method string', noMethod.length === 0,
    noMethod.slice(0, 3).map((a) => a.name).join(', '));
}

// ---------------------------------------------------------------------------------------------
console.log('\nUI CONTRACTS');
{
  // <Caveat> throws on an unknown id by design — a caveat that silently vanishes is worse than
  // one never written. That makes every id in src/ a hard dependency worth checking here rather
  // than discovering as a white screen.
  const caveatsFile = readJson<{ caveats: { id: string; surfaces: string[] }[]; disclaimers: any }>(
    'data/content/caveats.json');
  const known = new Set(caveatsFile.caveats.map((c) => c.id));

  const srcText = (function walk(dir: string): string {
    let out = '';
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      out += e.isDirectory() ? walk(full) : (e.name.endsWith('.tsx') || e.name.endsWith('.ts'))
        ? fs.readFileSync(full, 'utf8') : '';
    }
    return out;
  })(path.join(ROOT, 'src'));

  // The caveats used to render through a <Caveat id> component. They are now written into the
  // prose of the surfaces they apply to, because rendering the same block on six pages trained
  // readers to skip all of them. So this checks that the SUBSTANCE survived the rewrite: each
  // caveat declares a phrase that must still appear somewhere in src/. If a rewrite drops the
  // idea, this fails — which is the thing worth protecting, not the component.
  const required: Record<string, string> = {
    'job-board-coverage-bias': 'not a signal',
    'lab-internal-funding': 'lab revenue',
    'orgs-as-points': 'single point',
    'researcher-citations-not-attributions': 'not a stated view',
    'neglectedness-is-not-a-recommendation': 'because nobody has tried',
    'policy-returns-may-increase': 'being ignored rather than being early',
    'sensitivity': 'general rather than coy',
    'tag-strength': 'From the organization',
    'snapshot': 'Snapshot',
    'coordinates-are-derived-not-endorsed': 'rather than being set to the middle',
  };
  const missingIdea = Object.entries(required)
    .filter(([, phrase]) => !srcText.includes(phrase))
    .map(([id]) => id);
  check('every caveat\'s substance still appears in the UI', missingIdea.length === 0,
    missingIdea.join(', '));

  const undeclared = [...known].filter((id) => !(id in required));
  check('every caveat in caveats.json has a phrase to check for', undeclared.length === 0,
    undeclared.join(', '));

  // Spec §14: the government disclaimer variant flag defaults to 'a', and b ships empty.
  check('government disclaimer variant defaults to a',
    caveatsFile.disclaimers.disclaimer_government_a.text.length > 0
    && caveatsFile.disclaimers.disclaimer_government_b.text === '');
}

console.log('');
if (failures) { console.log(`${failures} FAILURE(S)\n`); process.exit(1); }
console.log('all checks passed\n');
