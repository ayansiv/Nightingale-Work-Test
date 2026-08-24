/**
 * Results.
 *
 * The two ranked lists sit SIDE BY SIDE at the top, above the axis plot. That inverts the first
 * draft, which led with seventeen bars and buried the answer a screen and a half down. The lists
 * are what someone came for; the bars are the justification, and justification goes after.
 *
 * Ranking is drawn as a ranking: a numbered column, a bar whose length is the score, and a clear
 * drop from first to fifth. A list of scores in small grey text is not a ranking, it is a table.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  axes, questions, consistencyPairs, targets, agendaById, leverById,
  orgsByAgenda, rolesByAgenda, readings,
} from '@/lib/data';
import {
  computeAxes, consistencyFlags, jointTakeoverRisk, match, ABSTAIN,
  type Responses, type MatchResult,
} from '@/lib/scoring';
import { AxisPlot, AxisPlotEmpty, type Overlay } from '@/components/AxisPlot';
import { encode } from '@/lib/permalink';

export function Results({ responses }: { responses: Responses }) {
  const scores = useMemo(() => computeAxes(responses, questions, axes), [responses]);
  const flags = useMemo(() => consistencyFlags(responses, questions, consistencyPairs), [responses]);
  const joint = useMemo(() => jointTakeoverRisk(scores), [scores]);
  const results = useMemo(() => match(scores, targets, axes), [scores]);

  const [compareIds, setCompareIds] = useState<string[]>([]);

  const compared = compareIds
    .map((id) => targets.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const PALETTE = ['#b45309', '#0f766e', '#7c3aed'];
  const overlaysFor = (axisId: string): Overlay[] =>
    compared.map((t, i) => ({
      id: t.id,
      label: t.name,
      value: t.coordinates[axisId],
      color: PALETTE[i % PALETTE.length],
      shape: (['diamond', 'square', 'circle'] as const)[i % 3],
    }));

  const toggleCompare = (id: string) =>
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? [...prev.slice(1), id] : [...prev, id],
    );

  const excludedReason = (axisId: string) => {
    const contributing = questions.filter((q) => (q.loadings as any)[axisId]);
    const allSkipped = contributing.every((q) => responses[q.id] === ABSTAIN);
    const n = contributing.length;
    if (allSkipped) return `You skipped ${n === 1 ? 'the question' : `all ${n} questions`} feeding this axis, so it's left out of every comparison rather than set to the middle.`;
    return `Not enough answered to place you on this one.`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Where that puts you</h1>

      {flags.length > 0 && <ConsistencySection flags={flags} />}

      {/* ---- the answer, first ---- */}
      <section className="mb-10">
        <h2 className="text-lg font-medium mb-1">The agendas most aligned with your worldview</h2>
        <p className="text-sm text-ink-muted mb-5 max-w-prose">
          Two lists, ranked separately. Nothing is comparable across them, so nothing is ranked
          across them. Select up to three to overlay on the axes below.
        </p>

        <div className="grid lg:grid-cols-2 gap-x-8 gap-y-6">
          <RankedList title="Technical agendas" results={results.technical}
                      compareIds={compareIds} onCompare={toggleCompare} palette={PALETTE} />
          <RankedList title="Policy levers" results={results.policy}
                      compareIds={compareIds} onCompare={toggleCompare} palette={PALETTE} />
        </div>
      </section>

      {/* ---- why ---- */}
      <section className="mb-10 rule pt-6">
        <div className="flex items-baseline justify-between gap-4 mb-1 flex-wrap">
          <h2 className="text-lg font-medium">Why — your position on each axis</h2>
          {compared.length > 0 && (
            <button onClick={() => setCompareIds([])}
                    className="text-xs underline text-ink-muted hover:text-user">
              clear comparison
            </button>
          )}
        </div>
        <p className="text-sm text-ink-muted mb-4 max-w-prose">
          Independent scales, not a map. Two people can sit in the same place on the misalignment
          chain and route to different work because they differ on one other axis.
        </p>

        {compared.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <LegendKey color="#1c4ed8" shape="bar" label="You" />
            {compared.map((t, i) => (
              <LegendKey key={t.id} color={PALETTE[i % PALETTE.length]}
                         shape={(['diamond', 'square', 'circle'] as const)[i % 3]} label={t.name} />
            ))}
          </div>
        )}

        {(['core', 'technical', 'policy'] as const).map((scope) => (
          <div key={scope} className="mb-6">
            <h3 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">
              {scope} axes
              {scope !== 'core' && <span className="normal-case tracking-normal"> — {scope} targets only</span>}
            </h3>
            <div className="divide-y divide-ground-line">
              {axes.filter((a) => a.scope === scope).map((a) =>
                scores[a.id] ? (
                  <AxisPlot key={a.id} axis={a} user={scores[a.id]} overlays={overlaysFor(a.id)} showQuestion />
                ) : (
                  <AxisPlotEmpty key={a.id} axis={a} reason={excludedReason(a.id)} />
                ),
              )}
            </div>
          </div>
        ))}
      </section>

      {joint !== null && (
        <section className="mb-10 border-l-2 border-ink-faint/40 pl-4">
          <h2 className="text-sm font-medium">
            Joint takeover risk: <span className="tabular">{(joint * 100).toFixed(0)}%</span>
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-prose">
            P(misalignment) × P(scheming | misalignment) × (1 − P(containable | scheming)).
          </p>
        </section>
      )}

      <SharePanel responses={responses} />
    </div>
  );
}

