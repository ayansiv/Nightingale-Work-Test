/**
 * Estimation helpers.
 *
 * House rule, from Build Spec §17: a cell reading "estimated, method: X" is doing the work the
 * product exists to do. So no number leaves this file without a `method` string written for a
 * reader, not for a developer. Where we are guessing, the cell says we are guessing.
 */

import type { Estimate } from './types.js';

/**
 * Shallow Review publishes FTE as a human-written range: "10-50", "5 - 15", "100+", "30".
 * Returns the midpoint plus the range, so the UI can show "30 (range 10–50)" rather than a
 * false-precision point estimate.
 */
export function parseFteRange(raw: string, sourceLabel: string): Estimate {
  const s = (raw ?? '').trim();
  if (!s) {
    return {
      value: null,
      flag: 'unknown',
      method: 'Shallow Review 2025 left this agenda\'s FTE count blank. Not imputed.',
    };
  }

  const plus = s.match(/^(\d+)\s*\+$/);
  if (plus) {
    const low = Number(plus[1]);
    return {
      value: low * 1.5,
      low,
      high: low * 2,
      flag: 'estimated',
      method: `Source gives "${s}" (open-ended). Shown as ${low * 1.5} using an open-ended-range convention of 1.5x the stated floor; the true value is at least ${low}.`,
      source: sourceLabel,
    };
  }

  const range = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    return {
      value: (low + high) / 2,
      low,
      high,
      flag: 'estimated',
      method: `Midpoint of the ${low}–${high} range published by ${sourceLabel}. The range is the source's own; the midpoint is ours.`,
      source: sourceLabel,
    };
  }

  const point = s.match(/^(\d+)$/);
  if (point) {
    const v = Number(point[1]);
    return {
      value: v,
      low: v,
      high: v,
      flag: 'sourced',
      method: `Stated as ${v} by ${sourceLabel}.`,
      source: sourceLabel,
    };
  }

  return {
    value: null,
    flag: 'unknown',
    method: `Could not parse the source value "${s}". Left unknown rather than guessed.`,
    source: sourceLabel,
  };
}

/**
 * Project 2026 headcount from 2025.
 *
 * Anchor: the AI Safety Field Growth Analysis 2025 measures 21% annual FTE growth and 24%
 * annual growth in the number of technical AI safety organizations, on a base of 645 FTEs
 * across 70 orgs. We apply the FTE figure, not the org figure.
 *
 * This is deliberately a FLAT rate applied to every agenda. We know that is wrong in detail ,
 * interpretability and evals are visibly growing faster than agent foundations, but we have no
 * per-agenda growth series, and inventing differential rates would dress up a guess as a
 * finding. A flat rate is wrong in a way the reader can see and correct; a hand-tuned per-agenda
 * rate is wrong in a way they cannot. Owner overrides land in data/classification/fte-overrides.csv.
 */
export const FIELD_FTE_GROWTH_RATE = 0.21;

export function projectFte(fte2025: Estimate): Estimate {
  if (fte2025.value == null) {
    return {
      value: null,
      flag: 'unknown',
      method: 'No 2025 baseline, so no projection. Not imputed.',
    };
  }
  const v = Math.round(fte2025.value * (1 + FIELD_FTE_GROWTH_RATE));
  return {
    value: v,
    low: fte2025.low != null ? Math.round(fte2025.low * (1 + FIELD_FTE_GROWTH_RATE)) : undefined,
    high: fte2025.high != null ? Math.round(fte2025.high * (1 + FIELD_FTE_GROWTH_RATE)) : undefined,
    flag: 'estimated',
    method:
      `2025 baseline grown at ${(FIELD_FTE_GROWTH_RATE * 100).toFixed(0)}%, the field-wide annual FTE ` +
      'growth rate measured in AI Safety Field Growth Analysis 2025. Applied flat across all agendas ' +
      'because no per-agenda growth series exists, the rank order of this column is more trustworthy ' +
      'than any individual cell.',
    source: 'AI Safety Field Growth Analysis 2025',
  };
}

export function placeholder(what: string, ownerItem: string): Estimate {
  return {
    value: null,
    flag: 'placeholder',
    method: `${what} Awaiting owner input, see OWNER-DATA.md item ${ownerItem}. The app runs with this null; it renders as "not yet collected", never as zero.`,
  };
}
