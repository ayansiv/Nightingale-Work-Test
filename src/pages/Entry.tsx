/**
 * Entry (Build Spec §11.1). "A blank-slate user lands on framing essays, not the instrument.
 * Balance entry reading across poles so the first thing encountered isn't systematically one side."
 *
 * The balancing is structural, not editorial: poles are rendered in a two-column layout with the
 * same weight, and the order alternates per axis so neither side is consistently first.
 */

import { Link } from 'react-router-dom';
import { axes, readings, agendas, roles, orgs, levers, DATA_AS_OF, disclaimers } from '@/lib/data';
import { Caveat } from '@/components/Provenance';

export function Entry() {
  const coreAxes = axes.filter((a) => a.scope === 'core');

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Which agenda should you be working on?
        </h1>
        <p className="text-lg text-ink-muted leading-relaxed max-w-prose">
          Job boards tell you what is open. They do not tell you which research agendas and policy
          levers follow from what you actually believe about AI risk, or where the field is thin.
          This is a layer on top of them that does.
        </p>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 rule">
          {[
            [agendas.length, 'technical agendas', 'from the Shallow Review'],
            [levers.length, 'policy levers', 'seeded by hand'],
            [orgs.length, 'organizations', 'from the 80k board'],
            [roles.length, 'live roles', `as of ${DATA_AS_OF}`],
          ].map(([n, label, sub]) => (
            <div key={label as string}>
              <dt className="tabular text-2xl font-medium">{n as number}</dt>
              <dd className="text-sm text-ink-muted">{label as string}</dd>
              <dd className="text-2xs text-ink-faint">{sub as string}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-2">Read first</h2>
        <p className="text-sm text-ink-muted mb-6 max-w-prose">
          The instrument measures agreement, so it is only worth answering once you have met the
          arguments. Both poles of each axis below are argued by people who work on the problem
          full time. Fifteen to thirty minutes per axis is the intended dose — you do not need all
          of them before starting.
        </p>

        <div className="space-y-6">
          {coreAxes.map((axis, i) => {
            const poles = readings[axis.id] ?? {};
            const poleKeys = Object.keys(poles).filter((k) => !k.startsWith('_'));
            // Alternate which pole leads, so no side is systematically encountered first.
            const ordered = i % 2 === 0 ? poleKeys : [...poleKeys].reverse();

            return (
              <article key={axis.id} className="rule pt-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h3 className="font-medium">
                    <Link to={`/axis/${axis.id}`} className="hover:text-user hover:underline">{axis.label}</Link>
                  </h3>
                  <span className="text-2xs font-mono text-ink-faint">
                    {axis.low_pole_label} ←→ {axis.high_pole_label}
                  </span>
                </div>
                <p className="text-sm text-ink-muted mb-3">{axis.question}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {ordered.map((pole) => (
                    <div key={pole} className="border-l-2 border-ground-line pl-3">
                      <h4 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">{pole}</h4>
                      {poles[pole].frame ? (
                        <p className="text-sm text-ink-muted mb-2">{poles[pole].frame}</p>
                      ) : (
                        <p className="text-2xs text-ink-faint italic mb-2">
                          Framing not yet written — the sources below carry the argument in the meantime.
                        </p>
                      )}
                      <ul className="space-y-1">
                        {poles[pole].sources.slice(0, 3).map((s: any) => (
                          <li key={s.title} className="text-xs text-ink-muted leading-snug">
                            {s.url ? (
                              <a href={s.url} className="underline hover:text-user" target="_blank" rel="noreferrer">{s.title}</a>
                            ) : s.title}
                            {s.publisher && <span className="text-ink-faint"> — {s.publisher}</span>}
                          </li>
                        ))}
                      </ul>
                      {poles[pole].sources.length > 3 && (
                        <Link to={`/axis/${axis.id}#${pole}`} className="text-2xs underline text-ink-faint hover:text-user">
                          +{poles[pole].sources.length - 3} more
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rule pt-6 mb-10">
        <div className="flex flex-wrap gap-3 items-center">
          <Link to="/instrument" className="px-5 py-2.5 rounded bg-ink text-ground font-medium">
            Start the instrument
          </Link>
          <Link to="/tables" className="px-4 py-2.5 rounded border border-ground-line hover:border-ink-faint">
            Skip to the resourcing tables
          </Link>
          <Link to="/browse" className="px-4 py-2.5 rounded border border-ground-line hover:border-ink-faint">
            Just show me the roles
          </Link>
        </div>
      </section>

      <section className="rule pt-6">
        <h2 className="text-sm font-medium mb-2">Before you rely on any of this</h2>
        <p className="text-sm text-ink-muted leading-relaxed max-w-prose mb-4">
          {disclaimers.disclaimer_general.text}
        </p>
        <Caveat id="snapshot" compact />
        <Caveat id="job-board-coverage-bias" compact />
        <Caveat id="neglectedness-is-not-a-recommendation" compact />
        <Caveat id="sensitivity" compact />
      </section>
    </div>
  );
}