function LegendKey({ color, shape, label }: { color: string; shape: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-muted">
      <span
        className={`inline-block ${shape === 'bar' ? 'h-3.5 w-1 rounded-full' : 'h-2.5 w-2.5'} ${
          shape === 'diamond' ? 'rotate-45' : shape === 'circle' ? 'rounded-full' : ''
        }`}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function SharePanel({ responses }: { responses: Responses }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const link = useMemo(() => {
    const code = encode(responses, questions);
    const base = typeof window === 'undefined'
      ? '' : `${window.location.origin}${window.location.pathname}`;
    // Path form, not ?r= — a query string inside a fragment gets truncated by some chat clients
    // and terminals. A path segment survives everywhere.
    return `${base}#/results/${code}`;
  }, [responses]);

  /** Only claim success when the write actually succeeded. */
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setState('copied');
      } else {
        setState('failed');
      }
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2500);
  };

  return (
    <section className="rule pt-6">
      <h2 className="text-lg font-medium mb-2">Share this</h2>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          className="flex-1 min-w-[260px] font-mono text-2xs border border-ground-line rounded px-2 py-1.5 bg-ground-sunk"
        />
        <button onClick={copy}
                className="px-3 py-1.5 rounded border border-ground-line text-sm hover:border-ink-faint">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select it and copy' : 'Copy link'}
        </button>
      </div>
      <p className="text-2xs text-ink-faint mt-2 max-w-prose">
        Your answers are encoded in the link itself — nothing is stored anywhere. Skipped and
        unsure stay distinct, so a shared result reproduces exactly.
      </p>
    </section>
  );
}

