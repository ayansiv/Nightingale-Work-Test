/**
 * Permalink encoding (Build Spec §11.7).
 *
 * "This is the distribution mechanism; without it the tool gets used once and not passed on."
 *
 * Requirements:
 *   - compact, no round-trip to a server
 *   - MUST distinguish abstained from unsure
 *   - a permalinked result reproduces EXACTLY (acceptance criterion)
 *
 * Format: `v<n>.<chars>` where each question contributes exactly one character, in config order.
 * One char per question means the string is stable in length, diffable by eye, and a change to
 * one answer changes exactly one character — which makes bugs in this file visible rather than
 * mysterious.
 *
 *   _   abstained   (removed from scoring)
 *   .   unanswered  (never shown to the user)
 *   a-e discrete response levels, per the question's own scale
 *   0-9,A-U  allocation bucket (0-100 in steps of ~3.2)
 *
 * The alphabet deliberately never assigns a digit or letter to abstain, so an abstain can never
 * be silently read as a response by an older or newer parser.
 */

import { ABSTAIN, type Response, type Responses, type Question } from './scoring.js';

/**
 * Bump this whenever the question SET changes — adding, removing or reordering an item shifts
 * every character after the change point, so an old link would decode into the wrong answers
 * rather than failing. v1 -> v2 when q29 and q30 were added.
 *
 * `decode` also refuses a body whose length does not match the current question count, so a
 * forgotten bump fails safe instead of silently misreading. Belt and braces, because the failure
 * mode here is invisible: a misaligned link still produces a plausible-looking result page.
 */
const VERSION = 'v2';
const ABSTAIN_CHAR = '_';
const UNANSWERED_CHAR = '.';

/** Discrete scales, in ascending value order. Index -> char, char -> value. */
const DISCRETE: Record<string, number[]> = {
  credence: [-1, -0.5, 0, 0.5, 1],
  agreement: [-1, -0.5, 0, 0.5, 1],
  willingness: [-1, -0.33, 0.33, 1],
};
const LEVEL_CHARS = 'abcde';

/** Allocation is 0-100; 31 buckets keeps it to one char while staying finer than the 5% UI step. */
const ALLOC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTU';
const ALLOC_BUCKETS = ALLOC_CHARS.length;

function encodeOne(q: Question, r: Response): string {
  if (r === ABSTAIN) return ABSTAIN_CHAR;
  if (r === undefined) return UNANSWERED_CHAR;

  if (q.response_type === 'allocation') {
    // r is the normalised [-1,1] value; recover the 0-100 allocation.
    const pct = ((r + 1) / 2) * 100;
    const bucket = Math.round((pct / 100) * (ALLOC_BUCKETS - 1));
    return ALLOC_CHARS[Math.max(0, Math.min(ALLOC_BUCKETS - 1, bucket))];
  }

  const levels = DISCRETE[q.response_type];
  if (!levels) return UNANSWERED_CHAR;
  let idx = levels.indexOf(r);
  if (idx === -1) {
    // Tolerate float drift by snapping to the nearest level rather than losing the answer.
    let best = 0;
    let bestD = Infinity;
    levels.forEach((v, i) => { const d = Math.abs(v - r); if (d < bestD) { bestD = d; best = i; } });
    idx = best;
  }
  return LEVEL_CHARS[idx];
}

function decodeOne(q: Question, ch: string): Response {
  if (ch === ABSTAIN_CHAR) return ABSTAIN;
  if (ch === UNANSWERED_CHAR) return undefined;

  if (q.response_type === 'allocation') {
    const bucket = ALLOC_CHARS.indexOf(ch);
    if (bucket === -1) return undefined;
    const pct = (bucket / (ALLOC_BUCKETS - 1)) * 100;
    return (pct / 100) * 2 - 1;
  }

  const levels = DISCRETE[q.response_type];
  const idx = LEVEL_CHARS.indexOf(ch);
  if (!levels || idx === -1 || idx >= levels.length) return undefined;
  return levels[idx];
}

export function encode(responses: Responses, questions: Question[]): string {
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  return `${VERSION}.${ordered.map((q) => encodeOne(q, responses[q.id])).join('')}`;
}

export function decode(code: string, questions: Question[]): Responses {
  const out: Responses = {};
  if (!code) return out;

  const [version, body] = code.split('.', 2);
  if (version !== VERSION || !body) return out;

  const ordered = [...questions].sort((a, b) => a.order - b.order);
  // A body of the wrong length cannot be aligned to these questions. Refuse rather than guess.
  if (body.length !== ordered.length) return out;
  ordered.forEach((q, i) => {
    const ch = body[i];
    if (ch === undefined) return;
    const r = decodeOne(q, ch);
    // Store the key even when the value is ABSTAIN — that is the whole point. Only genuinely
    // unanswered questions are left absent.
    if (r !== undefined) out[q.id] = r;
  });

  return out;
}

/** Round-trip check used by scripts/verify-data.ts against the acceptance criterion. */
export function roundTrips(responses: Responses, questions: Question[]): boolean {
  const back = decode(encode(responses, questions), questions);
  for (const q of questions) {
    const a = responses[q.id];
    const b = back[q.id];
    if (a === undefined && b === undefined) continue;
    if (a === ABSTAIN || b === ABSTAIN) {
      if (a !== b) return false;
      continue;
    }
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    if (Math.abs(a - b) > 0.05) return false;
  }
  return true;
}
