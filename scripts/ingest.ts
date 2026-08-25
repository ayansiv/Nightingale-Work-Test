/**
 * `npm run ingest`, rebuilds everything in data/derived/ from data/raw/ plus the committed
 * classification tables.
 *
 * Snapshot ingest (Build Spec: data is pulled once, reviewed, and committed). Kept idempotent and
 * ordered so that going live later is a cron job rather than a rewrite.
 *
 * ORDER MATTERS. ingest-roles.ts writes postings_count back onto agendas.json, so it must run
 * after ingest-agendas.ts creates that file. Running them the other way round silently produces
 * agendas with no posting counts, which is the kind of failure that looks like real data.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const steps = [
  { name: 'agendas  (Shallow Review 2025 -> 74 technical agendas, coordinates derived)', script: 'ingest-agendas.ts' },
  { name: 'roles    (80k board -> roles, orgs, review queue; postings back onto agendas)', script: 'ingest-roles.ts' },
  // Skips cleanly and writes an empty file when the sheet is not present, so the app builds
  // either way. Phase 5 is strictly additive.
  { name: 'culture  (org culture intake -> org-culture.json, if the sheet is present)', script: 'ingest-culture.ts' },
];

for (const [i, step] of steps.entries()) {
  console.log(`\n${'='.repeat(78)}\n[${i + 1}/${steps.length}] ${step.name}\n${'='.repeat(78)}`);
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules/tsx/dist/cli.mjs'), path.join(ROOT, 'scripts', step.script)],
    { stdio: 'inherit', cwd: ROOT },
  );
  if (r.status !== 0) {
    console.error(`\ningest failed at step ${i + 1} (${step.script}). Nothing further was written.`);
    process.exit(r.status ?? 1);
  }
}

console.log(`\n${'='.repeat(78)}`);
console.log('ingest complete. Run `npm run verify` before committing, it checks the acceptance');
console.log('criteria that silently stop holding, and the coordinate-derivation calibration.');
