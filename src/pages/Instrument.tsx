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
          <ul className="space-y-1.5 list-disc list-outside ml-5 marker:text-ink-faint">
            <li>“Unsure” is scored as a middle position while skipping removes the question from the scoring.</li>
          </ul>
          <p className="text-sm">
            There are {questions.length} questions. If that's too long, there's a{' '}
            <button type="button" onClick={() => setUseShortForm(true)} className="underline hover:text-user">
              {shortForm.length}-question short form
            </button>{' '}
            that covers most of the content.
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseShortForm(!useShortForm)}
              className="text-xs text-ink-muted hover:text-user underline"
            >
              {useShortForm ? `All ${questions.length} questions` : 'Short form'}
            </button>
            {answered > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm('Clear every answer and start again?')) onChange({}); }}
                className="text-xs text-ink-faint hover:text-user underline"
              >
                Reset answers
              </button>
            )}
          </div>
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

                    {q.response_type === 'spectrum' ? (
                      <SpectrumInput q={q} value={typeof r === 'number' ? r : null}
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

/**
 * A 5-point spectrum between two named poles. Replaced a 0-100 slider, which invited false
 * precision — nobody's view about misuse versus loss of control is accurate to one point in a
 * hundred, and the slider's default position also silently read as an answer.
 */
function SpectrumInput({ q, value, onChange }: { q: any; value: number | null; onChange: (v: number) => void }) {
  const opts = scales.spectrum.options as { value: number; label: string }[];
  return (
    <div>
      <div className="flex justify-between text-xs text-ink-muted mb-1.5 gap-4">
        <span className="max-w-[45%]">{q.spectrum_poles.low}</span>
        <span className="max-w-[45%] text-right">{q.spectrum_poles.high}</span>
      </div>
      <div className="flex gap-1.5">
        {opts.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            aria-label={`${opt.label} — ${
              opt.value < 0 ? q.spectrum_poles.low : opt.value > 0 ? q.spectrum_poles.high : 'between the two'
            }`}
            className={`flex-1 py-2 rounded border text-sm tabular ${
              value === opt.value
                ? 'border-user bg-user/5 text-ink font-medium'
                : 'border-ground-line text-ink-muted hover:border-ink-faint'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
