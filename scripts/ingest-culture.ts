/**
 * Ingest: org-culture-intake.xlsx -> data/derived/org-culture.json
 *
 * Runs against a file that does not exist yet. That is the point: when the sheet lands this is a
 * file drop plus `npm run ingest`, not a build.
 *
 * Two tabs are inputs.
 *
 *   "Scoring (Ayan)"  the coordinates. Band, Organization, Reworded description, then the nine
 *                     culture axes IN THE ORDER DECLARED BY culture-axes.json, then Maturity tier,
 *                     Source, Scored on.
 *   "Orgs (Sydney)"   the prose the scores came from. Kept as the audit trail so a coordinate can
 *                     be traced to the sentence that produced it, the same way an agenda
 *                     coordinate traces to its stated assumption.
 *
 * The rules that matter, all of which fail loudly rather than quietly:
 *
 *   BLANK IS NULL, NEVER ZERO. A blank culture cell drops that axis from the org's distance
 *   calculation, exactly as a user skip does. `?? 0` here would convert "we don't know" into
 *   "exactly neutral" and nothing in the UI would look wrong.
 *
 *   FAIL CLOSED ON A HEADER MISMATCH. Two people will edit this file. If the columns are not what
 *   we expect, abort with the diff rather than positional-mapping into the wrong axes, a silently
 *   shifted column would put every org's "pace" score into "visibility".
 *
 *   UNMATCHED ROWS GO TO A REVIEW FILE, never silently dropped. The 80k feed already contains
 *   "Model Evaluation and Threat Research" where a human would write "METR"; expect more.
 *
 *   AN UNDATED ASSESSMENT DOES NOT SHIP. Same rule as researcher placements.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = <T>(p: string): T => JSON.parse(read(p));

const INTAKE = 'data/raw/org-culture-intake.xlsx';
const SHEET_SCORING = 'Scoring (Ayan)';
const SHEET_PROSE = 'Orgs (Sydney)';

const cultureAxes = readJson<{ axes: { id: string; label: string }[] }>('data/config/culture-axes.json').axes;

/** Exact expected header, in order. A mismatch aborts. */
const EXPECTED_SCORING_HEADER = [
  'Band', 'Organization', 'Reworded description',
  ...cultureAxes.map((a) => a.label),
  'Maturity tier', 'Source', 'Scored on',
];

interface CultureRow {
  id: string;
  name: string;
  band: string;
  description: string;
  coordinates: Record<string, number | null>;
  maturity_tier: string;
  assessor: string;
  assessed_on: string;
  confidence: 'High' | 'Medium' | 'Low';
  notes: Record<string, string>;
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function fail(msg: string): never {
  console.error(`\nFATAL: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const abs = path.join(ROOT, INTAKE);
  if (!fs.existsSync(abs)) {
    // Not an error. The rest of the app is designed to work without this file.
    console.log(`culture: ${INTAKE} not present, skipping.`);
    console.log('         Orgs will rank on beliefs alone and the culture instrument stays hidden.');
    fs.mkdirSync(path.join(ROOT, 'data/derived'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'data/derived/org-culture.json'),
      JSON.stringify({ generated_at: null, source: null, orgs: [] }, null, 2));
    return;
  }

  // Imported lazily, and through a variable specifier, so `xlsx` is only needed once the sheet
  // actually exists, the repo typechecks and builds without it installed.
  const spec = 'xlsx';
  const XLSX: any = await import(/* @vite-ignore */ spec).catch(() =>
    fail('org-culture-intake.xlsx is present but the `xlsx` package is not installed. Run: npm i -D xlsx'));

  const wb = XLSX.readFile(abs);
  for (const tab of [SHEET_SCORING, SHEET_PROSE]) {
    if (!wb.SheetNames.includes(tab)) {
      fail(`workbook has no tab named "${tab}". Found: ${wb.SheetNames.join(', ')}`);
    }
  }

  const scoring: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[SHEET_SCORING], { header: 1, blankrows: false });
  const header = (scoring[0] ?? []).map((h: any) => String(h ?? '').trim());

  const missing = EXPECTED_SCORING_HEADER.filter((h) => !header.includes(h));
  const extra = header.filter((h) => h && !EXPECTED_SCORING_HEADER.includes(h));
  if (missing.length || header.length < EXPECTED_SCORING_HEADER.length) {
    fail(
      `"${SHEET_SCORING}" header does not match.\n` +
      `  missing : ${missing.join(', ') || '(none)'}\n` +
      `  extra   : ${extra.join(', ') || '(none)'}\n` +
      `  Refusing to map positionally, a shifted column would put every org's score on the wrong axis.`,
    );
  }
  const col = (name: string) => header.indexOf(name);

