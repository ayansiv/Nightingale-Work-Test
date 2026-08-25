/**
 * Home, what the axes are, shown rather than described.
 *
 * Structural debt to 12axes: the landing page's job is to make the axes legible BEFORE anyone
 * answers anything. Bipolar bars, grouped into a few named families, each pole named in the
 * field's own vocabulary with the argument for it linked. Someone should be able to read this
 * page, never take the quiz, and still have got something.
 *
 * Every reading in data/content/readings.json is reachable from here, that was the point of
 * transcribing the spec §12 list, and burying two thirds of it behind "+N more" wasted it.
 */

import { Link } from 'react-router-dom';
import { axes, readings } from '@/lib/data';

const GROUPS: { id: string; title: string; blurb: string; axisIds: string[] }[] = [
  {
    id: 'trajectory',
    title: 'How the technology goes',
    blurb: 'When capable systems arrive, and how fast capability compounds once they do.',
    axisIds: ['timelines', 'takeoff'],
  },
  {
    id: 'chain',
    title: 'The misalignment chain',
    blurb:
      'Three separate links. Agreeing on the first tells you almost nothing about the third, and the third is what decides whether control work or alignment work is the better use of a career.',
    axisIds: ['p_mis', 'p_scheme', 'containment'],
  },
  {
    id: 'composition',
    title: 'Where the harm comes from',
    blurb: 'Systems doing what nobody intended, or people doing exactly what they intended.',
    axisIds: ['accident_deliberate', 'domestic_intl'],
  },
  {
    id: 'leverage',
    title: 'Where the leverage is',
    blurb: 'What is actually binding, and who is best placed to relieve it.',
    axisIds: ['constraint', 'labs'],
  },
  {
    id: 'goal',
    title: 'What counts as winning',
    blurb: 'Whether survival is the goal or only the precondition.',
    axisIds: ['futures', 'patienthood'],
  },
  {
    id: 'technical',
    title: 'Technical approach',
    blurb: 'Scored only against technical agendas.',
    axisIds: ['internals', 'patch_rebuild', 'automation'],
  },
  {
    id: 'policy',
    title: 'Policy approach',
    blurb: 'Scored only against policy levers.',
    axisIds: ['inside_outside', 'restraint_capacity', 'venue_access'],
  },
];

