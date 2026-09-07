/**
 * Workplace preference helpers — single source of truth for how workplace
 * setup is stored, normalized, and turned into matching constraints.
 *
 * Used by:
 *  - AutoApplyPanel (settings UI) — edit/persist `workplaceTypes`
 *  - candidateProfileExtractor — derive workplace preference + remote-only
 *    constraint from a saved profile
 *  - /api/jobs/discover — decide the remote-only retrieval pool from the
 *    feed's explicit filters vs. the profile default
 *
 * Canonical storage: `workplaceTypes: ('remote' | 'hybrid' | 'onsite')[]` on
 * the job-search profile. Legacy profiles sometimes stored label strings
 * ('Remote', 'On-site', 'Hybrid / Remote') inside `locations` — those are
 * migrated into the canonical field and stripped from the city list.
 */

export type WorkplaceType = 'remote' | 'hybrid' | 'onsite';
export type WorkplacePreference = 'remote' | 'hybrid' | 'onsite' | 'any';

export const WORKPLACE_TYPES: readonly WorkplaceType[] = ['remote', 'hybrid', 'onsite'] as const;

export const WORKPLACE_ID_TO_LABEL: Record<WorkplaceType, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

const WORKPLACE_LABEL_TO_ID: Record<string, WorkplaceType> = {
  remote: 'remote',
  'remote only': 'remote',
  'remote-only': 'remote',
  hybrid: 'hybrid',
  'hybrid / remote': 'hybrid',
  'remote / hybrid': 'hybrid',
  onsite: 'onsite',
  'on-site': 'onsite',
  'on site': 'onsite',
};

/** Map a label or id ('Remote', 'on-site', 'hybrid', ...) to a WorkplaceType id. */
export function workplaceLabelToId(label: string): WorkplaceType | undefined {
  return WORKPLACE_LABEL_TO_ID[label.trim().toLowerCase()];
}

/**
 * Normalize a raw `workplaceTypes` value (any shape — labels or ids) into a
 * deduplicated list of canonical ids in a stable order.
 */
export function normalizeWorkplaceTypes(raw: unknown): WorkplaceType[] {
  const seen = new Set<WorkplaceType>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (typeof entry !== 'string') continue;
    const id = workplaceLabelToId(entry);
    if (id) seen.add(id);
  }
  return WORKPLACE_TYPES.filter((t) => seen.has(t));
}

/**
 * Normalize a raw profile's workplace data into the canonical form:
 * - `workplaceTypes`: ids, derived from either the canonical field or legacy
 *   label entries found inside `locations`
 * - `locations`: city/region entries only (workplace labels removed)
 */
export function normalizeWorkplaceData(
  workplaceTypes: unknown,
  locations: string[] = []
): { workplaceTypes: WorkplaceType[]; locations: string[] } {
  const ids = new Set<WorkplaceType>();
  for (const t of normalizeWorkplaceTypes(workplaceTypes)) ids.add(t);
  const cleanLocations: string[] = [];
  for (const loc of locations) {
    const id = workplaceLabelToId(loc);
    if (id) ids.add(id);
    else cleanLocations.push(loc);
  }
  return {
    workplaceTypes: WORKPLACE_TYPES.filter((t) => ids.has(t)),
    locations: cleanLocations,
  };
}

/**
 * Whether the user's workplace selection is a hard "remote only" constraint.
 * Exclusively remote = constrained. A legacy `remoteOnly: true` flag is honored
 * only when no explicit workplace selection exists (an explicit selection wins
 * once the user expresses one).
 */
export function deriveRemoteOnly(
  workplaceTypes: WorkplaceType[],
  legacyRemoteOnly: boolean = false
): boolean {
  const hasSelection = workplaceTypes.length > 0;
  const exclusivelyRemote =
    workplaceTypes.includes('remote') &&
    !workplaceTypes.includes('hybrid') &&
    !workplaceTypes.includes('onsite');
  return exclusivelyRemote || (legacyRemoteOnly && !hasSelection);
}

/**
 * Collapse a workplace selection into the single preference the scoring
 * pipeline understands. 'any' when no selection or when the user is open to
 * both remote and onsite.
 */
export function deriveWorkplacePreference(workplaceTypes: WorkplaceType[]): WorkplacePreference {
  if (workplaceTypes.length === 0) return 'any';
  const prefersRemote = workplaceTypes.includes('remote');
  const prefersOnsite = workplaceTypes.includes('onsite');
  if (prefersRemote && prefersOnsite) return 'any';
  if (prefersRemote) return 'remote';
  if (prefersOnsite) return 'onsite';
  return 'hybrid';
}

/**
 * Decide whether the discover feed's retrieval pool should be remote-only.
 * Explicit feed filters always win over the standing profile constraint:
 *  - `remoteOnly` URL param (explicit) → remote pool
 *  - workplaceType pills → only a single "remote" selection implies a remote
 *    pool; "onsite" / "hybrid" / mixed selections must retrieve a broad pool so
 *    the post-retrieval workplace filter can work
 *  - no explicit workplace choice → fall back to the profile's remote-only
 *    default as personalization
 */
export function resolveFeedRemoteOnly(options: {
  remoteOnlyParam?: boolean;
  workplaceFilter?: string[];
  profileRemoteOnly?: boolean;
}): boolean {
  if (options.remoteOnlyParam) return true;
  if (options.workplaceFilter && options.workplaceFilter.length > 0) {
    return options.workplaceFilter.length === 1 && options.workplaceFilter[0] === 'remote';
  }
  return options.profileRemoteOnly ?? false;
}