function ConsistencySection({ flags }: { flags: ReturnType<typeof consistencyFlags> }) {
  return (
    <section className="mb-8 border border-ground-line rounded p-4 bg-ground-sunk">
      <h2 className="text-sm font-medium mb-1">
        {flags.length === 1 ? 'One place' : `${flags.length} places`} where you said two things that pull against each other
      </h2>
      <p className="text-xs text-ink-muted mb-3 max-w-prose">
        Not an error — both are averaged into your position. But the disagreement is where the
        interesting reading is.
      </p>
      <ul className="space-y-3">
        {flags.map((f) => {
          const qa = questions.find((q) => q.id === f.questionA)!;
          const qb = questions.find((q) => q.id === f.questionB)!;
          const axis = axes.find((a) => a.id === f.axis)!;
          const poles = Object.keys(readings[f.axis] ?? {}).filter((k) => !k.startsWith('_'));
          return (
            <li key={f.topic} className="text-sm">
              <p className="text-ink-muted">
                You said <em className="text-ink not-italic font-medium">"{qa.text}"</em> and also{' '}
                <em className="text-ink not-italic font-medium">"{qb.text}"</em>.
              </p>
              <p className="text-xs text-ink-faint mt-1">
                Both load on {axis.label}. Why people disagree:{' '}
                {poles.map((pole, i) => (
                  <span key={pole}>
                    {i > 0 && ' · '}
                    <Link to={`/axis/${f.axis}#${pole}`} className="underline hover:text-user">{pole}</Link>
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RankedList({ title, results, compareIds, onCompare, palette }: {
  title: string;
  results: MatchResult[];
  compareIds: string[];
  onCompare: (id: string) => void;
  palette: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? results : results.slice(0, 5);
  const top = results[0]?.score ?? 1;

  if (!results.length) {
    return (
      <div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-ink-muted">
          Nothing to rank — you have no axis in common with any target here yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-3 pb-1.5 border-b border-ink-faint/30">{title}</h3>
      <ol className="space-y-2.5">
        {shown.map((m, i) => {
          const detail = m.target.domain === 'policy'
            ? leverById.get(m.target.id) : agendaById.get(m.target.id);
          const roleCount = rolesByAgenda.get(m.target.id)?.length ?? 0;
          const orgCount = orgsByAgenda.get(m.target.id)?.length ?? 0;
          const selectedAt = compareIds.indexOf(m.target.id);

          return (
            <li key={m.target.id} className="flex gap-3">
              {/* rank number, sized so first place reads as first place */}
              <span
                className={`tabular shrink-0 text-right leading-none pt-0.5 ${
                  i === 0 ? 'text-2xl font-semibold text-ink w-7'
                  : i < 3 ? 'text-lg font-medium text-ink-muted w-7'
                  : 'text-sm text-ink-faint w-7'
                }`}
              >
                {i + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <Link to={`/agenda/${m.target.id}`}
                        className={`hover:text-user hover:underline truncate ${i === 0 ? 'font-medium' : ''}`}>
                    {m.target.name}
                  </Link>
                  <span className="tabular text-xs text-ink-muted shrink-0">
                    {(m.score * 100).toFixed(0)}
                  </span>
                </div>

                {/* score bar — length relative to the top match, so the drop-off is visible */}
                <div className="h-1 bg-ground-sunk rounded-full overflow-hidden mt-1 mb-1">
                  <div className="h-full rounded-full"
                       style={{
                         width: `${Math.max(4, (m.score / top) * 100)}%`,
                         backgroundColor: selectedAt >= 0 ? palette[selectedAt % palette.length] : '#1c4ed8',
                         opacity: i === 0 ? 1 : 0.55,
                       }} />
                </div>

                {i === 0 && detail?.one_sentence_summary && (
                  <p className="text-xs text-ink-muted leading-snug mt-1">{detail.one_sentence_summary}</p>
                )}
                <p className="text-xs text-ink-muted mt-0.5">{m.explanation}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-2xs text-ink-faint">
                  <span title="Axes where both you and this target had a value.">
                    {m.axesUsed} axes
                  </span>
                  {m.axesDropped > 0 && <span title="Dropped because one side had no value.">{m.axesDropped} unknown</span>}
                  {orgCount > 0 && <span>{orgCount} orgs</span>}
                  {roleCount > 0 && (
                    <Link to={`/roles?agenda=${m.target.id}`} className="underline hover:text-user">
                      {roleCount} roles
                    </Link>
                  )}
                  <button
                    onClick={() => onCompare(m.target.id)}
                    className={`underline ${selectedAt >= 0 ? 'text-ink font-medium' : 'hover:text-user'}`}
                  >
                    {selectedAt >= 0 ? 'comparing' : 'compare'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {!expanded && results.length > 5 && (
        <button onClick={() => setExpanded(true)}
                className="mt-3 text-xs underline text-ink-muted hover:text-user">
          Show all {results.length}
        </button>
      )}
    </div>
  );
}
