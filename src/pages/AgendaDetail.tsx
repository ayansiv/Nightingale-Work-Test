/**
 * Agenda / lever detail (Build Spec §11.3 "clicking an agenda reaches organizations and then live
 * roles", §6 "store the source assumption text alongside each coordinate so a reader can audit
 * the placement").
 *
 * Two references in play:
 *   - LessWrong wiki-tags: a tag page is a navigational object with a description, the things
 *     tagged with it, and links into neighbouring concept space — not a decorative label.
 *   - A lightweight academic layout for theory of change, assumptions, limitations and citations,
 *     in that order, because that is the order in which a reader can check the argument.
 */

import { useParams, Link } from 'react-router-dom';
import {
  agendaById, leverById, orgsByAgenda, rolesByAgenda, agendas, axes,
  institutionTypes, crossAgendaRoles, people, disclaimers,
} from '@/lib/data';
import { AxisPlot } from '@/components/AxisPlot';
import { Caveat, CoordinateSource, EstimateCell } from '@/components/Provenance';

export function AgendaDetail() {
  const { id = '' } = useParams();
  const agenda = agendaById.get(id);
  const lever = leverById.get(id);
  const item = agenda ?? lever;

  if (!item) {
    return <div className="max-w-3xl mx-auto px-4 py-12"><p>No agenda or lever with id <code>{id}</code>.</p></div>;
  }

  const isPolicy = !!lever;
  const orgList = orgsByAgenda.get(id) ?? [];
  const roleList = rolesByAgenda.get(id) ?? [];
  const siblings = agenda ? agendas.filter((a) => a.family === agenda.family && a.id !== id) : [];
  const named = agenda ? people.filter((p) => p.agenda_ids.includes(id)) : [];

  // Spec §8: sensitivity_tier is 1|2|3. Everything currently ships as 1 — see OWNER-DATA OD-11.
  // Read it rather than assuming, so that setting a tier in the data changes the page with no
  // further code change.
  const sensitivityTier: number = (agenda?.sensitivity_tier ?? 1) as number;

  const coords = isPolicy
    ? Object.fromEntries(axes.map((a) => [a.id, (lever!.coordinates as any)[a.id] ?? null]))
    : agenda!.coordinates;

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <p className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">
          {isPolicy ? 'Policy lever' : agenda!.family}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        {item.one_sentence_summary && (
          <p className="text-lg text-ink-muted mt-2 leading-relaxed max-w-prose">{item.one_sentence_summary}</p>
        )}
      </header>

      {/* ---- theory of change ----
           Spec §13.7: "Ship disclaimer_general at the top of theory-of-change content."
           Not at the top of the site — at the top of THIS content, which is where a reader is
           forming a view about whether what they are reading is the whole story. */}
      {item.theory_of_change && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">Theory of change</h2>

          <details className="mb-3 text-xs border-l-2 border-ink-faint/40 pl-3 py-1">
            <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">
              What this section does not say
            </summary>
            <p className="mt-1 text-ink-muted leading-relaxed max-w-prose">
              {disclaimers.disclaimer_general.text}
            </p>
          </details>

          <p className="leading-relaxed max-w-prose">{item.theory_of_change}</p>

          {sensitivityTier === 3 && (
            <p className="mt-3 text-sm text-ink-muted border-l-2 border-ink-faint pl-3">
              Some of this agenda's theory of change is omitted rather than generalised. See above.
            </p>
          )}
        </section>
      )}

      {/* ---- assumptions ---- */}
      {!isPolicy && agenda!.assumptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">
            Assumptions this rests on
          </h2>
          <p className="text-xs text-ink-muted mb-2 max-w-prose">
            Stated by the agenda's own proponents, not attributed by us. These are what the
            coordinates below are derived from.
          </p>
          <ol className="space-y-1 list-decimal list-inside marker:text-ink-faint marker:tabular-nums">
            {agenda!.assumptions.map((a: string) => (
              <li key={a} className="text-sm">{a}</li>
            ))}
          </ol>
        </section>
      )}

      {isPolicy && (
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
          {lever!.example_bodies?.length > 0 && (
            <p className="text-xs text-ink-faint mt-3">
              Examples: {lever!.example_bodies.join(' · ')}
            </p>
          )}
        </section>
      )}

      {/* ---- coordinates, with the audit trail ---- */}
      <section className="mb-8 rule pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-1">Position on the axes</h2>
        <p className="text-xs text-ink-muted mb-4 max-w-prose">
          {isPolicy
            ? 'Assigned by hand, not derived — there is no policy equivalent of the Shallow Review’s stated-assumptions field. Every value below shows the reasoning that produced it.'
            : 'Composed from the family, target case, broad approach and stated assumptions above. Each value shows which of those produced it, so you can check the placement against the source.'}
          {' '}An axis with no value is left blank and drops out of every comparison — it is not set to the middle.
        </p>

        <div className="divide-y divide-ground-line">
          {axes.filter((a) => a.scope === 'core' || a.scope === (isPolicy ? 'policy' : 'technical')).map((a) => {
            const v = coords[a.id];
            if (v === null || v === undefined) {
              return (
                <div key={a.id} className="py-2 flex items-baseline justify-between gap-3 opacity-60">
                  <span className="text-sm text-ink-muted">{a.label}</span>
                  <span className="chip-unknown">no stated position</span>
                </div>
              );
            }
            const src = isPolicy
              ? { kind: 'assigned', by: 'build', why: lever!.why }
              : agenda!.coordinate_sources[a.id];
            return (
              <div key={a.id} className="py-2">
                <AxisPlot axis={a} overlays={[{ id: 'self', label: item.name, value: v, color: '#0f766e', shape: 'diamond' }]} />
                <div className="mt-1"><CoordinateSource source={src} /></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- resourcing ---- */}
      {!isPolicy && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">How resourced this is</h2>
          <dl className="grid sm:grid-cols-2 gap-4">
            <div><dt className="text-xs text-ink-muted mb-1">FTEs, 2025</dt><dd><EstimateCell est={agenda!.fte_2025} /></dd></div>
            <div><dt className="text-xs text-ink-muted mb-1">Share of field effort</dt><dd>{agenda!.fte_share_of_field ? <EstimateCell est={agenda!.fte_share_of_field} unit="%" /> : <span className="chip-unknown">no data</span>}</dd></div>
            <div><dt className="text-xs text-ink-muted mb-1">Projected 2026</dt><dd><EstimateCell est={agenda!.fte_2026_est} /></dd></div>
            <div><dt className="text-xs text-ink-muted mb-1">Philanthropic funding</dt><dd><EstimateCell est={agenda!.funding_philanthropic_usd} /></dd></div>
          </dl>
          {agenda!.funded_by && (
            <p className="text-xs text-ink-muted mt-3 max-w-prose">
              <span className="text-ink-faint">Funders named by the source: </span>
              {agenda!.funded_by.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 400)}
            </p>
          )}
          <div className="mt-4"><Caveat id="lab-internal-funding" compact /></div>
        </section>
      )}

      {/* ---- who works on this ---- */}
      <section className="mb-8 rule pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">
          Organizations ({orgList.length})
        </h2>
        {orgList.length ? (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {orgList.map((o: any) => (
              <li key={o.id} className="text-sm flex justify-between gap-2">
                <span>
                  {o.homepage ? <a href={o.homepage} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">{o.name}</a> : o.name}
                  {o.primary_agenda_id !== id && <span className="text-2xs text-ink-faint ml-1">(secondary)</span>}
                </span>
                <span className="tabular text-2xs text-ink-faint shrink-0">{o.postings_count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No organization on the board is tagged to this yet.</p>
        )}
        <div className="mt-3"><Caveat id="orgs-as-points" compact /></div>
      </section>

      {named.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">
            Named by the source ({named.length})
          </h2>
          <p className="text-xs text-ink-muted mb-2 max-w-prose">
            People the Shallow Review lists against this agenda. These are roster entries, not
            positions — none of them is plotted on the axes above, because a name against an agenda
            is not a stated view and we will not invent one.
          </p>
          <p className="text-sm text-ink-muted leading-relaxed">
            {named.map((p: any) => p.name).join(' · ')}
          </p>
          <div className="mt-3"><Caveat id="researcher-citations-not-attributions" compact /></div>
        </section>
      )}

      {/* ---- roles ---- */}
      <section className="mb-8 rule pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">
          Live roles ({roleList.length})
        </h2>
        {roleList.length ? (
          <>
            <ul className="space-y-1.5">
              {roleList.slice(0, 12).map((r: any) => (
                <li key={r.id} className="text-sm flex justify-between gap-3">
                  <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-user hover:underline">{r.title}</a>
                  <span className="text-2xs text-ink-faint shrink-0">{r.org_name}</span>
                </li>
              ))}
            </ul>
            <Link to={`/browse?agenda=${id}`} className="text-xs underline text-ink-muted hover:text-user mt-3 inline-block">
              See all {roleList.length} with filters
            </Link>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Nothing open on the board tagged to this right now.</p>
        )}
        {crossAgendaRoles.length > 0 && (
          <p className="text-xs text-ink-muted mt-4 border-l-2 border-ground-line pl-3 max-w-prose">
            Plus {crossAgendaRoles.length} fellowship and residency places that are open to any
            agenda — where you land depends on your mentor, so they are not counted above.{' '}
            <Link to="/browse?type=Research" className="underline hover:text-user">Browse those</Link>.
          </p>
        )}
      </section>

      {/* ---- critiques, then neighbours: the LW wiki-tag move ---- */}
      {!isPolicy && agenda!.critiques && (
        <section className="mb-8 rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-2">Critiques</h2>
          <p className="text-sm text-ink-muted leading-relaxed max-w-prose">
            {agenda!.critiques.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
          </p>
          <p className="text-2xs text-ink-faint mt-2">
            Carried through from the Shallow Review, which links critical commentary per agenda.
            Link targets are preserved in the source data.
          </p>
        </section>
      )}

      {siblings.length > 0 && (
        <section className="rule pt-6">
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
    </article>
  );
}
