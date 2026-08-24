/**
 * Provenance rendering. Build Spec §17: "Sourcing is content, not chrome. A cell reading
 * 'estimated, method: X' is doing the work the product exists to do — design it to be read, not
 * tucked into a tooltip."
 *
 * So: the flag is always visible, and the method is one click away in a <details>, never a hover.
 * Hover-only provenance is unreachable on touch and invisible to a screen reader, which for this
 * product means the primary content is missing.
 */

import { caveatById } from '@/lib/data';

export function Flag({ flag }: { flag: string }) {
  const cls =
    flag === 'sourced' ? 'chip-derived'
    : flag === 'estimated' ? 'chip-estimated'
    : flag === 'placeholder' ? 'chip-assigned'
    : 'chip-unknown';
  return <span className={cls}>{flag}</span>;
}

export interface EstimateLike {
  value: number | null;
  flag: string;
  method: string;
  source?: string;
  low?: number;
  high?: number;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * A number plus its provenance. The range renders next to the point estimate rather than instead
 * of it, because "30 (10–50)" and "30" are different claims and the table must not flatten them.
 */
export function EstimateCell({ est, unit = '' }: { est: EstimateLike; unit?: string }) {
  if (!est) return <span className="chip-unknown">no data</span>;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        {est.value === null ? (
          <span className="text-ink-faint tabular">not collected</span>
        ) : (
          <>
            <span className="tabular text-ink font-medium">{fmt(est.value)}{unit}</span>
            {est.low !== undefined && est.high !== undefined && est.low !== est.high && (
              <span className="tabular text-2xs text-ink-faint">({fmt(est.low)}–{fmt(est.high)})</span>
            )}
          </>
        )}
        <Flag flag={est.flag} />
      </div>
      {est.method && (
        <details className="text-2xs text-ink-muted">
          <summary className="cursor-pointer hover:text-ink select-none">how this was arrived at</summary>
          <p className="mt-1 pl-2 border-l-2 border-ground-line leading-relaxed max-w-prose">
            {est.method}
            {est.source && <> <span className="text-ink-faint">Source: {est.source}.</span></>}
          </p>
        </details>
      )}
    </div>
  );
}

/** How a coordinate got its value. Derived vs assigned vs cited are three different claims. */
export function CoordinateSource({ source }: { source: any }) {
  if (!source) return <span className="chip-unknown">no source</span>;

  if (source.kind === 'derived') {
    return (
      <details className="text-2xs">
        <summary className="cursor-pointer select-none">
          <span className="chip-derived">derived</span>{' '}
          <span className="text-ink-muted">from "{source.source}"</span>
        </summary>
        <p className="mt-1 pl-2 border-l-2 border-derived/30 text-ink-muted leading-relaxed max-w-prose">
          {source.why}
          {source.contribution_count > 1 && (
            <span className="text-ink-faint"> Composed from {source.contribution_count} contributing statements.</span>
          )}
        </p>
      </details>
    );
  }

  if (source.kind === 'cited') {
    return (
      <div className="text-2xs">
        <span className="chip-derived">cited</span>{' '}
        <span className="text-ink-muted">
          as expressed in {source.url
            ? <a href={source.url} className="underline hover:text-user">{source.citation}</a>
            : source.citation}, dated {source.date}
        </span>
      </div>
    );
  }

  return (
    <details className="text-2xs">
      <summary className="cursor-pointer select-none">
        <span className="chip-assigned">assigned</span>{' '}
        <span className="text-ink-muted">not derived from a source</span>
      </summary>
      <p className="mt-1 pl-2 border-l-2 border-assigned/30 text-ink-muted leading-relaxed max-w-prose">
        {source.why}
      </p>
    </details>
  );
}

/**
 * Caveats are load-bearing (spec §13), so an unknown id throws rather than rendering nothing.
 * A caveat that silently disappears is worse than one that was never written.
 */
export function Caveat({ id, compact = false }: { id: string; compact?: boolean }) {
  const c = caveatById.get(id);
  if (!c) throw new Error(`Caveat "${id}" not found in data/content/caveats.json`);

  if (compact) {
    return (
      <details className="text-xs border-l-2 border-ground-line pl-3 py-1">
        <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">{c.title}</summary>
        <p className="mt-1 text-ink-muted leading-relaxed max-w-prose">{c.body}</p>
      </details>
    );
  }

  return (
    <aside className="border-l-2 border-ink-faint/40 pl-4 py-2 my-4">
      <h4 className="text-sm font-medium text-ink mb-1">{c.title}</h4>
      <p className="text-sm text-ink-muted leading-relaxed max-w-prose">{c.body}</p>
    </aside>
  );
}

/** How strong a role's agenda tag is. Three different claims, rendered three different ways. */
export function TagStrength({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string; title: string }> = {
    classified: { label: 'from role content', cls: 'chip-derived',
      title: 'A phrase in this role’s own description named this agenda.' },
    manual: { label: 'reviewed by hand', cls: 'chip-derived',
      title: 'The rule table got this one wrong and it was corrected manually.' },
    inherited: { label: 'from the organization', cls: 'chip-estimated',
      title: 'This role sits at an organization whose primary work is this agenda. A weaker claim than a content-based tag.' },
    untagged: { label: 'not tagged', cls: 'chip-unknown',
      title: 'This organization has not been tagged to an agenda yet.' },
  };
  const m = map[source] ?? map.untagged;
  return <span className={m.cls} title={m.title}>{m.label}</span>;
}