  // ---- prose tab, for the audit trail -------------------------------------------------------
  const prose: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[SHEET_PROSE], { defval: '' });
  const proseByOrg = new Map<string, Record<string, string>>();
  for (const r of prose) {
    const name = String(r['Organization'] ?? '').trim();
    // Row 2 is a labelled example row in the template.
    if (!name || name.toUpperCase().startsWith('EXAMPLE')) continue;
    proseByOrg.set(name, r as Record<string, string>);
  }

  // ---- scoring rows -------------------------------------------------------------------------
  const rows: CultureRow[] = [];
  const undated: string[] = [];

  for (const raw of scoring.slice(1)) {
    const name = String(raw[col('Organization')] ?? '').trim();
    if (!name || name.toUpperCase().startsWith('EXAMPLE')) continue;

    const coordinates: Record<string, number | null> = {};
    for (const axis of cultureAxes) {
      const cell = raw[col(axis.label)];
      // Blank, empty string and whitespace are all NULL. Only a real number becomes a value.
      const isBlank = cell === undefined || cell === null || String(cell).trim() === '';
      const n = isBlank ? null : Number(cell);
      if (!isBlank && (Number.isNaN(n!) || n! < -1 || n! > 1)) {
        fail(`${name}: "${axis.label}" is "${cell}", expected a number between -1 and 1, or blank.`);
      }
      coordinates[axis.id] = isBlank ? null : n;
    }

    const assessedOn = String(raw[col('Scored on')] ?? '').trim();
    if (!assessedOn) { undated.push(name); continue; }

    const p = proseByOrg.get(name);
    rows.push({
      id: slug(name),
      name,
      band: String(raw[col('Band')] ?? '').trim(),
      description: String(raw[col('Reworded description')] ?? '').trim(),
      coordinates,
      maturity_tier: String(raw[col('Maturity tier')] ?? '').trim(),
      assessor: String(raw[col('Source')] ?? '').trim(),
      assessed_on: assessedOn,
      confidence: (p?.['Confidence']?.trim() as CultureRow['confidence']) || 'Low',
      notes: p
        ? Object.fromEntries(Object.entries(p)
            .filter(([k, v]) => v && !['Band', 'Organization', 'Open roles', 'Main location', 'Website', 'Confidence'].includes(k))
            .map(([k, v]) => [k, String(v)]))
        : {},
    });
  }

  // ---- join against the roles feed -----------------------------------------------------------
  const orgs = readJson<{ orgs: { id: string; name: string }[] }>('data/derived/orgs.json').orgs;
  const known = new Map(orgs.map((o) => [o.name, o]));

  const matched = rows.filter((r) => known.has(r.name));
  const unmatchedInSheet = rows.filter((r) => !known.has(r.name));
  const notInSheet = orgs.filter((o) => !rows.some((r) => r.name === o.name));

  fs.writeFileSync(path.join(ROOT, 'data/derived/org-culture.json'), JSON.stringify({
    generated_at: new Date().toISOString().slice(0, 10),
    source: `${INTAKE} :: ${SHEET_SCORING}`,
    orgs: matched,
  }, null, 2));

  fs.writeFileSync(path.join(ROOT, 'data/derived/culture-join-review.json'), JSON.stringify({
    generated_at: new Date().toISOString().slice(0, 10),
    what: 'Rows that did not join cleanly between the culture sheet and the job-board feed. '
        + 'Name drift is expected, the feed writes "Model Evaluation and Threat Research" where a '
        + 'person writes "METR". Resolve by editing the sheet to the feed spelling, or by adding an '
        + 'alias to orgs.csv.',
    in_sheet_not_in_feed: unmatchedInSheet.map((r) => r.name),
    in_feed_not_in_sheet: notInSheet.map((o) => o.name),
    undated_and_therefore_dropped: undated,
  }, null, 2));

  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(0)}%` : ', ');
  console.log(`culture rows read     : ${rows.length + undated.length}`);
  console.log(`  joined to the feed  : ${matched.length} (${pct(matched.length, orgs.length)} of ${orgs.length} orgs)`);
  console.log(`  in sheet, not feed  : ${unmatchedInSheet.length}`);
  console.log(`  in feed, not sheet  : ${notInSheet.length}`);
  if (undated.length) {
    console.log(`  DROPPED, no date    : ${undated.length}  ${undated.slice(0, 5).join(', ')}`);
    console.log('                        An undated culture assessment does not render.');
  }
  if (unmatchedInSheet.length || notInSheet.length) {
    console.log('  -> data/derived/culture-join-review.json');
  }

  const blanks = matched.reduce((n, r) =>
    n + Object.values(r.coordinates).filter((v) => v === null).length, 0);
  console.log(`  blank cells kept as null (not zero): ${blanks}`);
}

main();
