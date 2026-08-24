/**
 * Roles.
 *
 * Absorbs what used to be a separate Fellowships tab — it was always a filter over this same
 * array (`position = Fellowship`), so a whole tab for it duplicated navigation for no data.
 *
 * Two things the first version got wrong and this one fixes:
 *   - Experience was sorted by row count, so "Mid" led and "Entry-level" sat third. A seniority
 *     facet has an inherent order and must use it.
 *   - Arriving from an agenda showed the active filter as one line of small text, which read as a
 *     caption rather than as state. It is now a bar you cannot miss, with the way out on it.
 */

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roles, orgs, lookupTargetName, facet } from '@/lib/data';
import { TagStrength } from '@/components/Provenance';

/** Seniority is ordinal. Sort by rank, not by how many rows happen to carry each value. */
const EXPERIENCE_ORDER = [
  'Entry-level',
  'Junior (1-4 years experience)',
  'Mid (5-9 years experience)',
  'Senior (10+ years experience)',
  'Multiple experience levels',
];
const expRank = (s: string) => {
  const i = EXPERIENCE_ORDER.indexOf(s);
  return i === -1 ? EXPERIENCE_ORDER.length : i;
};

const FILTER_KEYS = ['agenda', 'type', 'exp', 'loc', 'position', 'maturity', 'view'] as const;

