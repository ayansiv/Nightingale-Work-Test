/**
 * Culture matching (Phase 5).
 *
 * A second axis space, composed SEQUENTIALLY with the belief space:
 *
 *   beliefs  -> which agendas and policy levers are worth your time  (scoring.ts)
 *   roles    -> the openings attached to those                       (data)
 *   culture  -> reranks the ORGANIZATIONS offering those roles       (here)
 *
 * Culture never adds a role to the set, never removes one, and never reorders agendas. A joint
 * belief-plus-culture distance would let a strong culture fit pull someone toward an agenda they
 * think is doomed, which is exactly backwards for a careers tool.
 *
 * The aggregation, coverage counting and abstain handling are REUSED from scoring.ts rather than
 * copied — `computeAxes` is generic over an axis list, so both spaces get the same guarantees
 * (abstain drops the item not the axis; an axis with nothing answered is absent, not zero) from
 * one implementation. What is kept strictly separate is the DATA: no belief axis id ever appears
 * in a culture score and vice versa, which verify asserts in both directions.
 */

import {
  computeAxes, coverageFactor, ABSTAIN,
  type Axis, type AxisScores, type Question, type Responses,
} from './scoring';

export interface CultureAxis extends Omit<Axis, 'scope' | 'question'> {
  weight: number;
}

/** An org's culture placement. A weaker kind of claim than an agenda coordinate — see `source`. */
export interface CulturePlacement {
  /** axis id -> value in [-1,1], or null. Null is first-class: it drops the axis. */
  coordinates: Record<string, number | null>;
  /** Who assessed it and when. An undated assessment must not render. */
  assessor: string;
  assessed_on: string;
  confidence: 'High' | 'Medium' | 'Low';
  /** The prose the score came from, so a coordinate traces back to the sentence that produced it. */
  notes?: Record<string, string>;
}

export interface CultureOrg {
  id: string;
  name: string;
  culture: CulturePlacement | null;
  primary_agenda_id: string | null;
  maturity_tier: string;
  postings_count: number;
}

export function computeCultureAxes(
  responses: Responses,
  questions: Question[],
  axes: CultureAxis[],
): AxisScores {
  // Culture axes have no scope; give them one so the shared implementation applies unchanged.
  const asAxes = axes.map((a) => ({ ...a, scope: 'core' as const, question: a.label }));
  return computeAxes(responses, questions, asAxes);
}

export interface CultureFit {
  org: CultureOrg;
  /** Culture fit alone, before any belief penalty. [0,1]. */
  cultureFit: number;
  /** How much the house-view cross-term cost this org. Always displayed, never silent. */
  beliefPenalty: number;
  /** cultureFit - beliefPenalty. */
  score: number;
  axesUsed: number;
  axesDropped: number;
  /** The axes where user and org are furthest apart, for "you may find X here" copy. */
  frictions: { axis: string; label: string; userValue: number; orgValue: number; distance: number }[];
  /** Present only when the house-view term actually bit. */
  houseViewNote: string | null;
}

/**
 * Rerank organizations by culture fit.
 *
 * `orgBeliefDistance` is supplied by the caller — it is the user's belief distance from the org's
 * PRIMARY AGENDA, because orgs carry no belief coordinates of their own (policy, see
 * culture-axes.json). Pass 0 where the org has no primary agenda: cross-agenda orgs like MATS and
 * Constellation have a deliberately open agenda, so the cross-term is undefined rather than zero-
 * by-accident, and they stay fully culture-matchable. That is the right result — a MATS placement
 * is exactly the case where "who thrives here" is the decision-relevant question.
 */
export function rankByCulture(
  userScores: AxisScores,
  orgs: CultureOrg[],
  axes: CultureAxis[],
  orgBeliefDistance: (org: CultureOrg) => number | null,
  kappa: number,
): CultureFit[] {
  const out: CultureFit[] = [];

  for (const org of orgs) {
    if (!org.culture) continue;

    let num = 0;
    let den = 0;
    let dropped = 0;
    const frictions: CultureFit['frictions'] = [];

    for (const axis of axes) {
      const u = userScores[axis.id];
      const t = org.culture.coordinates[axis.id];
      // Symmetric unknown handling, same rule as the belief matcher. A blank culture cell is
      // NOT zero: `?? 0` here would silently convert "unknown" into "exactly neutral" and nothing
      // in the UI would look wrong.
      if (!u || t === null || t === undefined) { dropped++; continue; }

      const c = coverageFactor(u);
      const d = Math.abs(u.value - t);
      num += axis.weight * c * d;
      den += axis.weight * c * 2;

      frictions.push({ axis: axis.id, label: axis.label, userValue: u.value, orgValue: t, distance: d });
    }

    if (den === 0) continue; // nothing in common — no match, rather than a zero-scoring one

    const cultureFit = 1 - num / den;

    // The one legitimate cross-term. A strong house view makes belief distance matter; a
    // pluralistic org makes it matter much less.
    const houseView = org.culture.coordinates['c_house_view'];
    const beliefDistance = orgBeliefDistance(org);
    let beliefPenalty = 0;
    let houseViewNote: string | null = null;

    if (houseView !== null && houseView !== undefined && beliefDistance !== null) {
      const strength = (1 - houseView) / 2; // 1.0 at strong shared position, 0.0 at pluralist
      beliefPenalty = strength * beliefDistance * kappa;
      if (beliefPenalty > 0.02) {
        houseViewNote =
          `This place holds a strong shared position, and you sit some distance from it. That ` +
          `matters more here than it would somewhere colleagues disagree openly.`;
      }
    }

    out.push({
      org,
      cultureFit,
      beliefPenalty,
      score: cultureFit - beliefPenalty,
      axesUsed: frictions.length,
      axesDropped: dropped,
      frictions: frictions.sort((a, b) => b.distance - a.distance).slice(0, 3),
      houseViewNote,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/**
 * Spec 5.3: "If the user's top-ranked agenda is pursued only by orgs scoring low on their culture
 * fit, say so explicitly." That gap is decision-relevant, and burying it inside a rank is the main
 * way this feature could mislead someone.
 */
export function tensionWarning(
  topAgendaName: string,
  fitsForTopAgenda: CultureFit[],
  threshold = 0.5,
): string | null {
  if (fitsForTopAgenda.length === 0) return null;
  const best = Math.max(...fitsForTopAgenda.map((f) => f.cultureFit));
  if (best >= threshold) return null;
  return (
    `Worth knowing: ${topAgendaName} came out top on your beliefs, but none of the organizations ` +
    `working on it look like a comfortable fit for how you want to work. That is a real tension, ` +
    `not a scoring artefact — the work you think matters most and the places doing it may not be ` +
    `the same answer.`
  );
}

export { ABSTAIN };
