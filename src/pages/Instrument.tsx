/**
 * The instrument (Build Spec §11.2). 30 questions grouped by section so the misalignment chain
 * reads as one topic. Entirely client-side; no response leaves the browser.
 *
 * The one thing this screen must not get wrong: "Unsure" and "Skip" are DIFFERENT, and the
 * spec says so twice. Unsure is an answer of 0.0 that enters the average. Skip removes the item.
 * They are given visibly different affordances — Unsure sits in the row of options because it is
 * one; Skip sits outside it, separated by a rule, because it is not.
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

  const set = (id: string, value: number | typeof ABSTAIN) =>
    onChange({ ...responses, [id]: value });

  const axisLabel = (q: (typeof questions)[number]) =>
    Object.keys(q.loadings)
      .map((id) => axes.find((a) => a.id === id)?.label ?? id)
      .join(' · ');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Place yourself</h1>
        <p className="text-ink-muted max-w-prose">
          {active.length} questions producing positions on {axes.length} axes. Several questions
          load onto more than one axis, so the axes are computed rather than asked directly —
          which is what lets the instrument survive you skipping things.
        </p>

        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="h-1.5 bg-ground-sunk rounded-full overflow-hidden">
              <div
                className="h-full bg-user transition-[width]"
                style={{ width: `${(answered / active.length) * 100}%` }}
              />
            </div>
            <p className="text-2xs text-ink-faint mt-1 tabular">
              {answered} of {active.length} answered
              {skipped > 0 && ` · ${skipped} skipped (removed from scoring)`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setUseShortForm(!useShortForm)}
            className="text-xs text-ink-muted hover:text-user underline"
          >
            {useShortForm ? `Switch to the full ${questions.length} questions` : `Switch to the short ${shortForm.length}-question form`}
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

                return (
                  <fieldset key={q.id} className={isSkipped ? 'opacity-50' : ''}>
                    <legend className="text-2xs font-mono text-ink-faint mb-1">
                      {q.id.toUpperCase()} · {axisLabel(q)}
                    </legend>
                    <p className="text-[0.95rem] leading-relaxed mb-3 max-w-prose">{q.text}</p>

                    {q.response_type === 'allocation' ? (
                      <AllocationInput
                        q={q}
                        value={typeof r === 'number' ? r : null}
                        onChange={(v) => set(q.id, v)}
                      />
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
                            {/* Spec §4: "Show the numeric range in the interface, not just the words." */}
                            {opt.range && (
                              <span className="block text-2xs font-mono text-ink-faint mt-0.5">{opt.range}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Skip lives OUTSIDE the option row, behind a rule. It is not an answer. */}
                    <div className="mt-2 pt-2 border-t border-dashed border-ground-line flex items-center gap-3">
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
                        Skip this one
                      </button>
                      <p className="text-2xs text-ink-faint max-w-md">
                        {isSkipped
                          ? 'Removed from scoring. This is different from answering "unsure", which is a position.'
                          : 'Removes the item from scoring entirely — not the same as "unsure".'}
                      </p>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rule pt-6 flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={onComplete}
          disabled={answered === 0}
          className="px-5 py-2.5 rounded bg-ink text-ground font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          See where that puts you
        </button>
        <p className="text-xs text-ink-muted">
          You can leave questions blank. An axis only drops out when every question feeding it is
          blank or skipped.
        </p>
      </div>
    </div>
  );
}

function AllocationInput({ q, value, onChange }: { q: any; value: number | null; onChange: (v: number) => void }) {
  const cfg = scales.allocation;
  // Stored normalised; displayed as the 0-100 split the question actually asks about.
  const pct = value === null ? cfg.default : Math.round(((value + 1) / 2) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-ink-muted mb-2 gap-4">
        <span className="max-w-[45%]">{q.allocation_poles.low}</span>
        <span className="max-w-[45%] text-right">{q.allocation_poles.high}</span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={pct}
        onChange={(e) => onChange((Number(e.target.value) / 100) * 2 - 1)}
        className="w-full accent-user"
        aria-label={q.text}
      />
      <div className="flex justify-between tabular text-sm mt-1">
        <span className={value === null ? 'text-ink-faint' : 'text-ink'}>{100 - pct}</span>
        <span className={value === null ? 'text-ink-faint' : 'text-ink'}>{pct}</span>
      </div>
      {value === null && (
        <p className="text-2xs text-ink-faint mt-1">Move the slider to answer — it is not counted until you do.</p>
      )}
    </div>
  );
}
