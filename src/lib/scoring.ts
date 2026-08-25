/**
 * Scoring and matching (Build Spec §5).
 *
 * Two invariants run through everything here, and both are acceptance criteria:
 *
 *   1. ABSTAIN IS NOT UNSURE. "Unsure" is a considered midpoint of 0.0 that enters the mean.
 *      Abstain removes the item from scoring entirely. An axis leaves the metric only when
 *      EVERY item loading on it is abstained, not when one is.
 *
 *   2. UNKNOWN IS SYMMETRIC. A target with null on an axis drops that axis from its own distance
 *      calculation, exactly as a user abstention does. Never impute, never centre.
 */

export type AxisId = string;
export type Scope = 'core' | 'technical' | 'policy';
export type Domain = 'technical' | 'policy';

export interface Axis {
  id: AxisId;
  label: string;
  low_pole_label: string;
  high_pole_label: string;
  scope: Scope;
  weight: number;
  question: string;
}

export interface Question {
  id: string;
  order: number;
  section: string;
  response_type: 'credence' | 'agreement' | 'willingness' | 'spectrum';
  text: string;
  loadings: Record<AxisId, number>;
  reverse_scored?: boolean;
  /** For `spectrum` items: the named ends of the 5-point scale. */
  spectrum_poles?: { low: string; high: string };
}

/** ABSTAIN is a distinct value, not a null and not a zero. */
export const ABSTAIN = Symbol('abstain');
export type Response = number | typeof ABSTAIN | undefined;
export type Responses = Record<string, Response>;

export interface AxisScore {
  axis: AxisId;
  value: number;
  /** Number of answered contributing items. An axis from one item is a different object from one
   *  from three, and the distance metric weights by this. */
  coverage: number;
  /** Total contributing items, answered or not. coverage/total is what the UI shows. */
  contributingItems: number;
}

export type AxisScores = Record<AxisId, AxisScore>;

/**
 * axis_k = Σ (L_qk · r_q) / Σ |L_qk|   over ANSWERED q where L_qk ≠ 0
 *
 * An axis with zero answered contributing items is ABSENT from the returned map, not present
 * with value 0. That distinction is the whole point; a caller that does `scores[axis] ?? 0`
 * has reintroduced the bug this design exists to prevent.
 */
export function computeAxes(
  responses: Responses,
  questions: Question[],
  axes: Axis[],
): AxisScores {
  const out: AxisScores = {};

  for (const axis of axes) {
    const contributing = questions.filter((q) => (q.loadings[axis.id] ?? 0) !== 0);
    if (contributing.length === 0) continue;

    let num = 0;
    let den = 0;
    let coverage = 0;

    for (const q of contributing) {
      const r = responses[q.id];
      // Abstain and unanswered both drop the ITEM. Neither drops the axis on its own.
      if (r === ABSTAIN || r === undefined) continue;
      const L = q.loadings[axis.id];
      num += L * r;
      den += Math.abs(L);
      coverage++;
    }

    // Every contributing item abstained -> the axis is excluded entirely, NOT imputed to zero.
    if (coverage === 0 || den === 0) continue;

    out[axis.id] = {
      axis: axis.id,
      value: Math.max(-1, Math.min(1, num / den)),
      coverage,
      contributingItems: contributing.length,
    };
  }

  return out;
}

/**
 * Coverage factor c_k. An axis resting on one answered item should not push the match around as
 * hard as one resting on three.
 *
 * sqrt rather than linear: the second item adds more confidence than the third does, and a linear
 * factor would make single-item axes (of which there are five in the shipped config) nearly
 * weightless, which overcorrects.
 */
export function coverageFactor(s: AxisScore): number {
  return Math.sqrt(s.coverage / s.contributingItems);
}

/**
 * Joint takeover risk = p_mis' × p_scheme' × (1 − containment'), on [0,1]-rescaled values.
 *
 * DISPLAY ONLY. Spec §5: "The three link axes each carry full weight in the distance metric; the
 * joint does not enter scoring. Otherwise the misalignment story is weighted four times and
 * dominates every match." Nothing in this module's matching path calls this function, and
 * scripts/verify-data.ts asserts that.
 */
export function jointTakeoverRisk(scores: AxisScores): number | null {
  const rescale = (v: number) => (v + 1) / 2;
  const mis = scores['p_mis'];
  const scheme = scores['p_scheme'];
  const contain = scores['containment'];
  if (!mis || !scheme || !contain) return null;
  return rescale(mis.value) * rescale(scheme.value) * (1 - rescale(contain.value));
}

export interface ConsistencyFlag {
  axis: AxisId;
  questionA: string;
  questionB: string;
  valueA: number;
  valueB: number;
  gap: number;
  topic: string;
}

