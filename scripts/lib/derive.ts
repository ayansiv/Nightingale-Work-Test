/**
 * Agenda coordinate derivation (Build Spec §6).
 *
 * Every coordinate this module emits carries the source text it came from, so a reader can
 * audit the placement by following the link. Nothing here invents a number: it composes
 * contributions declared in data/config/derivation.json from fields published by the
 * Shallow Review 2025 pipeline.
 */

import type { AxisId, Coordinates, CoordinateSources } from './types.js';

export interface DerivationConfig {
  orthodox_problems: Record<string, { loadings: Partial<Record<AxisId, number>>; why: string }>;
  families: Record<
    string,
    {
      loadings: Partial<Record<AxisId, number>>;
      why: string;
      /**
       * Axes this family is DEFINED by. On these, the family prior carries
       * `composition.weights.family_authoritative` instead of `.family`.
       *
       * Calibration found the need for this. An agenda listing an orthodox problem is often
       * naming the problem its method attacks, not asserting a belief. Debate lists
       * "Superintelligence can fool human supervisors" and is nonetheless squarely behavioural;
       * without this exception the derivation read that citation as an argument FOR
       * interpretability and flipped Debate's internals coordinate positive.
       *
       * It outweighs rather than overrides: the assumptions still move the magnitude.
       */
      authoritative?: AxisId[];
    }
  >;
  target_case: Record<string, { loadings: Partial<Record<AxisId, number>>; why: string }>;
  broad_approach: Record<string, { loadings: Partial<Record<AxisId, number>>; why: string }>;
  composition: {
    weights: {
      family: number;
      family_authoritative: number;
      target_case: number;
      broad_approach: number;
      orthodox_problem: number;
    };
    clamp: [number, number];
    min_contributions_for_value: number;
  };
  not_derivable: { axes: AxisId[]; note: string };
}

/** One traceable reason a coordinate has the value it has. */
export interface Contribution {
  kind: 'family' | 'target_case' | 'broad_approach' | 'orthodox_problem';
  /** The exact source text, quoted from the Shallow Review row. */
  source: string;
  value: number;
  weight: number;
  why: string;
}

/**
 * `orthodox_problems` is a comma-joined list drawn from a closed vocabulary, and two members of
 * that vocabulary contain literal commas:
 *
 *   "A boxed AGI might exfiltrate itself by steganography, spearphishing"
 *   "Fair, sane pivotal processes"
 *
 * so a naive `.split(',')` shreds them into fragments ("spearphishing", "Fair") that match
 * nothing. Tokenize longest-vocabulary-entry-first against the remaining string instead.
 */
export function parseOrthodoxProblems(raw: string, vocabulary: string[]): {
  matched: string[];
  unmatched: string[];
} {
  const matched: string[] = [];
  const unmatched: string[] = [];
  let rest = (raw ?? '').trim();
  if (!rest) return { matched, unmatched };

  const byLength = [...vocabulary].sort((a, b) => b.length - a.length);

  while (rest.length > 0) {
    rest = rest.replace(/^[,\s]+/, '');
    if (!rest) break;

    const hit = byLength.find((v) => rest.toLowerCase().startsWith(v.toLowerCase()));
    if (hit) {
      matched.push(hit);
      rest = rest.slice(hit.length);
      continue;
    }
    // Unknown term: consume up to the next comma so one surprise does not eat the rest.
    const comma = rest.indexOf(',');
    const term = (comma === -1 ? rest : rest.slice(0, comma)).trim();
    if (term) unmatched.push(term);
    rest = comma === -1 ? '' : rest.slice(comma + 1);
  }

  return { matched, unmatched };
}

/** `broad_approach_text` values are compound: "engineering / cognitive". */
function splitApproach(raw: string): string[] {
  return (raw ?? '')
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    // The source spells this both ways.
    .map((s) => (s === 'behavioural' ? 'behavioral' : s));
}

function lookupApproach(
  token: string,
  table: DerivationConfig['broad_approach'],
): { loadings: Partial<Record<AxisId, number>>; why: string } | undefined {
  const direct = table[token];
  if (direct) return direct;
  // "maths / philosophy" arrives as two tokens after the split; both point at the same entry.
  const compound = Object.keys(table).find((k) => splitApproach(k).includes(token));
  return compound ? table[compound] : undefined;
}

export interface AgendaSourceRow {
  section: string;
  target_case_text: string;
  broad_approach_text: string;
  orthodox_problems: string;
}

export interface DerivationResult {
  coordinates: Coordinates;
  coordinate_sources: CoordinateSources;
  /** Full audit trail, per axis. Rendered in-product under "how this placement was derived". */
  contributions: Partial<Record<AxisId, Contribution[]>>;
  unmatched_problems: string[];
}

export function deriveAgendaCoordinates(
  row: AgendaSourceRow,
  cfg: DerivationConfig,
  allAxisIds: AxisId[],
): DerivationResult {
  const contributions: Partial<Record<AxisId, Contribution[]>> = {};
  const w = cfg.composition.weights;

  const add = (
    kind: Contribution['kind'],
    source: string,
    weight: number,
    entry?: { loadings: Partial<Record<AxisId, number>>; why: string; authoritative?: AxisId[] },
  ) => {
    if (!entry) return;
    for (const [axis, value] of Object.entries(entry.loadings) as [AxisId, number][]) {
      const isAuthoritative = kind === 'family' && entry.authoritative?.includes(axis);
      (contributions[axis] ??= []).push({
        kind,
        source,
        value,
        weight: isAuthoritative ? w.family_authoritative : weight,
        why: isAuthoritative
          ? `${entry.why} (This is a defining commitment of the family, so it outweighs any single stated assumption.)`
          : entry.why,
      });
    }
  };

  add('family', row.section, w.family, cfg.families[row.section?.trim()]);
  add('target_case', row.target_case_text, w.target_case, cfg.target_case[row.target_case_text?.trim().toLowerCase()]);

  for (const token of splitApproach(row.broad_approach_text)) {
    add('broad_approach', token, w.broad_approach, lookupApproach(token, cfg.broad_approach));
  }

  const { matched, unmatched } = parseOrthodoxProblems(
    row.orthodox_problems,
    Object.keys(cfg.orthodox_problems),
  );
  for (const problem of matched) {
    add('orthodox_problem', problem, w.orthodox_problem, cfg.orthodox_problems[problem]);
  }

  const coordinates = {} as Coordinates;
  const coordinate_sources = {} as CoordinateSources;
  const [lo, hi] = cfg.composition.clamp;

  for (const axis of allAxisIds) {
    const cs = contributions[axis];
    if (!cs || cs.length < cfg.composition.min_contributions_for_value) {
      // Spec §7: unknown is a first-class value. Do not impute, do not centre.
      coordinates[axis] = null;
      continue;
    }
    const num = cs.reduce((s, c) => s + c.value * c.weight, 0);
    const den = cs.reduce((s, c) => s + c.weight, 0);
    coordinates[axis] = Math.max(lo, Math.min(hi, num / den));

    // The strongest contribution is what we surface first as the human-readable source.
    const lead = [...cs].sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight))[0];
    coordinate_sources[axis] = {
      kind: 'derived',
      source: lead.source,
      why: lead.why,
      contribution_count: cs.length,
    };
  }

  return { coordinates, coordinate_sources, contributions, unmatched_problems: unmatched };
}
