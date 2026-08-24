/**
 * The quiz.
 *
 * Two things this screen must not get wrong.
 *
 * 1. "Unsure" and "Skip" are different. Unsure is an answer of 0.0 that enters the average; Skip
 *    removes the item. They get visibly different affordances — Unsure sits in the row of options
 *    because it is one, Skip sits outside it because it is not.
 *
 * 2. Question numbers must be POSITIONS, not ids. q29 and q30 were added later and are
 *    interleaved into section F, so rendering the raw id showed the reader
 *    "Q23 Q24 Q29 Q25 Q30 Q26" and read as a bug. The id stays the stable key for data; the
 *    number on screen is where the question actually sits.
 */

import { useState } from 'react';
import { questions, sections, scales, axes, shortForm } from '@/lib/data';
import { ABSTAIN, type Responses } from '@/lib/scoring';

interface Props {
  responses: Responses;
  onChange: (r: Responses) => void;
  onComplete: () => void;
}

export function Instrument({ responses, onChange, onComplete }: Props) {
  const [useShortForm, setUseShortForm] = useState(false);

  const active = useShortForm ? questions.filter((q) => shortForm.includes(q.id)) : questions;
  const answered = active.filter((q) => responses[q.id] !== undefined).length;
  const skipped = active.filter((q) => responses[q.id] === ABSTAIN).length;
  const position = new Map(active.map((q, i) => [q.id, i + 1]));

  const set = (id: string, value: number | typeof ABSTAIN) =>
    onChange({ ...responses, [id]: value });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-3">Which questions in AI safety should you work on?</h1>

        <div className="space-y-3 text-ink-muted max-w-prose leading-relaxed">
          <p>
            Answer the questions below and you'll get a ranked list of the research agendas and
            policy levers that follow from your answers, plus the organizations and open roles
            attached to each.
          </p>
          <p>
            Three things worth knowing before you start:
          </p>
          <ul className="space-y-1.5 list-disc list-outside ml-5 marker:text-ink-faint">
            <li>
              <strong className="font-medium text-ink">You can leave anything blank.</strong> Skipping
              a question removes it from scoring rather than counting as a middle answer. An axis
              only drops out when every question feeding it is blank.
            </li>
            <li>
              <strong className="font-medium text-ink">"Unsure" is an answer.</strong> It's a
              considered middle position and it counts. That's what makes it different from skipping.
            </li>
            <li>
              <strong className="font-medium text-ink">Nothing is stored.</strong> No account, no
              server. Your answers exist in this tab and in the link you can copy at the end.
            </li>
          </ul>
          <p className="text-sm">
            Takes about ten minutes. If that's too long, there's a{' '}
            <button
              type="button"
              onClick={() => setUseShortForm(true)}
              className="underline hover:text-user"
            >
              {shortForm.length}-question short form
            </button>{' '}
            covering the axes that do the most routing.
          </p>
        </div>

        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="h-1.5 bg-ground-sunk rounded-full overflow-hidden">
              <div className="h-full bg-user transition-[width]"
                   style={{ width: `${(answered / active.length) * 100}%` }} />
            </div>
            <p className="text-2xs text-ink-faint mt-1 tabular">
              {answered} of {active.length} answered
              {skipped > 0 && ` · ${skipped} skipped`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseShortForm(!useShortForm)}
            className="text-xs text-ink-muted hover:text-user underline"
          >
            {useShortForm ? `Switch to all ${questions.length} questions` : `Switch to the short form`}
          </button>
        </div>
      </header>

      {sections.map((section) => {
        const qs = active.filter((q) => q.section === section.id);
        if (!qs.length) return null;

        return (
          <section key={section.id} className="mb-10">
            <div className="rule pt-4 mb-4">
              <h2 className="text-lg font-medium">{section.title}</h2>
              {section.blurb && <p className="text-sm text-ink-muted mt-1 max-w-prose">{section.blurb}</p>}
            </div>

            <div className="space-y-6">
              {qs.map((q) => {
                const r = responses[q.id];
                const isSkipped = r === ABSTAIN;
                const axisLabels = Object.keys(q.loadings)
                  .map((id) => axes.find((a) => a.id === id)?.label ?? id)
                  .join(' · ');

                return (
                  <fieldset key={q.id} className={isSkipped ? 'opacity-50' : ''}>
                    <legend className="text-2xs font-mono text-ink-faint mb-1">
                      {position.get(q.id)} of {active.length} · {axisLabels}
                    </legend>
                    <p className="text-[0.95rem] leading-relaxed mb-3 max-w-prose">{q.text}</p>

                    {q.response_type === 'allocation' ? (
                      <AllocationInput q={q} value={typeof r === 'number' ? r : null}
                                       onChange={(v) => set(q.id, v)} />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {scales[q.response_type].options.map((opt: any) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => set(q.id, opt.value)}
                            aria-pressed={r === opt.value}
                            className={`px-3 py-2 rounded border text-sm text-left transition-colors ${
                              r === opt.value
                                ? 'border-user bg-user/5 text-ink font-medium'
                                : 'border-ground-line text-ink-muted hover:border-ink-faint'
                            }`}
                          >
                            <span className="block">{opt.label}</span>
                            {opt.range && (
                              <span className="block text-2xs font-mono text-ink-faint mt-0.5">{opt.range}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Skip lives outside the option row, behind a rule. It is not an answer. */}
                    <div className="mt-2 pt-2 border-t border-dashed border-ground-line">
                      <button
                        type="button"
                        onClick={() => set(q.id, ABSTAIN)}
                        aria-pressed={isSkipped}
                        className={`text-xs px-2 py-1 rounded border border-dashed ${
                          isSkipped
                            ? 'border-ink-faint bg-ground-sunk text-ink font-medium'
                            : 'border-ground-line text-ink-faint hover:text-ink-muted'
                        }`}
                      >
                        {isSkipped ? 'Skipped — click to undo' : 'Skip this one'}
                      </button>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rule pt-6">
        <button
          type="button"
          onClick={onComplete}
          disabled={answered === 0}
          className="px-5 py-2.5 rounded bg-ink text-ground font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          See your results
        </button>
      </div>
    </div>
  );
}

function AllocationInput({ q, value, onChange }: { q: any; value: number | null; onChange: (v: number) => void }) {
  const cfg = scales.allocation;
  const pct = value === null ? cfg.default : Math.round(((value + 1) / 2) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-ink-muted mb-2 gap-4">
        <span className="max-w-[45%]">{q.allocation_poles.low}</span>
        <span className="max-w-[45%] text-right">{q.allocation_poles.high}</span>
      </div>
      <input
        type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={pct}
        onChange={(e) => onChange((Number(e.target.value) / 100) * 2 - 1)}
        className="w-full accent-user" aria-label={q.text}
      />
      <div className="flex justify-between tabular text-sm mt-1">
        <span className={value === null ? 'text-ink-faint' : 'text-ink'}>{100 - pct}</span>
        <span className={value === null ? 'text-ink-faint' : 'text-ink'}>{pct}</span>
      </div>
      {value === null && (
        <p className="text-2xs text-ink-faint mt-1">Move the slider to answer.</p>
      )}
    </div>
  );
}