export function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          What you believe about AI risk implies what you should work on
        </h1>
        <p className="text-lg text-ink-muted leading-relaxed max-w-prose">
          Your worldview informs which problems are worth your time.
        </p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link to="/quiz" className="px-5 py-2.5 rounded bg-ink text-ground font-medium">
            Take the quiz
          </Link>
          <Link to="/agendas" className="px-4 py-2.5 rounded border border-ground-line hover:border-ink-faint">
            Browse the agendas
          </Link>
          <Link to="/roles" className="px-4 py-2.5 rounded border border-ground-line hover:border-ink-faint">
            Browse open roles
          </Link>
        </div>
      </header>

      {GROUPS.map((group, gi) => (
        <section key={group.id} className="mb-10">
          <div className="rule pt-5 mb-4">
            <h2 className="text-lg font-medium">{group.title}</h2>
            <p className="text-sm text-ink-muted mt-0.5 max-w-prose">{group.blurb}</p>
          </div>

          <div className="space-y-6">
            {group.axisIds.map((id, ai) => {
              const axis = axes.find((a) => a.id === id);
              if (!axis) return null;
              const poles = readings[id] ?? {};
              // Order by the group's DECLARED pole, so the reading list sits under the end of the
              // bar it argues for. These used to be ordered by position in the object, which put
              // 16 of 17 axes on the wrong side, "steer toward good outcomes" appeared under
              // "avoid catastrophe", and the inside-government reading under "outside influence".
              const lead = Object.keys(poles)
                .filter((k) => !k.startsWith('_'))
                .sort((a, b) => (poles[a].pole === 'low' ? -1 : 1) - (poles[b].pole === 'low' ? -1 : 1));

              return (
                <article key={id}>
                  <div className="mb-1.5">
                    <h3 className="font-medium">
                      <Link to={`/axis/${id}`} className="hover:text-user hover:underline">{axis.label}</Link>
                    </h3>
                  </div>
                  <p className="text-sm text-ink-muted mb-2 max-w-prose">{axis.question}</p>

                  {/* The bipolar bar: named poles at the ends, the spectrum between them. */}
                  <div className="flex items-stretch gap-2 mb-3">
                    <span className="text-2xs font-medium text-ink w-[26%] shrink-0 text-right self-center leading-tight">
                      {axis.low_pole_label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-derived/40 via-ground-line to-house/40 self-center" />
                    <span className="text-2xs font-medium text-ink w-[26%] shrink-0 self-center leading-tight">
                      {axis.high_pole_label}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {lead.map((pole) => (
                      <div key={pole} className="border-l-2 border-ground-line pl-3">
                        <h4 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1.5">
                          {poles[pole].pole_label ?? pole}
                        </h4>
                        <ul className="space-y-1">
                          {poles[pole].sources.map((s: any) => (
                            <li key={s.title} className="text-xs leading-snug">
                              {s.url ? (
                                <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-user">
                                  {s.title}
                                </a>
                              ) : (
                                <span className="text-ink-muted">{s.title}</span>
                              )}
                              {s.publisher && <span className="text-ink-faint">, {s.publisher}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rule pt-6 mb-8">
        <h2 className="text-lg font-medium mb-3">Elsewhere</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="https://80000hours.org/ai-careers-advisor/" target="_blank" rel="noreferrer"
               className="font-medium underline hover:text-user">
              80,000 Hours AI careers advisor
            </a>
            <span className="text-ink-muted">, free one-to-one advising and an AI-assisted version.
              This page tells you which agenda; they help with the rest of the decision.</span>
          </li>
          <li>
            <a href="https://shallowreview.ai/" target="_blank" rel="noreferrer"
               className="font-medium underline hover:text-user">
              Shallow Review of live agendas in alignment and safety, 2025
            </a>
            <span className="text-ink-muted">, the source for every technical agenda here, including the
              assumptions each one says it rests on.</span>
          </li>
          <li>
            <a href="https://80000hours.org/articles/the-us-ai-policy-landscape-where-to-have-the-biggest-impact/"
               target="_blank" rel="noreferrer" className="font-medium underline hover:text-user">
              The US AI policy landscape
            </a>
            <span className="text-ink-muted">, the source for the policy levers and institution types.</span>
          </li>
          <li>
            <a href="https://80000hours.org/job-board/" target="_blank" rel="noreferrer"
               className="font-medium underline hover:text-user">
              80,000 Hours job board
            </a>
            <span className="text-ink-muted">, where the roles come from. Apply there, not here.</span>
          </li>
          <li>
            <a href="https://emergingtechpolicy.org/" target="_blank" rel="noreferrer"
               className="font-medium underline hover:text-user">
              Emerging Technology Policy Careers
            </a>
            <span className="text-ink-muted">, fellowships and institution guides for US policy paths.</span>
          </li>
        </ul>
      </section>

      <section className="rule pt-6">
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-muted hover:text-ink select-none font-medium">
            How this was built, and what it gets wrong
          </summary>
          <div className="mt-3 space-y-3 text-ink-muted leading-relaxed max-w-prose">
            <p>
              Each technical agenda's position is composed from what its own proponents published ,
              the family it belongs to, the case it targets, and the problems it says it rests on.
              Every coordinate on an agenda page shows which of those produced it. Where the source
              says nothing about an axis, the value is blank and that axis drops out of the
              comparison rather than being set to the middle.
            </p>
            <p>
              Policy levers have no equivalent source, so those are assigned by hand and labelled as
              assigned. Organizations are single points from what they publish, which compresses the
              ones that run several agendas at once.
            </p>
            <p>
              A thin agenda is not thereby a good bet. It may be thin because it is hard, because it
              is wrong, or because nobody has tried, and nothing here distinguishes those. Role
              counts are not importance either, the job board is explicit that its coverage is
              uneven and that counts are not a signal of what it thinks matters.
            </p>
            <p>
              Some roles' reasons for mattering can't be stated publicly. Where we had to be
              general, we were general rather than coy. Roles missing from this page are not less
              important, and a few are among the most important.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
