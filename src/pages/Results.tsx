/**
 * Results (Build Spec §11.3). The Votely move — personal coordinates, then comparison — but the
 * primary view is deliberately NOT a 2D plane: the axes are independent and a projection loses
 * that. The x-y view exists as a labelled toggle for the two highest-weighted axes only.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  axes, questions, consistencyPairs, targets, agendaById, leverById, readings,
  orgsByAgenda, rolesByAgenda, DATA_AS_OF,
} from '@/lib/data';
import {
  computeAxes, consistencyFlags, jointTakeoverRisk, match, ABSTAIN,
  type Responses, type MatchResult,
} from '@/lib/scoring';
import { AxisPlot, AxisPlotEmpty, type Overlay } from '@/components/AxisPlot';
import { Caveat } from '@/components/Provenance';
import { encode } from '@/lib/permalink';

export function Results({ responses }: { responses: Responses }) {
  const [showAll, setShowAll] = useState<{ technical: boolean; policy: boolean }>({
    technical: false, policy: false,
  });
  const [overlayId, setOverlayId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const scores = useMemo(() => computeAxes(responses, questions, axes), [responses]);
  const flags = useMemo(() => consistencyFlags(responses, questions, consistencyPairs), [responses]);
  const joint = useMemo(() => jointTakeoverRisk(scores), [scores]);
  const results = useMemo(() => match(scores, targets, axes), [scores]);

  const permalink = useMemo(() => {
    const code = encode(responses, questions);
    // Guarded so the component renders outside a browser — scripts/smoke-render.tsx exercises
    // every route through react-dom/server, and a bare `window` reference would make the one
    // page with the most branching logic the one page that could not be smoke-tested.
    if (typeof window === 'undefined') return `#/results?r=${code}`;
    return `${window.location.origin}${window.location.pathname}#/results?r=${code}`;
  }, [responses]);

  const overlayTarget = overlayId ? targets.find((t) => t.id === overlayId) : null;
  const overlaysFor = (axisId: string): Overlay[] =>
    overlayTarget
      ? [{
          id: overlayTarget.id,
          label: overlayTarget.name,
          value: overlayTarget.coordinates[axisId],
          color: '#b45309',
          shape: 'diamond',
        }]
      : [];

  const excludedReason = (axisId: string) => {
    const contributing = questions.filter((q) => (q.loadings as any)[axisId]);
    const allSkipped = contributing.every((q) => responses[q.id] === ABSTAIN);
    const noneAnswered = contributing.every((q) => responses[q.id] === undefined);
    if (allSkipped) return `You skipped all ${contributing.length} question${contributing.length > 1 ? 's' : ''} feeding this axis, so it is excluded from every comparison — not set to the middle.`;
    if (noneAnswered) return `You haven't answered the ${contributing.length} question${contributing.length > 1 ? 's' : ''} feeding this axis yet.`;
    return 'Excluded — no answered question feeds this axis.';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Where that puts you</h1>
        <p className="text-xs text-ink-faint mt-1 tabular">Data as of {DATA_AS_OF}</p>
      </header>

      {flags.length > 0 && <ConsistencySection flags={flags} />}

      {/* ---- the plot ---- */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
          <h2 className="text-lg font-medium">Your position on each axis</h2>
          <label className="text-xs text-ink-muted flex items-center gap-2">
            Compare against
            <select
              value={overlayId ?? ''}
              onChange={(e) => setOverlayId(e.target.value || null)}
              className="border border-ground-line rounded px-2 py-1 bg-ground text-ink"
            >
              <option value="">nothing</option>
              <optgroup label="Technical agendas">
                {targets.filter((t) => t.domain === 'technical').map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              <optgroup label="Policy levers">
                {targets.filter((t) => t.domain === 'policy').map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>

        <p className="text-sm text-ink-muted mb-4 max-w-prose">
          Seventeen independent scales, not a two-dimensional map. Two people can sit in the same
          place on the misalignment chain and route to completely different work because they
          differ on one other axis.
        </p>

        {(['core', 'technical', 'policy'] as const).map((scope) => (
          <div key={scope} className="mb-6">
            <h3 className="text-2xs font-mono uppercase tracking-wider text-ink-faint mb-1">
              {scope} axes
              {scope !== 'core' && <span className="normal-case tracking-normal"> — scored only against {scope} targets</span>}
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

      {joint !== null && <JointRisk value={joint} />}

      <section className="mb-10 rule pt-6">
        <h2 className="text-lg font-medium mb-1">Two lists, deliberately not merged</h2>
        <p className="text-sm text-ink-muted mb-6 max-w-prose">
          Technical agendas are scored on the core and technical axes; policy levers on the core
          and policy axes. Nothing is comparable across the two, so nothing is ranked across them.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <RankedList
            title="Technical agendas"
            results={results.technical}
            expanded={showAll.technical}
            onExpand={() => setShowAll((s) => ({ ...s, technical: true }))}
          />
          <RankedList
            title="Policy levers"
            results={results.policy}
            expanded={showAll.policy}
            onExpand={() => setShowAll((s) => ({ ...s, policy: true }))}
          />
        </div>
      </section>

      <section className="rule pt-6 mb-8">
        <h2 className="text-lg font-medium mb-2">Take this with you</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            readOnly
            value={permalink}
            className="flex-1 min-w-[260px] font-mono text-2xs border border-ground-line rounded px-2 py-1.5 bg-ground-sunk"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(permalink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="px-3 py-1.5 rounded border border-ground-line text-sm hover:border-ink-faint"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <p className="text-2xs text-ink-faint mt-2 max-w-prose">
          Your answers are encoded in the link itself — nothing is stored on a server, and there is
          no account. The encoding keeps "skipped" and "unsure" distinct, so a shared result
          reproduces exactly rather than approximately.
        </p>
      </section>

      <div className="rule pt-6">
        <Caveat id="coordinates-are-derived-not-endorsed" />
        <Caveat id="neglectedness-is-not-a-recommendation" />
        <Caveat id="orgs-as-points" />
      </div>
    </div>
  );
}

function ConsistencySection({ flags }: { flags: ReturnType<typeof consistencyFlags> }) {
  return (
    <section className="mb-8 border border-ground-line rounded p-4 bg-ground-sunk">
      <h2 className="text-sm font-medium mb-1">
        {flags.length === 1 ? 'One place' : `${flags.length} places`} where you said two things that pull against each other
      </h2>
      <p className="text-xs text-ink-muted mb-3 max-w-prose">
        Not an error — these are averaged into your position either way. But the disagreement is
        where the interesting reading is, and it is only visible because there are more questions
        than axes.
      </p>
      <ul className="space-y-3">
        {flags.map((f) => {
          const qa = questions.find((q) => q.id === f.questionA)!;
          const qb = questions.find((q) => q.id === f.questionB)!;
          const axis = axes.find((a) => a.id === f.axis)!;
          const poles = readings[f.axis] ?? {};
          return (
            <li key={f.topic} className="text-sm">
              <p className="text-ink-muted">
                You said <em className="text-ink not-italic font-medium">"{qa.text}"</em> and also{' '}
                <em className="text-ink not-italic font-medium">"{qb.text}"</em>.
              </p>
              <p className="text-xs text-ink-faint mt-1">
                Both load on {axis.label}. Here is why people disagree about that:{' '}
                {Object.keys(poles).filter((k) => !k.startsWith('_')).map((pole, i) => (
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

function JointRisk({ value }: { value: number }) {
  return (
    <section className="mb-10 border-l-2 border-ink-faint/40 pl-4">
      <h2 className="text-sm font-medium">Joint takeover risk: <span className="tabular">{(value * 100).toFixed(0)}%</span></h2>
      <p className="text-xs text-ink-muted mt-1 max-w-prose">
        P(misalignment) × P(scheming | misalignment) × (1 − P(containable | scheming)), on your
        answers. <strong className="font-medium text-ink">This is displayed, not scored.</strong> The
        three links each carry full weight in the matching already; letting the product enter too
        would weight the misalignment story four times over and it would dominate every match.
      </p>
    </section>
  );
}

function RankedList({ title, results, expanded, onExpand }: {
  title: string; results: MatchResult[]; expanded: boolean; onExpand: () => void;
}) {
  const shown = expanded ? results : results.slice(0, 5);

  if (!results.length) {
    return (
      <div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-ink-muted">
          Nothing to rank — you have no axis in common with any target in this domain yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <ol className="space-y-3">
        {shown.map((m, i) => {
          const isPolicy = m.target.domain === 'policy';
          const detail = isPolicy ? leverById.get(m.target.id) : agendaById.get(m.target.id);
          const orgCount = orgsByAgenda.get(m.target.id)?.length ?? 0;
          const roleCount = rolesByAgenda.get(m.target.id)?.length ?? 0;

          return (
            <li key={m.target.id} className="border border-ground-line rounded p-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link to={`/agenda/${m.target.id}`} className="font-medium hover:text-user hover:underline">
                  <span className="text-ink-faint tabular text-xs mr-1.5">{i + 1}</span>
                  {m.target.name}
                </Link>
                <span className="tabular text-sm text-ink-muted">{(m.score * 100).toFixed(0)}</span>
              </div>

              {detail?.one_sentence_summary && (
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">{detail.one_sentence_summary}</p>
              )}

              <p className="text-xs text-ink-muted mt-2">{m.explanation}</p>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-ink-faint">
                <span title="Axes where both you and this target had a value.">
                  {m.axesUsed} axes compared
                </span>
                {m.axesDropped > 0 && (
                  <span title="Axes dropped because one side had no value. Not imputed.">
                    {m.axesDropped} dropped as unknown
                  </span>
                )}
                {orgCount > 0 && <span>{orgCount} orgs</span>}
                {roleCount > 0 && <Link to={`/browse?agenda=${m.target.id}`} className="underline hover:text-user">{roleCount} live roles</Link>}
              </div>
            </li>
          );
        })}
      </ol>

      {!expanded && results.length > 5 && (
        <button type="button" onClick={onExpand} className="mt-3 text-xs underline text-ink-muted hover:text-user">
          Show all {results.length}
        </button>
      )}
    </div>
  );
}
