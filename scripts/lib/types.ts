/** Shared shapes for ingest and app. Mirrors Build Spec §8. */

export type AxisId = string;
export type Domain = 'technical' | 'policy';
export type Scope = 'core' | 'technical' | 'policy';

export type Coordinates = Record<AxisId, number | null>;

export type CoordinateSource =
  /** Composed from fields the agenda's own proponents published. Auditable by following the link. */
  | { kind: 'derived'; source: string; why: string; contribution_count: number }
  /** Owner judgement. Spec §6: "fall back to owner-assigned coordinates flagged as such." */
  | { kind: 'assigned'; by: string; why: string }
  /** A named person's position, as expressed in a specific dated piece. Never "believes". */
  | { kind: 'cited'; citation: string; url: string; date: string; quote?: string };

export type CoordinateSources = Record<AxisId, CoordinateSource | undefined>;

export interface Axis {
  id: AxisId;
  label: string;
  low_pole_label: string;
  high_pole_label: string;
  scope: Scope;
  weight: number;
  question: string;
}

export type EstimateFlag = 'sourced' | 'estimated' | 'placeholder' | 'unknown';

/** Every number the product shows carries one of these. Spec §17: "Sourcing is content, not chrome." */
export interface Estimate<T = number> {
  value: T | null;
  flag: EstimateFlag;
  /** Rendered verbatim in the table cell, e.g. "midpoint of the 10–50 range published by Shallow Review 2025". */
  method: string;
  /** Where the input came from. */
  source?: string;
  /** Plausible range, where one is meaningful. */
  low?: number;
  high?: number;
}

export interface Agenda {
  id: string;
  name: string;
  full_name: string;
  domain: Domain;
  family: string;
  sub_section: string;
  target_case: 'average' | 'pessimistic' | 'worst' | 'mixed' | null;
  broad_approach: string;
  one_sentence_summary: string;
  theory_of_change: string;
  assumptions: string[];
  coordinates: Coordinates;
  coordinate_sources: CoordinateSources;
  funding_philanthropic_usd: Estimate;
  /** Policy only. Government spend on a lever measures the size of the PROBLEM, not the response. Spec §9. */
  funding_government_usd: Estimate;
  org_count: Estimate;
  fte_2025: Estimate;
  fte_2026_est: Estimate;
  /** Share of summed field FTE. Scale-invariant, so it survives the ~3x disagreement between
   *  the two independent field-size measurements. This is the column neglectedness arguments
   *  should actually use. */
  fte_share_of_field?: Estimate;
  fte_method: string;
  postings_count: number;
  outputs_count: number;
  lab_coverage: 'primarily_lab_internal' | 'primarily_philanthropic' | 'mixed' | 'unknown';
  sensitivity_tier: 1 | 2 | 3;
  some_names: string[];
  critiques: string;
  funded_by: string;
  source_url: string;
}

export interface Org {
  id: string;
  name: string;
  aliases: string[];
  primary_agenda_id: string | null;
  secondary_agenda_ids: string[];
  maturity_tier: 'established' | 'new_entrant' | 'structurally_understaffed' | 'unknown';
  coordinates: Coordinates;
  coordinate_sources: CoordinateSources;
  description: string;
  homepage: string;
  vacancies_page: string;
  logo: string;
  tag_source: 'manual' | 'inferred_from_agenda_roster' | 'untagged';
  postings_count: number;
}

export interface Person {
  id: string;
  name: string;
  affiliation_org_id: string | null;
  coordinates: Coordinates;
  coordinate_sources: CoordinateSources;
  note: string;
  agenda_ids: string[];
}

export interface Role {
  id: string;
  title: string;
  org_id: string;
  org_name: string;
  agenda_id: string | null;
  tag_source: 'classified' | 'inherited' | 'manual' | 'untagged';
  /** Why this role landed on this agenda. Shown on the role card — no opaque tags. */
  tag_rationale: string;
  skill_set: string[];
  experience_level: string[];
  role_type: string[];
  position: string;
  location: string[];
  salary_display: string;
  url: string;
  posted_date: string;
  closes_date: string;
  problem_area: string;
  required_degree: string;
  description: string;
  highlighted: boolean;
}