export function Browse() {
  const [params, setParams] = useSearchParams();

  const view = params.get('view') === 'orgs' ? 'orgs' : 'roles';
  const agendaFilter = params.get('agenda');
  const roleType = params.get('type');
  const experience = params.get('exp');
  const location = params.get('loc');
  const position = params.get('position');
  const maturity = params.get('maturity');

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  const activeFilters = FILTER_KEYS
    .filter((k) => k !== 'view' && params.get(k))
    .map((k) => ({
      key: k,
      value: params.get(k)!,
      label: k === 'agenda' ? (lookupTargetName(params.get(k)!) ?? params.get(k)!) : params.get(k)!,
      kind: { agenda: 'Agenda', type: 'Role type', exp: 'Experience', loc: 'Location', position: 'Type', maturity: 'Maturity' }[k as string]!,
    }));

  const filteredRoles = useMemo(() => roles.filter((r) => {
    if (agendaFilter && r.agenda_id !== agendaFilter && !r.cross_agenda) return false;
    if (roleType && !r.role_type.includes(roleType)) return false;
    if (experience && !r.experience_level.includes(experience)) return false;
    if (location && !r.location.includes(location)) return false;
    if (position && r.position !== position) return false;
    return true;
  }), [agendaFilter, roleType, experience, location, position]);

  const filteredOrgs = useMemo(() => orgs.filter((o) => {
    if (agendaFilter && o.primary_agenda_id !== agendaFilter && !o.secondary_agenda_ids.includes(agendaFilter)) return false;
    if (maturity && o.maturity_tier !== maturity) return false;
    return true;
  }), [agendaFilter, maturity]);

  const isEarlyCareer = experience === 'Entry-level' || experience === 'Junior (1-4 years experience)';
  const isSenior = experience === 'Mid (5-9 years experience)' || experience === 'Senior (10+ years experience)';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Open roles</h1>

      {/* Active filters, as state you cannot miss. */}
      {activeFilters.length > 0 && (
        <div className="mb-4 rounded border border-user/30 bg-user/5 px-3 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-ink">Filtered to</span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setParam(f.key, null)}
                className="inline-flex items-center gap-1.5 rounded bg-ground border border-ground-line px-2 py-1 text-xs hover:border-ink-faint"
                title={`Remove the ${f.kind.toLowerCase()} filter`}
              >
                <span className="text-ink-faint">{f.kind}:</span>
                <span className="font-medium">{f.label}</span>
                <span aria-hidden className="text-ink-faint">×</span>
              </button>
            ))}
            <button onClick={clearAll} className="text-xs underline text-ink-muted hover:text-user ml-1">
              clear all
            </button>
          </div>
          <p className="text-2xs text-ink-faint mt-1.5 tabular">
            Showing {view === 'roles' ? filteredRoles.length : filteredOrgs.length} of{' '}
            {view === 'roles' ? roles.length : orgs.length}
          </p>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-ground-line">
        {(['roles', 'orgs'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setParam('view', m === 'orgs' ? 'orgs' : null)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              view === m ? 'border-ink text-ink font-medium' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {m === 'roles' ? `Roles (${filteredRoles.length})` : `Organizations (${filteredOrgs.length})`}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-5">
          {view === 'roles' ? (
            <>
              <FacetGroup label="Type" value={position} onChange={(v) => setParam('position', v)}
                          options={facet('position', filteredRoles)} />
              <FacetGroup label="Role type" value={roleType} onChange={(v) => setParam('type', v)}
                          options={facet('role_type', filteredRoles)} />
              <FacetGroup label="Experience" value={experience} onChange={(v) => setParam('exp', v)}
                          options={[...facet('experience_level', filteredRoles)]
                            .sort((a, b) => expRank(a[0]) - expRank(b[0]))} />
              <FacetGroup label="Location" value={location} onChange={(v) => setParam('loc', v)}
                          options={facet('location', filteredRoles).slice(0, 12)} />
            </>
          ) : (
            <FacetGroup label="Maturity" value={maturity} onChange={(v) => setParam('maturity', v)}
                        options={['established', 'new_entrant', 'structurally_understaffed', 'unknown']
                          .map((t) => [t, orgs.filter((o) => o.maturity_tier === t).length] as [string, number])
                          .filter(([, n]) => n > 0)} />
          )}
        </aside>

        <main>
          {(isEarlyCareer || isSenior) && (
            <p className="text-sm text-ink-muted mb-4 border-l-2 border-user/40 pl-3 max-w-prose">
              {isEarlyCareer
                ? 'Read a thinly-resourced agenda here as somewhere you can build unusual expertise before the field fills in.'
                : 'Read a thinly-resourced agenda here as somewhere your marginal contribution is largest right now.'}
            </p>
          )}

          {view === 'roles' ? (
            <>
              <ul className="divide-y divide-ground-line">
                {filteredRoles.slice(0, 200).map((r) => <RoleRow key={r.id} role={r} />)}
              </ul>
              {filteredRoles.length > 200 && (
                <p className="text-xs text-ink-faint mt-4">
                  Showing the first 200 of {filteredRoles.length}. Narrow the filters to see the rest.
                </p>
              )}
              {filteredRoles.length === 0 && (
                <p className="text-sm text-ink-muted py-8">
                  Nothing matches those filters. <button onClick={clearAll} className="underline hover:text-user">Clear them</button>.
                </p>
              )}
            </>
          ) : (
            <ul className="divide-y divide-ground-line">
              {filteredOrgs.map((o) => <OrgRow key={o.id} org={o} />)}
            </ul>
          )}

          <details className="mt-8 rule pt-5 text-xs">
            <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">
              How roles were matched to agendas
            </summary>
            <div className="mt-2 pl-3 border-l-2 border-ground-line space-y-2 text-ink-muted leading-relaxed max-w-prose">
              <p>
                <strong className="font-medium text-ink">From role content</strong> means a phrase in the
                role's own description named this agenda.{' '}
                <strong className="font-medium text-ink">From the organization</strong> means only that the
                role sits somewhere whose main work is this agenda — right for operations, recruiting and
                legal roles, but a weaker claim.{' '}
                <strong className="font-medium text-ink">Open to any agenda</strong> is reserved for cohort
                programmes, where your mentor decides what you end up working on.
              </p>
              <p>
                Coverage is uneven. The job board says its listings are thinner in areas it knows less
                well and outside the US and UK, and that role counts are not a signal of importance.
              </p>
            </div>
          </details>
        </main>
      </div>
    </div>
  );
}

function FacetGroup({ label, value, onChange, options }: {
  label: string; value: string | null; onChange: (v: string | null) => void; options: [string, number][];
}) {
  if (!options.length) return null;
  return (
    <div>
      <h3 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1.5">{label}</h3>
      <ul className="space-y-0.5">
        {options.map(([opt, count]) => (
          <li key={opt}>
            <button
              onClick={() => onChange(value === opt ? null : opt)}
              className={`w-full text-left text-xs py-0.5 flex justify-between gap-2 ${
                value === opt ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span className="truncate">{opt.replace(/_/g, ' ')}</span>
              <span className="tabular text-ink-faint">{count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleRow({ role }: { role: any }) {
  const agendaName = lookupTargetName(role.agenda_id);

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="font-medium text-[0.95rem]">
          <a href={role.url} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">
            {role.title}
          </a>
        </h3>
        <span className="text-sm text-ink-muted">{role.org_name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
        {role.cross_agenda && (
          <span className="chip-estimated" title="A cohort programme — your mentor decides which agenda you work on.">
            open to any agenda
          </span>
        )}
        {agendaName && (
          <>
            <Link to={`/agenda/${role.agenda_id}`} className="text-xs underline text-ink-muted hover:text-user">
              {agendaName}
            </Link>
            {!role.cross_agenda && <TagStrength source={role.tag_source} />}
          </>
        )}
        {!agendaName && !role.cross_agenda && <TagStrength source="untagged" />}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-2xs text-ink-faint">
        {role.position && role.position !== 'Full-time' && <span className="text-ink-muted">{role.position}</span>}
        {role.role_type.length > 0 && <span>{role.role_type.join(', ')}</span>}
        {role.experience_level.length > 0 && <span>{role.experience_level.join(', ')}</span>}
        {role.location.length > 0 && <span>{role.location.slice(0, 2).join(', ')}</span>}
        {role.salary_display && role.salary_display !== 'Not Found' && (
          <span className="tabular">{role.salary_display}</span>
        )}
        {role.closes_date && <span>closes {role.closes_date}</span>}
      </div>
    </li>
  );
}

function OrgRow({ org }: { org: any }) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium text-[0.95rem]">
          {org.homepage
            ? <a href={org.homepage} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">{org.name}</a>
            : org.name}
        </h3>
        <span className="text-2xs tabular text-ink-faint">{org.postings_count} open</span>
      </div>

      {org.insider_note && (
        <p className="text-xs text-ink mt-1 max-w-prose border-l-2 border-user/40 pl-2">{org.insider_note}</p>
      )}
      {org.description && <p className="text-xs text-ink-muted mt-1 max-w-prose">{org.description}</p>}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-2xs">
        {org.primary_agenda_id ? (
          <>
            <Link to={`/agenda/${org.primary_agenda_id}`} className="underline text-ink-muted hover:text-user">
              {lookupTargetName(org.primary_agenda_id)}
            </Link>
            {org.secondary_agenda_ids.slice(0, 3).map((id: string) => (
              <Link key={id} to={`/agenda/${id}`} className="text-ink-faint underline hover:text-user">
                {lookupTargetName(id)}
              </Link>
            ))}
            {org.secondary_agenda_ids.length > 3 && (
              <span className="text-ink-faint">+{org.secondary_agenda_ids.length - 3}</span>
            )}
          </>
        ) : (
          <span className="chip-unknown">not tagged</span>
        )}
        <span className="chip-unknown">{org.maturity_tier.replace(/_/g, ' ')}</span>
      </div>
    </li>
  );
}
