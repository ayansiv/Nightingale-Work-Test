/**
 * Provenance chips.
 *
 * This file used to also hold Caveat, EstimateCell and CoordinateSource — components that wrapped
 * the same paragraph of methodology and rendered it on every surface, every row and every
 * coordinate. That is what trained readers to skip all of it. The prose now lives once per page,
 * written for the page it is on, and what survives here is the part that genuinely varies per
 * item: how strong a claim this particular number or tag is.
 */

/** Where a figure came from. Colour is never the only channel — the word is always there. */
export function Flag({ flag }: { flag: string }) {
  const cls =
    flag === 'sourced' ? 'chip-derived'
    : flag === 'estimated' ? 'chip-estimated'
    : flag === 'placeholder' ? 'chip-assigned'
    : 'chip-unknown';
  return <span className={cls}>{flag}</span>;
}

/**
 * How strong a role's agenda tag is. These are three different claims and the UI must not merge
 * them: 259 of 646 roles carry the middle one, so flattening them would be the single most
 * misleading thing this interface could do.
 */
export function TagStrength({ source }: { source: string }) {
  const map: Record<string, { label: string; cls: string; title: string }> = {
    classified: {
      label: 'from role content', cls: 'chip-derived',
      title: 'A phrase in this role’s own description named this agenda.',
    },
    manual: {
      label: 'reviewed by hand', cls: 'chip-derived',
      title: 'The rule table got this one wrong and it was corrected manually.',
    },
    inherited: {
      label: 'from the organization', cls: 'chip-estimated',
      title: 'This role sits at an organization whose primary work is this agenda — a weaker claim than a content-based tag.',
    },
    untagged: {
      label: 'not tagged', cls: 'chip-unknown',
      title: 'This organization has not been tagged to an agenda yet.',
    },
  };
  const m = map[source] ?? map.untagged;
  return <span className={m.cls} title={m.title}>{m.label}</span>;
}