/**
 * Where two items loading on the same axis disagree past the threshold, surface it rather than
 * silently averaging. Spec §5 calls this the best pedagogical surface in the instrument, and it
 * exists only because questions outnumber axes.
 *
 * The comparison is on LOADING-ADJUSTED values, not raw responses. q18 (+0.9) and q19 (−0.7) are
 * consistent when someone strongly agrees with one and strongly disagrees with the other, that
 * is the same position stated twice. Comparing raw responses would flag the consistent case and
 * miss the inconsistent one.
 */
export function consistencyFlags(
  responses: Responses,
  questions: Question[],
  pairs: { axis: AxisId; a: string; b: string; threshold: number; topic: string }[],
): ConsistencyFlag[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const flags: ConsistencyFlag[] = [];

  for (const pair of pairs) {
    const qa = byId.get(pair.a);
    const qb = byId.get(pair.b);
    if (!qa || !qb) continue;

    const ra = responses[pair.a];
    const rb = responses[pair.b];
    if (ra === ABSTAIN || rb === ABSTAIN || ra === undefined || rb === undefined) continue;

    const la = qa.loadings[pair.axis] ?? 0;
    const lb = qb.loadings[pair.axis] ?? 0;
    if (la === 0 || lb === 0) continue;

    // Project each response onto the axis direction.
    const va = Math.sign(la) * ra;
    const vb = Math.sign(lb) * rb;
    const gap = Math.abs(va - vb);

    if (gap > pair.threshold) {
      flags.push({
        axis: pair.axis, questionA: pair.a, questionB: pair.b,
        valueA: ra, valueB: rb, gap, topic: pair.topic,
      });
    }
  }

  return flags;
}

export interface Target {
  id: string;
  name: string;
  domain: Domain;
  coordinates: Record<AxisId, number | null>;
}

export interface AxisContribution {
  axis: AxisId;
  label: string;
  userValue: number;
  targetValue: number;
  distance: number;
  /** How much this axis moved the score. Used for "mostly because..." explanations. */
  weightedContribution: number;
}

export interface MatchResult {
  target: Target;
  score: number;
  /** Axes that entered the calculation, both sides had a value. */
  axesUsed: number;
  /** Axes in scope that were dropped because one side had nothing. */
  axesDropped: number;
  contributions: AxisContribution[];
  explanation: string;
}

/**
 * score(target) = 1 − ( Σ w_k · c_k · |u_k − t_k| ) / ( Σ w_k · c_k · 2 )
 *
 * The `2` normalises: |u−t| maxes at 2 on a [−1,1] axis, so without it a maximally distant
 * target scores −1 rather than 0.
 *
 * Domain gating: technical targets score on core + technical axes, policy targets on core +
 * policy. The two lists are returned separately and never merged.
 */
export function matchTarget(
  userScores: AxisScores,
  target: Target,
  axes: Axis[],
): MatchResult | null {
  const inScope = axes.filter((a) => a.scope === 'core' || a.scope === target.domain);

  let num = 0;
  let den = 0;
  const contributions: AxisContribution[] = [];
  let dropped = 0;

  for (const axis of inScope) {
    const u = userScores[axis.id];
    const t = target.coordinates[axis.id];

    // Symmetric unknown handling. Either side missing drops the axis.
    if (!u || t === null || t === undefined) { dropped++; continue; }

    const c = coverageFactor(u);
    const w = axis.weight;
    const d = Math.abs(u.value - t);

    num += w * c * d;
    den += w * c * 2;

    contributions.push({
      axis: axis.id,
      label: axis.label,
      userValue: u.value,
      targetValue: t,
      distance: d,
      weightedContribution: w * c * d,
    });
  }

  if (den === 0) return null; // nothing in common; not a zero-scoring match, no match at all

  const score = 1 - num / den;

  // Explanation: the axes that AGREE most are what pulled the score up. Report those, since
  // "you matched because you disagree least about X" is not what a reader wants to hear.
  const agreeing = [...contributions]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .filter((c) => c.distance < 0.6);

  return {
    target,
    score,
    axesUsed: contributions.length,
    axesDropped: dropped,
    contributions: contributions.sort((a, b) => b.weightedContribution - a.weightedContribution),
    explanation: agreeing.length
      ? `Mostly because you and this agenda are close on ${agreeing.map((c) => c.label.toLowerCase()).join(', ')}.`
      : 'No axis puts you especially close to this one.',
  };
}

/** Returns two ranked lists. Never merged, spec §5. */
export function match(
  userScores: AxisScores,
  targets: Target[],
  axes: Axis[],
): { technical: MatchResult[]; policy: MatchResult[] } {
  const run = (domain: Domain) =>
    targets
      .filter((t) => t.domain === domain)
      .map((t) => matchTarget(userScores, t, axes))
      .filter((r): r is MatchResult => r !== null)
      .sort((a, b) => b.score - a.score);

  return { technical: run('technical'), policy: run('policy') };
}
