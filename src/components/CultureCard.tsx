/**
 * How Sydney's organization notes reach the reader.
 *
 * The sheet has two input tabs and they play different roles, which the UI has to preserve:
 *
 *   "Orgs (Sydney)"    free-text answers to seven prompts about what a place is actually like.
 *                      This is the PROSE, and it is the thing a newcomer cannot get anywhere else.
 *   "Scoring (Ayan)"   nine numbers derived from that prose.
 *
 * The numbers are the machinery: they drive the reranking, which is what makes "where would I work
 * well" answerable at all. The prose is the evidence: it is what lets someone check the number, and
 * it is more useful than the number on its own, because "runs on 10-week cycles with a demo at the
 * end" tells you more than "pace: -0.6".
 *
 * So the prose is not a tooltip on the score. It renders as the body of the card, with the bars
 * underneath as the summary. That is the same order the agenda pages use, stated assumptions first
 * and derived coordinates after, for the same reason: a reader should meet the evidence before the
 * number so the number is checkable rather than asserted.
 *
 * PROVENANCE IS DIFFERENT HERE AND MUST LOOK DIFFERENT. An agenda coordinate is derived from what
 * that agenda's own proponents published. A culture coordinate is one person's read of an
 * organization from outside. That is a weaker and more contestable claim about a named institution,
 * so it carries an assessor, a date and a confidence, and says plainly that it is a judgement.
 */

import { AxisPlot } from '@/components/AxisPlot';
import type { CultureAxis, CulturePlacement } from '@/lib/culture';

interface Props {
  orgName: string;
  placement: CulturePlacement;
  axes: CultureAxis[];
  /** The viewer's own culture position, plotted alongside so the gap is visible. */
  userScores?: Record<string, { value: number; coverage: number; contributingItems: number }>;
  /** Axes where viewer and org are furthest apart, from rankByCulture. */
  frictions?: { axis: string; label: string; distance: number }[];
}

const CONFIDENCE_COPY: Record<string, string> = {
  High: 'Close knowledge of this organization.',
  Medium: 'Some direct knowledge, some inference.',
  Low: 'Largely inferred from public material. Treat as a starting point.',
};

export function CultureCard({ orgName, placement, axes, userScores, frictions }: Props) {
  const notes = Object.entries(placement.notes ?? {}).filter(([, v]) => v?.trim());
  const frictionIds = new Set((frictions ?? []).map((f) => f.axis));

  return (
    <section className="border border-ground-line rounded p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3 className="font-medium">What {orgName} is like to work at</h3>
        <span className="chip-estimated">assessment, not a source</span>
      </div>

      {/* The prose first. It is the evidence, and it is the part with no substitute. */}
      {notes.length > 0 ? (
        <dl className="space-y-2.5 mb-5">
          {notes.map(([prompt, answer]) => (
            <div key={prompt}>
              <dt className="text-2xs font-mono uppercase tracking-wider text-ink-faint">{prompt}</dt>
              <dd className="text-sm leading-relaxed max-w-prose mt-0.5">{answer}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-ink-muted mb-5">
          Scored, but without written notes. The bars below are all there is for this one.
        </p>
      )}

      {/* Then the bars, as the summary of what the prose said. */}
      <div className="divide-y divide-ground-line">
        {axes.map((axis) => {
          const v = placement.coordinates[axis.id];
          if (v === null || v === undefined) {
            // Blank is unknown, never neutral. Say so rather than drawing a marker at centre.
            return (
              <div key={axis.id} className="py-2 flex items-baseline justify-between gap-3 opacity-60">
                <span className="text-sm text-ink-muted">{axis.label}</span>
                <span className="chip-unknown">not assessed</span>
              </div>
            );
          }
          return (
            <div key={axis.id} className={frictionIds.has(axis.id) ? 'bg-house/5 -mx-2 px-2' : ''}>
              <AxisPlot
                axis={{ ...axis, question: '' }}
                user={userScores?.[axis.id] as any}
                overlays={[{ id: 'org', label: orgName, value: v, color: '#b45309', shape: 'diamond' }]}
              />
            </div>
          );
        })}
      </div>

      {frictions && frictions.length > 0 && (
        <p className="text-xs text-ink-muted mt-3 border-l-2 border-house/50 pl-3 max-w-prose">
          Furthest from what you said you wanted on{' '}
          {frictions.map((f) => f.label.toLowerCase()).join(', ')}. Highlighted above. That is not a
          reason to rule it out, it is the thing to ask about.
        </p>
      )}

      {/* Provenance. Deliberately unlike an agenda coordinate's, because the claim is weaker. */}
      <footer className="mt-4 pt-3 border-t border-ground-line text-2xs text-ink-muted leading-relaxed max-w-prose">
        <p>
          Culture assessment by <strong className="font-medium text-ink">{placement.assessor}</strong>,{' '}
          {placement.assessed_on}. Confidence: {placement.confidence.toLowerCase()}.{' '}
          {CONFIDENCE_COPY[placement.confidence] ?? ''}
        </p>
        <p className="mt-1">
          One person's read of an organization from outside, which is a weaker claim than the agenda
          coordinates, and those derive from what an agenda's own proponents published. Places change,
          and a team is not the same as the place it sits inside. If you work here and this is wrong,
          we would rather know.
        </p>
      </footer>
    </section>
  );
}

/**
 * The line that appears next to an org everywhere ELSE, in the ranked list and on role rows, where
 * a full card would not fit. One sentence, plus the date, because an undated assessment of a named
 * organization should never render without its date attached.
 */
export function CultureLine({ placement, summary }: { placement: CulturePlacement; summary: string }) {
  return (
    <p className="text-xs text-ink-muted mt-1 border-l-2 border-ground-line pl-2 max-w-prose">
      {summary}{' '}
      <span className="text-ink-faint">
        ({placement.assessor}, {placement.assessed_on}, {placement.confidence.toLowerCase()} confidence)
      </span>
    </p>
  );
}
