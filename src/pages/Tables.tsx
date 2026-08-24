/**
 * Agendas — what the field is working on, and how resourced each one is.
 *
 * The methodology used to sit on every cell as an expandable "how this was arrived at". With 74
 * rows that is 74 copies of the same three sentences, which trains the reader to ignore all of
 * them. It now appears ONCE, at the foot of the table it applies to. Per-cell provenance survives
 * as the flag chip and the range, which are the parts that actually vary row to row.
 *
 * The two tables are close together on purpose — the previous version put a full screen of
 * caveats between them, so nobody scrolled far enough to learn that a second table existed.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { agendas, levers, metaAgendas, rolesByAgenda, orgsByAgenda } from '@/lib/data';
import { Flag } from '@/components/Provenance';

type SortKey = 'name' | 'fte' | 'share' | 'outputs' | 'postings' | 'orgs';

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? null : Number.isInteger(n) ? String(n) : n.toFixed(1);

export function Tables() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          What are the agendas within technical AI safety and AI governance?
        </h1>
        <p className="text-sm text-ink-muted mt-2 max-w-prose leading-relaxed">
          {agendas.length} technical agendas and {levers.length} policy levers, with how much effort
          is currently going into each. Click any row for its theory of change, the assumptions it
          rests on, and the organizations and open roles attached to it.
        </p>
      </header>

      <TechnicalTable />
      <PolicyTable />
      <MetaTable />
    </div>
  );
}

function SortHead({ k, label, title, sort, asc, onSort }: {
  k: SortKey; label: string; title?: string; sort: SortKey; asc: boolean; onSort: (k: SortKey) => void;
}) {
  return (
    <th scope="col" title={title}
        className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2 first:pl-0">
      <button onClick={() => onSort(k)} className="hover:text-ink inline-flex items-center gap-1">
        {label}{sort === k && <span aria-hidden>{asc ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function TechnicalTable() {
  const [sort, setSort] = useState<SortKey>('share');
  const [asc, setAsc] = useState(false);

  const onSort = (k: SortKey) => {
    if (sort === k) setAsc(!asc);
    else { setSort(k); setAsc(k === 'name'); }
  };

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
      : sort === 'postings' ? r._roles : r._orgs;
    return [...withCounts].sort((a, b) => {
      const ka = key(a), kb = key(b);
      const cmp = typeof ka === 'string' ? ka.localeCompare(kb as string) : (ka as number) - (kb as number);
      return asc ? cmp : -cmp;
    });
  }, [sort, asc]);

  return (
    <section className="mb-10">
      <h2 className="text-lg font-medium mb-3">Technical agendas</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[780px]">
          <thead className="border-b border-ink-faint/30">
            <tr>
              <SortHead k="name" label="Agenda" sort={sort} asc={asc} onSort={onSort} />
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">Target case</th>
              <SortHead k="fte" label="FTE 2025" title="As published by the Shallow Review — a range, shown with its midpoint." sort={sort} asc={asc} onSort={onSort} />
              <SortHead k="share" label="Share of field" title="Percent of summed field effort. Robust to the disagreement about total field size." sort={sort} asc={asc} onSort={onSort} />
              <SortHead k="outputs" label="Outputs" title="Papers and posts linked to this agenda in 2025." sort={sort} asc={asc} onSort={onSort} />
              <SortHead k="orgs" label="Orgs" sort={sort} asc={asc} onSort={onSort} />
              <SortHead k="postings" label="Open roles" sort={sort} asc={asc} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-ground-line">
            {rows.map((a) => (
              <tr key={a.id} className="align-top hover:bg-ground-sunk/60">
                <td className="py-2.5 px-2 pl-0 max-w-[260px]">
                  <Link to={`/agenda/${a.id}`} className="font-medium hover:text-user hover:underline">{a.name}</Link>
                  <p className="text-2xs text-ink-faint mt-0.5">{a.family}</p>
                </td>
                <td className="py-2.5 px-2">
                  {a.target_case
                    ? <span className="chip-derived">{a.target_case}</span>
                    : <span className="chip-unknown">unstated</span>}
                </td>
                <td className="py-2.5 px-2 whitespace-nowrap">
                  {a.fte_2025.value === null ? (
                    <span className="text-ink-faint text-2xs">no data</span>
                  ) : (
                    <>
                      <span className="tabular font-medium">{fmt(a.fte_2025.value)}</span>
                      {a.fte_2025.low !== a.fte_2025.high && (
                        <span className="tabular text-2xs text-ink-faint ml-1">
                          ({fmt(a.fte_2025.low)}–{fmt(a.fte_2025.high)})
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="py-2.5 px-2 tabular whitespace-nowrap">
                  {a.fte_share_of_field?.value != null
                    ? <span>{a.fte_share_of_field.value}%</span>
                    : <span className="text-ink-faint text-2xs">—</span>}
                </td>
                <td className="py-2.5 px-2 tabular">{a.outputs_count || <span className="text-ink-faint">0</span>}</td>
                <td className="py-2.5 px-2 tabular">{a._orgs || <span className="text-ink-faint">0</span>}</td>
                <td className="py-2.5 px-2 tabular">
                  {a._roles
                    ? <Link to={`/roles?agenda=${a.id}`} className="underline hover:text-user">{a._roles}</Link>
                    : <span className="text-ink-faint">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MethodNote>
        <p>
          <strong className="font-medium text-ink">FTE</strong> figures are the Shallow Review's own
          ranges, shown with our midpoint. Two independent counts of this field disagree by roughly
          3× on the total — summing these ranges gives 1,100–3,200 people, while a separate
          organizational headcount study finds 620–645 — because they count different populations.
          Neither has been rescaled. <strong className="font-medium text-ink">Share of field</strong> is
          each agenda's fraction of the summed total, which is unaffected by that disagreement and is
          the column to trust for comparisons. Sorted by it here.
        </p>
        <p>
          Philanthropic funding is not shown because the source names funders without amounts, and
          grant databases in any case miss safety work paid for out of lab revenue — so a low funding
          figure would not mean under-resourced.
        </p>
        <p>
          <strong className="font-medium text-ink">Open roles</strong> is reported separately and never
          folded into any composite. The job board is explicit that its coverage is thinner in areas
          it knows less well and outside the US and UK, and that role counts are not a signal of what
          it thinks is important. A thin agenda may be thin because it is hard, because it is wrong,
          or because nobody has tried; nothing here distinguishes those.
        </p>
      </MethodNote>
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
      : sort === 'orgs' ? b._orgs - a._orgs : b._roles - a._roles);
  }, [sort]);

  return (
    <section className="mb-10 rule pt-6">
      <h2 className="text-lg font-medium mb-1">Policy levers</h2>
      <p className="text-sm text-ink-muted mb-3 max-w-prose">
        Kept separate from the table above, because the inference inverts. On the technical side thin
        resourcing suggests high marginal returns. Here, coalitions and timing compound — being alone
        on an issue often means being ignored rather than being early.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-ink-faint/30">
            <tr>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 pr-2">
                <button onClick={() => setSort('name')} className="hover:text-ink">Lever</button>
              </th>
              <th scope="col" className="text-left font-medium text-2xs uppercase tracking-wider text-ink-faint pb-2 px-2">Where the work is</th>
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
                <td className="py-2.5 pr-2 max-w-[300px]">
                  <Link to={`/agenda/${l.id}`} className="font-medium hover:text-user hover:underline">{l.name}</Link>
                  <p className="text-2xs text-ink-muted mt-0.5 leading-snug">{l.one_sentence_summary}</p>
                </td>
                <td className="py-2.5 px-2 text-2xs text-ink-muted">{l.primary_institutions.join(', ')}</td>
                <td className="py-2.5 px-2 tabular">{l._orgs || <span className="text-ink-faint">0</span>}</td>
                <td className="py-2.5 px-2 tabular">
                  {l._roles
                    ? <Link to={`/roles?agenda=${l.id}`} className="underline hover:text-user">{l._roles}</Link>
                    : <span className="text-ink-faint">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MethodNote>
        <p>
          Every position on these is <Flag flag="placeholder" /> — assigned by hand rather than
          derived, because there is no policy equivalent of the stated-assumptions field the technical
          agendas come from. Each lever's page shows the reasoning behind its placement.
        </p>
        <p>
          Government spending is deliberately absent. It measures the size of the problem, not the
          size of the safety response, so it is not comparable with anything in the technical table
          and must never be added to it.
        </p>
      </MethodNote>
    </section>
  );
}

function MetaTable() {
  const rows = metaAgendas.map((m) => ({
    ...m,
    _orgs: orgsByAgenda.get(m.id)?.length ?? 0,
    _roles: rolesByAgenda.get(m.id)?.length ?? 0,
  }));

  return (
    <section className="rule pt-6">
      <h2 className="text-lg font-medium mb-1">Field building</h2>
      <p className="text-sm text-ink-muted mb-3 max-w-prose">
        Work that serves every agenda rather than picking one. Not ranked against your answers —
        running a fellowship programme doesn't commit you to a view about scheming, so scoring it
        would be inventing a signal.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="border-b border-ink-faint/30">
            <tr className="text-left text-2xs uppercase tracking-wider text-ink-faint">
              <th scope="col" className="pb-2 pr-2 font-medium">Category</th>
              <th scope="col" className="pb-2 px-2 font-medium">Orgs</th>
              <th scope="col" className="pb-2 px-2 font-medium">Open roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ground-line">
            {rows.map((m) => (
              <tr key={m.id} className="align-top hover:bg-ground-sunk/60">
                <td className="py-2.5 pr-2 max-w-[400px]">
                  <Link to={`/agenda/${m.id}`} className="font-medium hover:text-user hover:underline">{m.name}</Link>
                  <p className="text-2xs text-ink-muted mt-0.5 leading-snug">{m.one_sentence_summary}</p>
                </td>
                <td className="py-2.5 px-2 tabular">{m._orgs || <span className="text-ink-faint">0</span>}</td>
                <td className="py-2.5 px-2 tabular">
                  {m._roles
                    ? <Link to={`/roles?agenda=${m.id}`} className="underline hover:text-user">{m._roles}</Link>
                    : <span className="text-ink-faint">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** One methodology note per table, at its foot. Not repeated per cell. */
function MethodNote({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">
        Where these numbers come from, and what they don't mean
      </summary>
      <div className="mt-2 pl-3 border-l-2 border-ground-line space-y-2 text-ink-muted leading-relaxed max-w-prose">
        {children}
      </div>
    </details>
  );
}
