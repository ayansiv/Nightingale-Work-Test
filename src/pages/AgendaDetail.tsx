/**
 * Agenda / lever / field-building category detail.
 *
 * Order is theory of change → assumptions → coordinates → resourcing → who → roles → critiques →
 * neighbours, because that is the order in which a reader can check the argument: by the time
 * they reach a coordinate they have already seen the assumption it came from.
 *
 * The methodology text appears ONCE, at the foot. It used to hang off every coordinate and every
 * number, which meant the same three sentences rendered a dozen times on one page.
 */

import { useParams, Link } from 'react-router-dom';
import {
  agendaById, leverById, metaById, orgsByAgenda, rolesByAgenda, agendas, axes,
  institutionTypes, people,
} from '@/lib/data';
import { AxisPlot } from '@/components/AxisPlot';

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(1);

export function AgendaDetail() {
  const { id = '' } = useParams();
  const agenda = agendaById.get(id);
  const lever = leverById.get(id);
  const meta = metaById.get(id);
  const item = agenda ?? lever ?? meta;

  if (!item) {
    return <div className="max-w-3xl mx-auto px-4 py-12"><p>Nothing here with id <code>{id}</code>.</p></div>;
  }

  const kind = agenda ? 'technical' : lever ? 'policy' : 'meta';
  const orgList = orgsByAgenda.get(id) ?? [];
  const roleList = rolesByAgenda.get(id) ?? [];
  const siblings = agenda ? agendas.filter((a) => a.family === agenda.family && a.id !== id) : [];
  const named = agenda ? people.filter((p) => p.agenda_ids.includes(id)) : [];

  const coords = kind === 'policy'
    ? Object.fromEntries(axes.map((a) => [a.id, (lever!.coordinates as any)[a.id] ?? null]))
    : kind === 'technical' ? agenda!.coordinates : null;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">
          {kind === 'policy' ? 'Policy lever' : kind === 'meta' ? 'Field building' : agenda!.family}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        {item.one_sentence_summary && (
          <p className="text-lg text-ink-muted mt-2 leading-relaxed max-w-prose">{item.one_sentence_summary}</p>
        )}
      </header>

      {item.theory_of_change && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">Theory of change</h2>
          <p className="leading-relaxed max-w-prose">{item.theory_of_change}</p>
        </section>
      )}

      {kind === 'technical' && agenda!.assumptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">
            Assumptions this rests on
          </h2>
          <p className="text-xs text-ink-muted mb-2 max-w-prose">
            Stated by the agenda's own proponents, not attributed by us. These are what the
            coordinates below are derived from.
          </p>
          <ol className="space-y-1 list-decimal list-inside marker:text-ink-faint marker:tabular-nums">
            {agenda!.assumptions.map((a: string) => <li key={a} className="text-sm">{a}</li>)}
          </ol>
        </section>
      )}

      {kind === 'policy' && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">Where this work happens</h2>
          <ul className="space-y-2">
            {lever!.primary_institutions.map((i: string) => {
              const inst = institutionTypes.find((t) => t.id === i);
              if (!inst) return null;
              return (
                <li key={i} className="text-sm">
                  <strong className="font-medium">{inst.name}</strong>
                  <span className="text-ink-muted"> — {inst.note}</span>
                  <span className="block text-2xs text-ink-faint mt-0.5">
                    Partisan exposure: {inst.partisan_exposure}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {kind === 'meta' && (
        <section className="mb-8 border-l-2 border-ground-line pl-3">
          <p className="text-sm text-ink-muted max-w-prose">
            Not ranked against your quiz answers. {meta!.why_it_is_not_matched}
          </p>
        </section>
      )}

      {coords && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">Position on the axes</h2>
          <div className="divide-y divide-ground-line">
            {axes.filter((a) => a.scope === 'core' || a.scope === kind).map((a) => {
              const v = coords[a.id];
              if (v === null || v === undefined) {
                return (
                  <div key={a.id} className="py-2 flex items-baseline justify-between gap-3 opacity-60">
                    <span className="text-sm text-ink-muted">{a.label}</span>
                    <span className="chip-unknown">no stated position</span>
                  </div>
                );
              }
              const src = kind === 'technical' ? agenda!.coordinate_sources[a.id] : null;
              return (
                <div key={a.id} className="py-2">
                  <AxisPlot axis={a}
                            overlays={[{ id: 'self', label: item.name, value: v, color: '#0f766e', shape: 'diamond' }]} />
                  {src?.source && (
                    <p className="text-2xs text-ink-faint mt-1">
                      from <span className="text-ink-muted">"{src.source}"</span>
                      {src.why && <span className="block mt-0.5 max-w-prose">{src.why}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {kind === 'technical' && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">How resourced this is</h2>
          <dl className="grid sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-ink-muted mb-0.5">FTEs, 2025</dt>
              <dd className="tabular font-medium">
                {fmt(agenda!.fte_2025.value)}
                {agenda!.fte_2025.low !== agenda!.fte_2025.high && agenda!.fte_2025.value !== null && (
                  <span className="text-2xs text-ink-faint ml-1">
                    ({fmt(agenda!.fte_2025.low)}–{fmt(agenda!.fte_2025.high)})
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted mb-0.5">Share of field effort</dt>
              <dd className="tabular font-medium">
                {agenda!.fte_share_of_field?.value != null ? `${agenda!.fte_share_of_field.value}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted mb-0.5">Outputs in 2025</dt>
              <dd className="tabular font-medium">{agenda!.outputs_count || '—'}</dd>
            </div>
          </dl>
          {agenda!.funded_by && (
            <p className="text-xs text-ink-muted mt-3 max-w-prose">
              <span className="text-ink-faint">Funders named by the source: </span>
              {agenda!.funded_by.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 400)}
            </p>
          )}
        </section>
      )}

      <section className="mb-8 rule pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">
          Organizations ({orgList.length})
        </h2>
        {orgList.length ? (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {orgList.map((o: any) => (
              <li key={o.id} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>
                    {o.homepage
                      ? <a href={o.homepage} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">{o.name}</a>
                      : o.name}
                    {o.primary_agenda_id !== id && <span className="text-2xs text-ink-faint ml-1">(secondary)</span>}
                  </span>
                  <span className="tabular text-2xs text-ink-faint shrink-0">{o.postings_count}</span>
                </div>
                {o.insider_note && (
                  <p className="text-2xs text-ink mt-0.5 border-l-2 border-user/40 pl-2">{o.insider_note}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No organization on the board is tagged to this yet.</p>
        )}
      </section>

      {named.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">
            Named by the source ({named.length})
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            {named.map((p: any) => p.name).join(' · ')}
          </p>
          <p className="text-2xs text-ink-faint mt-2 max-w-prose">
            People the Shallow Review lists against this agenda. Roster entries, not positions —
            a name against an agenda is not a stated view, so none of them is plotted above.
          </p>
        </section>
      )}

      <section className="mb-8 rule pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">
          Open roles ({roleList.length})
        </h2>
        {roleList.length ? (
          <>
            <ul className="space-y-1.5">
              {roleList.slice(0, 12).map((r: any) => (
                <li key={r.id} className="text-sm flex justify-between gap-3">
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">
                    {r.title}
                  </a>
                  <span className="text-2xs text-ink-faint shrink-0">{r.org_name}</span>
                </li>
              ))}
            </ul>
            <Link to={`/roles?agenda=${id}`} className="text-xs underline text-ink-muted hover:text-user mt-3 inline-block">
              See all {roleList.length} with filters
            </Link>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Nothing open on the board tagged to this right now.</p>
        )}
      </section>

      {kind === 'technical' && agenda!.critiques && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">Critiques</h2>
          <p className="text-sm text-ink-muted leading-relaxed max-w-prose">
            {agenda!.critiques.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
          </p>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">
            Neighbouring agendas in {agenda!.family}
          </h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link to={`/agenda/${s.id}`} className="text-sm underline text-ink-muted hover:text-user">{s.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Methodology, once, at the end. */}
      <details className="rule pt-5 text-xs">
        <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">
          How this page was put together
        </summary>
        <div className="mt-2 pl-3 border-l-2 border-ground-line space-y-2 text-ink-muted leading-relaxed max-w-prose">
          {kind === 'technical' ? (
            <>
              <p>
                The theory of change, assumptions, FTE range and funders come from the Shallow Review of
                live agendas in alignment and safety, 2025. Positions on the axes are composed from
                those same published fields — the family, the target case, the broad approach, and the
                assumptions — and each one shows which produced it. Where the source says nothing about
                an axis the value is blank and that axis drops out of comparisons rather than being set
                to the middle.
              </p>
              <p>
                FTE is the source's own range with our midpoint. A separate organizational headcount
                study puts the whole technical field at 620–645 people, while summing these ranges gives
                1,100–3,200 — they count different populations, and neither has been rescaled. Share of
                field effort is unaffected by that disagreement and is the safer comparison.
              </p>
              <p>
                Thin resourcing is not a recommendation: an agenda may be thin because it is hard,
                because it is wrong, or because nobody has tried.
              </p>
            </>
          ) : kind === 'policy' ? (
            <p>
              Levers and institution types are seeded from the 80,000 Hours US AI policy landscape.
              Positions on the axes are assigned by hand rather than derived — there is no policy
              equivalent of the stated-assumptions field the technical agendas come from — so treat them
              as our reading rather than as anyone's stated view. Government spending is not shown: it
              measures the size of the problem, not the size of the safety response.
            </p>
          ) : (
            <p>
              Field-building categories were added because tagging every role at a training or
              grantmaking organization as "open to any agenda" hid ordinary jobs behind a non-answer.
              They carry no positions on the axes and are not ranked against quiz results.
            </p>
          )}
          <p>
            Roles come from the 80,000 Hours job board, whose coverage is thinner in areas it knows
            less well and outside the US and UK. Role counts are not a measure of importance.
          </p>
        </div>
      </details>
    </article>
  );
}
