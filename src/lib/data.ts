/**
 * Data access. Everything is static JSON committed to the repo (snapshot MVP — no database,
 * no server-side state), so this is import-and-shape rather than fetch-and-cache.
 */

import axesCfg from '~data/config/axes.json';
import questionsCfg from '~data/config/questions.json';
import scalesCfg from '~data/config/scales.json';
import agendasData from '~data/derived/agendas.json';
import orgsData from '~data/derived/orgs.json';
import rolesData from '~data/derived/roles.json';
import leversData from '~data/seed/policy-levers.json';
import metaData from '~data/seed/meta-agendas.json';
import readingsData from '~data/content/readings.json';
import caveatsData from '~data/content/caveats.json';
import peopleData from '~data/seed/people.json';
import type { Axis, Question, Target } from './scoring';

export const axes = axesCfg.axes as unknown as Axis[];
export const questions = (questionsCfg.questions as unknown as Question[])
  .slice()
  .sort((a, b) => a.order - b.order);
export const sections = questionsCfg.sections as unknown as { id: string; title: string; blurb: string }[];
export const consistencyPairs = questionsCfg.consistency_pairs as unknown as
  { axis: string; a: string; b: string; threshold: number; topic: string }[];
export const shortForm = questionsCfg.short_form as unknown as string[];
export const scales = scalesCfg.scales as unknown as Record<string, any>;

export const agendas = agendasData.agendas as unknown as any[];
export const orgs = orgsData.orgs as unknown as any[];
export const roles = rolesData.roles as unknown as any[];
export const levers = leversData.levers as unknown as any[];
/** Field-building categories. Domain 'meta' — deliberately NOT matched; see meta-agendas.json. */
export const metaAgendas = metaData.agendas as unknown as any[];
export const institutionTypes = leversData.institution_types as unknown as any[];
export const readings = readingsData.axes as unknown as Record<string, Record<string, any>>;
export const caveats = caveatsData.caveats as unknown as any[];
export const disclaimers = caveatsData.disclaimers as unknown as any;
export const people = peopleData.people as unknown as any[];

export const DATA_AS_OF = agendasData.generated_at as string;

export const caveatById = new Map(caveats.map((c) => [c.id, c]));
export const agendaById = new Map(agendas.map((a) => [a.id, a]));
export const leverById = new Map(levers.map((l) => [l.id, l]));
export const metaById = new Map(metaAgendas.map((m) => [m.id, m]));

/** Agendas and levers share the id namespace; the UI often needs whichever one an id points at. */
export function lookupTargetName(id: string | null): string | null {
  if (!id) return null;
  return agendaById.get(id)?.name ?? leverById.get(id)?.name ?? metaById.get(id)?.name ?? null;
}

/** Match targets: technical agendas + policy levers, on the same axes. */
export const targets: Target[] = [
  ...agendas.map((a) => ({
    id: a.id, name: a.name, domain: 'technical' as const, coordinates: a.coordinates,
  })),
  ...levers.map((l) => ({
    id: l.id,
    name: l.name,
    domain: 'policy' as const,
    // Levers declare only the axes they speak to; fill the rest with null so unknown handling
    // stays symmetric with agendas rather than silently treating absent as zero.
    coordinates: Object.fromEntries(
      axes.map((a) => [a.id, (l.coordinates as Record<string, number>)[a.id] ?? null]),
    ),
  })),
];

export const rolesByAgenda = (() => {
  const m = new Map<string, any[]>();
  for (const r of roles) {
    if (!r.agenda_id) continue;
    if (!m.has(r.agenda_id)) m.set(r.agenda_id, []);
    m.get(r.agenda_id)!.push(r);
  }
  return m;
})();

export const orgsByAgenda = (() => {
  const m = new Map<string, any[]>();
  for (const o of orgs) {
    for (const id of [o.primary_agenda_id, ...(o.secondary_agenda_ids ?? [])].filter(Boolean)) {
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(o);
    }
  }
  return m;
})();

/** Roles at field-building orgs, shown under every agenda with a label. */
export const crossAgendaRoles = roles.filter((r) => r.cross_agenda);


/** Every distinct value for a role filter, with counts, for the browse surface. */
export function facet(field: 'role_type' | 'experience_level' | 'location' | 'position', pool = roles) {
  const counts = new Map<string, number>();
  for (const r of pool) {
    const vals = Array.isArray(r[field]) ? r[field] : [r[field]];
    for (const v of vals) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
