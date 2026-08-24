/**
 * Data tables (Build Spec §11.5). Two tables, technical and policy, visually separated with the
 * reason for separation stated. Sortable. Every cell sourced or flagged estimated.
 *
 * The default sort is deliberate. Spec §9: "Where both exist, the ratio (safety FTEs ÷ attention
 * on the lever) is the more meaningful figure and should be the sorted default." On the technical
 * side the analogous quantity is share of field effort, which is the scale-invariant column —
 * see the FTE reconciliation note in scripts/ingest-agendas.ts for why the LEVEL is not
 * trustworthy but the SHARE is.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { agendas, levers, rolesByAgenda, orgsByAgenda, DATA_AS_OF } from '@/lib/data';
import { Caveat, EstimateCell, Flag } from '@/components/Provenance';

type SortKey = 'name' | 'fte' | 'share' | 'outputs' | 'postings' | 'orgs';

export function Tables() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">How resourced is each of these?</h1>
        <p className="text-xs text-ink-faint mt-1 tabular">Data as of {DATA_AS_OF}</p>
        <p className="text-sm text-ink-muted mt-3 max-w-prose leading-relaxed">
          Two tables, and they are not merged. On the technical side, thin resourcing suggests high
          marginal returns under the usual diminishing-returns assumption. On the policy side that
          inference can invert: coalitions, credibility and timing compound, so being alone on an
          issue often means being ignored rather than being early. Putting both in one sorted list
          would invite exactly the wrong reading.
        </p>
      </header>

      <TechnicalTable />
      <div className="my-12 rule" />
      <PolicyTable />
    </div>
  );
}

function TechnicalTable() {
  const [sort, setSort] = useState<SortKey>('share');
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    const withCounts = agendas.map((a) => ({
      ...a,
      _orgs: orgsByAgenda.get(a.id)?.length ?? 0,
      _roles: rolesByAgenda.get(a.id)?.length ?? 0,
    }));
    const key = (r: any) =>
      sort === 'name' ? r.name
      : sort === 'fte' ? (r.fte_2025.value ?? -1)
      : sort === 'share' ? (r.fte_share_of_field?.value ?? -1)
      : sort === 'outputs' ? r.outputs_count
      : sort === 'postings' ? r._roles
      : r._orgs;
    return [...withCounts].sort((a, b) => {
      const ka = key(a), kb = key(b);
      const cmp = typeof ka === 'string' ? ka.localeCompare(kb as string) : (ka as number) - (kb as number);
      return asc ? cmp : -cmp;
    });
  }, [sort, asc]);

  const head = (k: SortKey, label: string, title?: string) => (
    <th
      scope="col"
      title={title}
      className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2 first:pl-0"
    >
      <button
        onClick={() => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === 'name' || k === 'share'); } }}
        className="hover:text-ink inline-flex items-center gap-1"
      >
        {label}
        {sort === k && <span aria-hidden>{asc ? '↑' : '↓'}</span>}
      </button>
    </th>
  );

  return (
    <section>
      <h2 className="text-lg font-medium mb-1">Technical agendas</h2>
      <p className="text-sm text-ink-muted mb-4 max-w-prose">
        {agendas.length} agendas from the Shallow Review of live agendas in alignment and safety,
        2025. Sorted by share of field effort by default, because the two independent measurements
        of field size disagree by roughly 3× on the level while broadly agreeing on the ordering —
        so the share is trustworthy where the headcount is not.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[840px]">
          <thead className="border-b border-ink-faint/30">
            <tr>
              {head('name', 'Agenda')}
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">Target case</th>
              {head('fte', 'FTE 2025', 'As published by Shallow Review — a range, shown with our midpoint.')}
              {head('share', 'Share of field', 'Percent of summed field FTE. Scale-invariant, so it survives the disagreement about total field size.')}
              {head('outputs', 'Outputs', 'Papers and posts the Shallow Review pipeline linked to this agenda.')}
              {head('orgs', 'Orgs')}
              {head('postings', 'Open roles', 'Reported separately and never summed into a composite — see the coverage caveat.')}
            </tr>
          </thead>
          <tbody className="divide-y divide-ground-line">
            {rows.map((a) => (
              <tr key={a.id} className="align-top hover:bg-ground-sunk/60">
                <td className="py-3 px-2 pl-0 max-w-[260px]">
                  <Link to={`/agenda/${a.id}`} className="font-medium hover:text-user hover:underline">{a.name}</Link>
                  <p className="text-2xs text-ink-faint mt-0.5">{a.family}</p>
                </td>
                <td className="py-3 px-2">
                  {a.target_case
                    ? <span className="chip-derived">{a.target_case}</span>
                    : <span className="chip-unknown">unstated</span>}
                </td>
                <td className="py-3 px-2 min-w-[150px]"><EstimateCell est={a.fte_2025} /></td>
                <td className="py-3 px-2 min-w-[150px]">
                  {a.fte_share_of_field
                    ? <EstimateCell est={a.fte_share_of_field} unit="%" />
                    : <span className="chip-unknown">no data</span>}
                </td>
                <td className="py-3 px-2 tabular">{a.outputs_count || <span className="text-ink-faint">0</span>}</td>
                <td className="py-3 px-2 tabular">{a._orgs || <span className="text-ink-faint">0</span>}</td>
                <td className="py-3 px-2 tabular">
                  {a._roles
                    ? <Link to={`/browse?agenda=${a.id}`} className="underline hover:text-user">{a._roles}</Link>
                    : <span className="text-ink-faint">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Caveat id="lab-internal-funding" />
        <Caveat id="neglectedness-is-not-a-recommendation" />
        <Caveat id="job-board-coverage-bias" compact />
      </div>
    </section>
  );
}

function PolicyTable() {
  const [sort, setSort] = useState<'name' | 'postings' | 'orgs'>('postings');

  const rows = useMemo(() => {
    const withCounts = levers.map((l) => ({
      ...l,
      _orgs: orgsByAgenda.get(l.id)?.length ?? 0,
      _roles: rolesByAgenda.get(l.id)?.length ?? 0,
    }));
    return [...withCounts].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'orgs' ? b._orgs - a._orgs
      : b._roles - a._roles);
  }, [sort]);

  return (
    <section>
      <div className="border-l-4 border-ink pl-4 mb-4">
        <h2 className="text-lg font-medium">Policy levers</h2>
        <p className="text-sm text-ink-muted mt-1 max-w-prose">
          A separate table on purpose. These twelve levers are seeded by hand from the 80,000 Hours
          US AI policy landscape — there is no Shallow Review equivalent for policy, so every
          coordinate here is <Flag flag="placeholder" /> rather than derived, and the funding column
          measures something different from the one above.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="border-b border-ink-faint/30">
            <tr>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 pr-2">
                <button onClick={() => setSort('name')} className="hover:text-ink">Lever</button>
              </th>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">Primary institutions</th>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2"
                  title="Government spend on a lever measures the size of the PROBLEM, not the size of the safety response. Never summed with philanthropic funding.">
                Govt attention
              </th>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">
                <button onClick={() => setSort('orgs')} className="hover:text-ink">Orgs</button>
              </th>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">
                <button onClick={() => setSort('postings')} className="hover:text-ink">Open roles</button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ground-line">
            {rows.map((l) => (
              <tr key={l.id} className="align-top hover:bg-ground-sunk/60">
                <td className="py-3 pr-2 max-w-[280px]">
                  <Link to={`/agenda/${l.id}`} className="font-medium hover:text-user hover:underline">{l.name}</Link>
                  <p className="text-2xs text-ink-muted mt-0.5 leading-snug">{l.one_sentence_summary}</p>
                </td>
                <td className="py-3 px-2 text-2xs text-ink-muted">{l.primary_institutions.join(', ')}</td>
                <td className="py-3 px-2">
                  <span className="chip-unknown">not collected</span>
                  <p className="text-2xs text-ink-faint mt-1 max-w-[180px]">
                    Measures the size of the problem, not the safety response.
                  </p>
                </td>
                <td className="py-3 px-2 tabular">{l._orgs || <span className="text-ink-faint">0</span>}</td>
                <td className="py-3 px-2 tabular">
                  {l._roles
                    ? <Link to={`/browse?agenda=${l.id}`} className="underline hover:text-user">{l._roles}</Link>
                    : <span className="text-ink-faint">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Caveat id="policy-returns-may-increase" />
      </div>
    </section>
  );
}
