/**
 * The signature element (Build Spec §17): user, house view, organizations and named researchers
 * on the same independent scales, "where the distance between them is the whole argument of the
 * product. Spend the visual boldness there."
 *
 * Horizontal bars, one per axis — NOT an x-y plane by default. The axes are independent and a 2D
 * projection loses that (spec §11.3). The x-y view is a separate, explicitly-labelled toggle.
 *
 * Coverage is drawn, not written: an axis resting on one answered item gets a visibly wider
 * uncertainty band than one resting on three. This is the OWID principle that provenance belongs
 * in the chart rather than in a tooltip.
 */

import type { AxisScore } from '@/lib/scoring';

export interface Overlay {
  id: string;
  label: string;
  value: number | null;
  color: string;
  shape?: 'circle' | 'diamond' | 'square';
}

interface Props {
  axis: { id: string; label: string; low_pole_label: string; high_pole_label: string; weight: number; question: string };
  user?: AxisScore;
  overlays?: Overlay[];
  /** Show the axis question above the bar. Off in dense list views. */
  showQuestion?: boolean;
  onPoleClick?: (pole: 'low' | 'high') => void;
}

const toPct = (v: number) => ((v + 1) / 2) * 100;

export function AxisPlot({ axis, user, overlays = [], showQuestion = false, onPoleClick }: Props) {
  const hasUser = user !== undefined;
  // Coverage 1 of 3 -> a wide band; coverage 3 of 3 -> none. Purely illustrative of confidence,
  // and labelled as such, so it is never mistaken for a measured interval.
  const bandHalfWidth = hasUser
    ? (1 - Math.sqrt(user.coverage / user.contributingItems)) * 22
    : 0;

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <h4 className="text-sm font-medium text-ink">{axis.label}</h4>
        <div className="flex items-center gap-2 text-2xs font-mono text-ink-faint">
          {hasUser && (
            <span title="Answered contributing items out of total. An axis computed from one item is a different object from one computed from three.">
              coverage {user.coverage}/{user.contributingItems}
            </span>
          )}
        </div>
      </div>

      {showQuestion && (
        <p className="text-xs text-ink-muted mb-2 max-w-prose">{axis.question}</p>
      )}

      <div className="relative">
        {/* the scale */}
        <div className="relative h-8 rounded bg-ground-sunk border border-ground-line">
          {/* midpoint tick — labelled, so a marker sitting here is not confused with "no data" */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-ground-line" aria-hidden />

          {/* coverage band behind the user marker */}
          {hasUser && bandHalfWidth > 0.5 && (
            <div
              className="absolute inset-y-1 rounded-sm bg-user/10"
              style={{
                left: `${Math.max(0, toPct(user.value) - bandHalfWidth)}%`,
                width: `${Math.min(100, bandHalfWidth * 2)}%`,
              }}
              title={`Low coverage: this axis rests on ${user.coverage} of ${user.contributingItems} possible answers, so treat the position as approximate.`}
              aria-hidden
            />
          )}

          {/* overlays first, so the user marker sits on top */}
          {overlays.map((o) =>
            o.value === null ? null : (
              <div
                key={o.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${toPct(o.value)}%` }}
                title={`${o.label}: ${o.value.toFixed(2)}`}
              >
                <div
                  className={`h-2.5 w-2.5 border-2 border-ground ${
                    o.shape === 'diamond' ? 'rotate-45' : o.shape === 'square' ? '' : 'rounded-full'
                  }`}
                  style={{ backgroundColor: o.color }}
                />
              </div>
            ),
          )}

          {hasUser && (
            <div
              className="absolute inset-y-0 -translate-x-1/2 flex items-center"
              style={{ left: `${toPct(user.value)}%` }}
            >
              <div className="h-6 w-1 rounded-full bg-user" title={`You: ${user.value.toFixed(2)}`} />
            </div>
          )}
        </div>

        {/* poles double as reading-list entry points — LessWrong wiki-tag pattern: the label is a
            navigational object, not decoration */}
        <div className="flex justify-between mt-1 text-2xs">
          <button
            type="button"
            onClick={() => onPoleClick?.('low')}
            className={`text-left max-w-[45%] ${onPoleClick ? 'text-ink-muted hover:text-user hover:underline' : 'text-ink-faint'}`}
          >
            ← {axis.low_pole_label}
          </button>
          <button
            type="button"
            onClick={() => onPoleClick?.('high')}
            className={`text-right max-w-[45%] ${onPoleClick ? 'text-ink-muted hover:text-user hover:underline' : 'text-ink-faint'}`}
          >
            {axis.high_pole_label} →
          </button>
        </div>
      </div>
    </div>
  );
}

/** An axis the user has no value on. Rendered explicitly — never silently omitted, never centred. */
export function AxisPlotEmpty({ axis, reason }: { axis: Props['axis']; reason: string }) {
  return (
    <div className="py-3 opacity-60">
      <div className="flex items-baseline justify-between gap-4 mb-1.5">
        <h4 className="text-sm font-medium text-ink-muted">{axis.label}</h4>
        <span className="chip-unknown">excluded</span>
      </div>
      <div className="h-8 rounded bg-ground-sunk border border-dashed border-ground-line flex items-center px-3">
        <p className="text-2xs text-ink-faint">{reason}</p>
      </div>
    </div>
  );
}
