/**
 * Axis page — the reading list for one axis, both poles (Build Spec §12).
 *
 * LessWrong wiki-tag pattern: this is a reusable topic page reached from the entry reading, from
 * a consistency flag, and from any pole label on the plot. It is the place a concept lives, not a
 * footnote hanging off the results screen.
 */

import { useParams, Link } from 'react-router-dom';
import { axes, readings, agendas } from '@/lib/data';

export function AxisDetail() {
  const { id = '' } = useParams();
  const axis = axes.find((a) => a.id === id);
  const poles = readings[id];

  if (!axis) {
    return <div className="max-w-3xl mx-auto px-4 py-12"><p>No axis with id <code>{id}</code>.</p></div>;
  }

  // Low pole left, high pole right — same order as everywhere else, driven by the declared
  // `pole` field rather than by position in the object.
  const poleKeys = poles
    ? Object.keys(poles).filter((k) => !k.startsWith('_'))
        .sort((a, b) => (poles[a].pole === 'low' ? -1 : 1) - (poles[b].pole === 'low' ? -1 : 1))
    : [];

  // Agendas sitting at each end — the axis page should show what the position implies for work.
  const placed = agendas
    .filter((a) => a.coordinates[id] !== null && a.coordinates[id] !== undefined)
    .sort((a, b) => (b.coordinates[id] as number) - (a.coordinates[id] as number));

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">
          {axis.scope} axis
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{axis.label}</h1>
        <p className="text-lg text-ink-muted mt-2 max-w-prose">{axis.question}</p>
        <p className="text-sm font-mono text-ink-faint mt-3">
          {axis.low_pole_label} ←————→ {axis.high_pole_label}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-3">
          The argument, from both sides
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {poleKeys.map((pole) => (
            <div key={pole} id={pole} className="scroll-mt-20">
              <h3 className="font-medium mb-2 pb-1 border-b border-ground-line">
                {poles![pole].pole_label ?? pole}
              </h3>
              {poles![pole].frame ? (
                <p className="text-sm text-ink-muted mb-3 leading-relaxed">{poles![pole].frame}</p>
              ) : (
                <p className="text-xs text-ink-faint italic mb-3">
                  Two-sentence framing not yet written. The sources carry the argument meanwhile.
                </p>
              )}
              <ul className="space-y-2">
                {poles![pole].sources.map((s: any) => (
                  <li key={s.title} className="text-sm leading-snug">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-user">{s.title}</a>
                    ) : (
                      <span>{s.title}</span>
                    )}
                    {s.publisher && <span className="text-ink-faint"> — {s.publisher}</span>}
                    {s.note && <p className="text-2xs text-ink-muted mt-0.5">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {poleKeys.length === 0 && (
          <p className="text-sm text-ink-muted">No reading list has been assembled for this axis yet.</p>
        )}
      </section>

      {placed.length > 0 && (
        <section className="rule pt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-ink-faint mb-1">
            What each position implies for work
          </h2>
          <p className="text-xs text-ink-muted mb-4 max-w-prose">
            {placed.length} of {agendas.length} agendas have a derived position on this axis. The
            rest say nothing about it, and are absent rather than centred.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-medium mb-2">Toward {axis.high_pole_label}</h3>
              <ul className="space-y-1">
                {placed.slice(0, 6).map((a) => (
                  <li key={a.id} className="text-sm flex justify-between gap-2">
                    <Link to={`/agenda/${a.id}`} className="hover:text-user hover:underline truncate">{a.name}</Link>
                    <span className="tabular text-2xs text-ink-faint">{(a.coordinates[id] as number).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-medium mb-2">Toward {axis.low_pole_label}</h3>
              <ul className="space-y-1">
                {placed.slice(-6).reverse().map((a) => (
                  <li key={a.id} className="text-sm flex justify-between gap-2">
                    <Link to={`/agenda/${a.id}`} className="hover:text-user hover:underline truncate">{a.name}</Link>
                    <span className="tabular text-2xs text-ink-faint">{(a.coordinates[id] as number).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <nav className="rule mt-8 pt-6">
        <h2 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-2">Other axes</h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {axes.filter((a) => a.id !== id).map((a) => (
            <li key={a.id}>
              <Link to={`/axis/${a.id}`} className="text-sm underline text-ink-muted hover:text-user">{a.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
