/**
 * Fellowships (Build Spec §11.6): "Filtered view of role_type = fellowship, plus acceptance-rate
 * columns where published. Not a separate build."
 *
 * So this is a view over the same roles array, not a second dataset. Acceptance rates are not in
 * either source feed, so the column ships empty and says so rather than being dropped — a missing
 * column is invisible, and an empty one is a request.
 */

import { Link } from 'react-router-dom';
import { roles, lookupTargetName, DATA_AS_OF } from '@/lib/data';
import { Caveat, TagStrength } from '@/components/Provenance';

export function Fellowships() {
  // The board encodes this in `Position`, not in role type — "Fellowship", "Internship", "Course".
  const entryRoutes = roles.filter((r) =>
    ['Fellowship', 'Internship', 'Course'].includes(r.position));

  const byPosition = entryRoutes.reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.position] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Ways in</h1>
        <p className="text-xs text-ink-faint mt-1 tabular">Data as of {DATA_AS_OF}</p>
        <p className="text-sm text-ink-muted mt-3 max-w-prose leading-relaxed">
          {entryRoutes.length} fellowships, internships and courses on the board. Most are
          cohort-based and open to any agenda — where you end up depends on your mentor, which is
          why they carry no agenda tag rather than a guessed one.
        </p>
      </header>

      {Object.entries(byPosition).map(([position, list]) => (
        <section key={position} className="mb-10">
          <h2 className="text-lg font-medium mb-3 rule pt-4">{position} ({list.length})</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="border-b border-ink-faint/30">
                <tr className="text-left text-2xs uppercase tracking-wider text-ink-faint">
                  <th scope="col" className="pb-2 pr-2 font-medium">Programme</th>
                  <th scope="col" className="pb-2 px-2 font-medium">Organization</th>
                  <th scope="col" className="pb-2 px-2 font-medium">Agenda</th>
                  <th scope="col" className="pb-2 px-2 font-medium">Closes</th>
                  <th scope="col" className="pb-2 px-2 font-medium"
                      title="Not published in either source feed. The column is kept visible so the gap is legible rather than invisible.">
                    Acceptance rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ground-line">
                {list.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-ground-sunk/60">
                    <td className="py-2.5 pr-2 max-w-[280px]">
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-medium hover:text-user hover:underline">
                        {r.title}
                      </a>
                      {r.location.length > 0 && (
                        <p className="text-2xs text-ink-faint mt-0.5">{r.location.slice(0, 2).join(', ')}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-ink-muted">{r.org_name}</td>
                    <td className="py-2.5 px-2">
                      {r.cross_agenda ? (
                        <span className="chip-estimated">any agenda</span>
                      ) : r.agenda_id ? (
                        <div className="space-y-1">
                          <Link to={`/agenda/${r.agenda_id}`} className="text-xs underline text-ink-muted hover:text-user block">
                            {lookupTargetName(r.agenda_id)}
                          </Link>
                          <TagStrength source={r.tag_source} />
                        </div>
                      ) : (
                        <TagStrength source="untagged" />
                      )}
                    </td>
                    <td className="py-2.5 px-2 tabular text-2xs text-ink-muted">{r.closes_date || '—'}</td>
                    <td className="py-2.5 px-2">
                      <span className="chip-unknown">not published</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="rule pt-6">
        <Caveat id="tag-strength" compact />
        <Caveat id="job-board-coverage-bias" compact />
      </div>
    </div>
  );
}
