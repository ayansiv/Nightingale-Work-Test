/**
 * Browse (Build Spec §11.4). Two filters, not one — orgs and roles are different objects with
 * different useful facets, and merging them into a single filter bar loses that.
 *
 * "Experience level swaps framing text, not data." Filtered to entry/junior, a thin agenda reads
 * as "where you can build unusual expertise"; filtered to mid/senior, "where your marginal
 * contribution is largest." Same table, different reading instruction.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { roles, orgs, agendaById, leverById, lookupTargetName, facet, DATA_AS_OF, crossAgendaRoles } from '@/lib/data';
import { Caveat, TagStrength } from '@/components/Provenance';

type Mode = 'roles' | 'orgs';

export function Browse() {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('roles');

  const agendaFilter = params.get('agenda');
  const roleType = params.get('type');
  const experience = params.get('exp');
  const location = params.get('loc');
  const maturity = params.get('maturity');

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const filteredRoles = useMemo(() => roles.filter((r) => {
    if (agendaFilter && r.agenda_id !== agendaFilter && !r.cross_agenda) return false;
    if (roleType && !r.role_type.includes(roleType)) return false;
    if (experience && !r.experience_level.includes(experience)) return false;
    if (location && !r.location.includes(location)) return false;
    return true;
  }), [agendaFilter, roleType, experience, location]);

  const filteredOrgs = useMemo(() => orgs.filter((o) => {
    if (agendaFilter && o.primary_agenda_id !== agendaFilter && !o.secondary_agenda_ids.includes(agendaFilter)) return false;
    if (maturity && o.maturity_tier !== maturity) return false;
    if (location) {
      const orgRoles = roles.filter((r) => r.org_id === o.id);
      if (!orgRoles.some((r) => r.location.includes(location))) return false;
    }
    return true;
  }), [agendaFilter, maturity, location]);

  // The framing swap. Data is identical; the instruction for reading it is not.
  const isEarlyCareer = experience === 'Entry-level' || experience === 'Junior (1-4 years experience)';
  const isSenior = experience === 'Mid (5-9 years experience)' || experience === 'Senior (10+ years experience)';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Browse</h1>
        <p className="text-xs text-ink-faint mt-1 tabular">Data as of {DATA_AS_OF}</p>
        {agendaFilter && (
          <p className="mt-2 text-sm">
            Filtered to <strong className="font-medium">{lookupTargetName(agendaFilter)}</strong>{' '}
            <button onClick={() => setParam('agenda', null)} className="text-xs underline text-ink-muted hover:text-user ml-1">clear</button>
          </p>
        )}
      </header>

      {/* OWID tabbed-view pattern: same underlying dataset, chosen representation, controls that
          change with the tab rather than a single bar of everything. */}
      <div className="flex gap-1 mb-4 border-b border-ground-line">
        {(['roles', 'orgs'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              mode === m ? 'border-ink text-ink font-medium' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {m === 'roles' ? `Roles (${filteredRoles.length})` : `Organizations (${filteredOrgs.length})`}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-5">
          {mode === 'roles' ? (
            <>
              <FacetGroup label="Role type" value={roleType} onChange={(v) => setParam('type', v)} options={facet('role_type', filteredRoles)} />
              <FacetGroup label="Experience" value={experience} onChange={(v) => setParam('exp', v)} options={facet('experience_level', filteredRoles)} />
              <FacetGroup label="Location" value={location} onChange={(v) => setParam('loc', v)} options={facet('location', filteredRoles).slice(0, 12)} />
            </>
          ) : (
            <>
              <FacetGroup label="Maturity" value={maturity} onChange={(v) => setParam('maturity', v)}
                options={[...new Map(filteredOrgs.map((o) => [o.maturity_tier, 0])).keys()]
                  .map((t) => [t, orgs.filter((o) => o.maturity_tier === t).length] as [string, number])} />
              <FacetGroup label="Location" value={location} onChange={(v) => setParam('loc', v)} options={facet('location').slice(0, 12)} />
            </>
          )}
        </aside>

        <main>
          {(isEarlyCareer || isSenior) && (
            <p className="text-sm text-ink-muted mb-4 border-l-2 border-user/40 pl-3 max-w-prose">
              {isEarlyCareer
                ? 'Filtered to early-career roles. Read a thinly-resourced agenda here as somewhere you can build unusual expertise before the field fills in.'
                : 'Filtered to experienced roles. Read a thinly-resourced agenda here as somewhere your marginal contribution is largest right now.'}
              <span className="block text-2xs text-ink-faint mt-1">
                Same rows either way — only the reading instruction changed.
              </span>
            </p>
          )}

          {mode === 'roles' ? (
            <ul className="divide-y divide-ground-line">
              {filteredRoles.slice(0, 200).map((r) => <RoleRow key={r.id} role={r} />)}
            </ul>
          ) : (
            <ul className="divide-y divide-ground-line">
              {filteredOrgs.map((o) => <OrgRow key={o.id} org={o} />)}
            </ul>
          )}

          {mode === 'roles' && filteredRoles.length > 200 && (
            <p className="text-xs text-ink-faint mt-4">Showing the first 200 of {filteredRoles.length}. Narrow the filters to see the rest.</p>
          )}

          <div className="rule mt-8 pt-6">
            <Caveat id="tag-strength" />
            <Caveat id="job-board-coverage-bias" compact />
          </div>
        </main>
      </div>
    </div>
  );
}

function FacetGroup({ label, value, onChange, options }: {
  label: string; value: string | null; onChange: (v: string | null) => void; options: [string, number][];
}) {
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
              <span className="truncate">{opt}</span>
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
          <a href={role.url} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">{role.title}</a>
        </h3>
        <span className="text-sm text-ink-muted">{role.org_name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
        {role.cross_agenda ? (
          <span className="chip-estimated" title="Fellowship or residency: placement depends on your mentor, so this appears under every agenda.">
            open to any agenda
          </span>
        ) : agendaName ? (
          <>
            <Link to={`/agenda/${role.agenda_id}`} className="text-xs underline text-ink-muted hover:text-user">{agendaName}</Link>
            <TagStrength source={role.tag_source} />
          </>
        ) : (
          <TagStrength source="untagged" />
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-2xs text-ink-faint">
        {role.role_type.length > 0 && <span>{role.role_type.join(', ')}</span>}
        {role.experience_level.length > 0 && <span>{role.experience_level.join(', ')}</span>}
        {role.location.length > 0 && <span>{role.location.slice(0, 2).join(', ')}</span>}
        {role.salary_display && role.salary_display !== 'Not Found' && <span className="tabular">{role.salary_display}</span>}
      </div>

      {role.tag_rationale && (
        <details className="mt-1">
          <summary className="text-2xs text-ink-faint cursor-pointer hover:text-ink-muted select-none">why this tag</summary>
          <p className="text-2xs text-ink-muted mt-1 pl-2 border-l border-ground-line max-w-prose">{role.tag_rationale}</p>
        </details>
      )}
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
