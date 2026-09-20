/**
 * Deterministic repair pass for AI-tailored CVs.
 *
 * WHY THIS EXISTS
 * ---------------
 * `tailorCVContent()` hands the model the Master CV and takes the model's JSON
 * back wholesale. Nothing compared the two, so anything the model silently
 * dropped — a whole section, an education entry, a role's bullet list — was
 * gone from the generated document with no trace. That is how a CV generated
 * for submission ended up with education entries carrying no bullet points at
 * all, and why the same job could produce a document missing sections the user
 * definitely had on their Master CV.
 *
 * A prompt instruction ("return the keys 1:1") cannot guarantee this: the model
 * is free to omit, and a 4000-token budget actively encourages omission.
 * Restoration has to be deterministic and happen after the model, so the
 * Master CV remains the source of truth by construction rather than by
 * convention.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It never invents content and never rewords. It only copies Master CV values
 * into the model's output where the model left a hole. The model's own wording
 * always wins when present, so tailoring is preserved; the pass is strictly
 * additive.
 *
 * MODE SEMANTICS (mirrors the user-facing Normal / Standout toggle)
 * ---------------------------------------------------------------
 *  - Normal   — keep every entry and every bullet. The model may add and
 *               reword, never remove. This is "fill the entries and tailor".
 *  - Standout — the model may prune whole entries from experience-like
 *               sections to sharpen focus. It may also shorten a retained
 *               entry's bullets. But credentials are never pruned, and a
 *               pruned role may not leave an unexplained employment gap.
 */

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { CvTailoringMode } from './tailoringMode';

type AnyRecord = Record<string, any>;

/**
 * Sections whose entries are credentials rather than experience.
 *
 * STANDOUT is allowed to argue that a job is irrelevant. It is not allowed to
 * argue that a degree or a certification is: an ATS parse that cannot find them
 * reads the application as incomplete, and a human reads a missing degree as
 * concealment. These are restored in every mode.
 */
const CREDENTIAL_SECTIONS = new Set(['education', 'certificates', 'languages']);

/**
 * Sections STANDOUT may prune entries from.
 */
const PRUNABLE_SECTIONS = new Set([
  'work',
  'volunteer',
  'projects',
  'awards',
  'publications',
  'interests',
]);

/**
 * Fields that identify an entry, so a model that reordered or retitled entries
 * can still be matched back to the Master CV. Order matters: the first
 * non-empty combination wins.
 */
const IDENTITY_FIELDS: Record<string, string[]> = {
  work: ['name', 'position'],
  volunteer: ['organization', 'position'],
  education: ['institution', 'studyType'],
  awards: ['title', 'awarder'],
  certificates: ['name', 'issuer'],
  publications: ['name', 'publisher'],
  projects: ['name'],
  languages: ['language'],
  interests: ['name'],
  references: ['name'],
};

/** Sections that hold arrays of entries, and are therefore repairable. */
const ARRAY_SECTIONS = [
  'work',
  'volunteer',
  'education',
  'awards',
  'certificates',
  'publications',
  'skills',
  'languages',
  'interests',
  'references',
  'projects',
] as const;

/**
 * Top-level keys that describe the document rather than its content. If the
 * model omits `structure`, the canvas loses its section order and the CV
 * renders as an unstyled blob, so these are always taken from the Master CV.
 */
const DOCUMENT_SHAPE_KEYS = ['structure', 'content', 'templateId', 'snippetOverrides'] as const;

/** A role missing from the timeline for longer than this is a visible gap. */
const MAX_GAP_MONTHS = 6;

const isBlank = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const normalizeKey = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const identityOf = (entry: AnyRecord | undefined | null, fields: string[]): string => {
  if (!entry || typeof entry !== 'object') return '';
  return fields
    .map((field) => normalizeKey(entry[field]))
    .filter(Boolean)
    .join('|');
};

/**
 * Parse a CV date to a timestamp. CV dates are `YYYY`, `YYYY-MM` or
 * `YYYY-MM-DD`, and open-ended roles are written as "Present"/"Current".
 */
function parseCvDate(value: unknown): number | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^(present|current|now|ongoing)$/i.test(str)) return Date.now();

  const match = str.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 1900 || year > 2200) return null;
  const month = match[2] ? Number(match[2]) - 1 : 0;
  return new Date(year, month, 1).getTime();
}

/**
 * Merge one Master CV entry into the model's version of that same entry.
 *
 * Field-by-field rather than entry-by-entry: the model typically rewrites
 * `summary` and some bullets while leaving `institution` or `startDate` out
 * entirely, and those omissions are what make the document look incomplete.
 *
 * `restoreArrays` is the mode lever. When true (Normal) the Master's array
 * items are unioned back in, so the model can add evidence but never remove it.
 * When false (Standout) the model's bullets stand as long as it produced any,
 * because aggressive retargeting is the whole point of that mode — but an entry
 * the model emptied out is still refilled, since an entry with no content is
 * never a valid outcome.
 */
function mergeEntry(
  ai: AnyRecord,
  master: AnyRecord,
  options: { restoreArrays: boolean }
): void {
  for (const key of Object.keys(master)) {
    if (key === 'id') continue;

    const masterValue = master[key];

    if (Array.isArray(masterValue)) {
      const aiArray = Array.isArray(ai[key]) ? ai[key] : [];

      if (aiArray.length === 0) {
        if (masterValue.length > 0) ai[key] = [...masterValue];
        continue;
      }

      if (options.restoreArrays) {
        const seen = new Set(aiArray.map((item) => normalizeKey(item)));
        for (const item of masterValue) {
          const itemKey = normalizeKey(item);
          if (!itemKey || seen.has(itemKey)) continue;
          aiArray.push(item);
          seen.add(itemKey);
        }
        ai[key] = aiArray;
      }
      continue;
    }

    if (isBlank(ai[key]) && !isBlank(masterValue)) {
      ai[key] = masterValue;
    }
  }
}

/**
 * Contact details and location are facts, not tailoring material. The model has
 * no business rewriting an email address, so these are copied over
 * unconditionally. `summary` and `label` are deliberately excluded — they are
 * the model's main tailoring surface.
 */
function repairBasics(ai: AnyRecord, master: AnyRecord): void {
  const FACTUAL_BASICS = ['name', 'email', 'phone', 'url', 'image', 'location', 'profiles'];

  for (const key of FACTUAL_BASICS) {
    if (!isBlank(master?.[key])) ai[key] = master[key];
  }

  if (isBlank(ai.label) && !isBlank(master?.label)) ai.label = master.label;
  if (isBlank(ai.summary) && !isBlank(master?.summary)) ai.summary = master.summary;
}

/**
 * Align the model's entries with the Master CV's entries.
 *
 * Two identity passes, and deliberately NO positional fallback.
 *
 * A positional fallback was tried first and removed: when the model returned an
 * entry with no Master counterpart (an invention, or a rewrite that erased the
 * employer), the leftover was paired with whatever Master entry happened to sit
 * at that index — and in Normal mode the array union then injected *that* entry's
 * achievements into the wrong role. Cross-contaminating two employers' evidence
 * is far worse than the duplicate it was meant to avoid, so an unmatched model
 * entry is now left completely alone.
 *
 * Pass 2 exists because Standout explicitly invites retitling a role toward the
 * job title while keeping the employer, which breaks a `name + position` match
 * but not a `name` match.
 */
function alignEntries(
  aiEntries: AnyRecord[],
  masterEntries: AnyRecord[],
  identityFields: string[]
): {
  /** Model entry → its Master counterpart, in the model's order. */
  pairs: Array<{ ai: AnyRecord; master: AnyRecord | null }>;
  /** Master indices the model kept. */
  matchedMasterIndices: Set<number>;
} {
  const pairs: Array<{ ai: AnyRecord; master: AnyRecord | null }> = [];
  const matchedMasterIndices = new Set<number>();
  const usedAiIndices = new Set<number>();

  const claim = (aiIndex: number, masterIndex: number) => {
    matchedMasterIndices.add(masterIndex);
    usedAiIndices.add(aiIndex);
  };

  // Pass 1 — full identity (employer + role, or institution + study type, …).
  aiEntries.forEach((ai, aiIndex) => {
    const key = identityOf(ai, identityFields);
    if (!key) return;

    const masterIndex = masterEntries.findIndex(
      (master, index) => !matchedMasterIndices.has(index) && identityOf(master, identityFields) === key
    );
    if (masterIndex === -1) return;

    claim(aiIndex, masterIndex);
    pairs.push({ ai, master: masterEntries[masterIndex] });
  });

  // Pass 2 — primary identity field only, for entries the model retitled.
  const primaryFields = identityFields.slice(0, 1);
  aiEntries.forEach((ai, aiIndex) => {
    if (usedAiIndices.has(aiIndex)) return;
    const key = identityOf(ai, primaryFields);
    if (!key) return;

    const masterIndex = masterEntries.findIndex(
      (master, index) => !matchedMasterIndices.has(index) && identityOf(master, primaryFields) === key
    );
    if (masterIndex === -1) return;

    claim(aiIndex, masterIndex);
    pairs.push({ ai, master: masterEntries[masterIndex] });
  });

  // Anything still unmatched is left untouched; its Master counterpart (if any)
  // is reported as dropped and handled by the mode rules.
  aiEntries.forEach((ai, aiIndex) => {
    if (usedAiIndices.has(aiIndex)) return;
    pairs.push({ ai, master: null });
  });

  return { pairs, matchedMasterIndices };
}

/**
 * Does restoring this role close a gap that STANDOUT's pruning opened?
 *
 * Dropping an unrelated short role is legitimate. Dropping a role such that the
 * timeline now shows nine unexplained months is not — recruiters read that as
 * something being hidden. Only the dropped entries that actually overlap the
 * gap are restored, so unrelated pruning survives.
 */
function entryOverlapsWindow(entry: AnyRecord, windowStart: number, windowEnd: number): boolean {
  const start = parseCvDate(entry.startDate) ?? windowStart;
  const end = parseCvDate(entry.endDate) ?? Date.now();
  return start <= windowEnd && end >= windowStart;
}

function restoreGapClosingWorkEntries(
  retained: AnyRecord[],
  dropped: AnyRecord[]
): AnyRecord[] {
  if (dropped.length === 0 || retained.length < 2) return [];

  const dated = retained
    .map((entry) => ({
      entry,
      start: parseCvDate(entry.startDate),
      end: parseCvDate(entry.endDate),
    }))
    .filter((item) => item.start !== null)
    .sort((a, b) => (b.start as number) - (a.start as number));

  if (dated.length < 2) return [];

  const toRestore: AnyRecord[] = [];

  for (let i = 0; i < dated.length - 1; i += 1) {
    const newer = dated[i];
    const older = dated[i + 1];

    const olderEnd = older.end ?? older.start;
    const newerStart = newer.start;
    if (olderEnd === null || newerStart === null) continue;

    const gapMonths = (newerStart - olderEnd) / (1000 * 60 * 60 * 24 * 30.44);
    if (gapMonths <= MAX_GAP_MONTHS) continue;

    for (const entry of dropped) {
      if (toRestore.includes(entry)) continue;
      if (entryOverlapsWindow(entry, olderEnd, newerStart)) toRestore.push(entry);
    }
  }

  return toRestore;
}

/**
 * Skills are handled separately from the generic entry merge.
 *
 * Skill groups are labelled rather than identified — the model freely renames
 * "Core skills" to "Technical Skills" — so identity matching produces duplicate
 * groups holding the same skills. This works on the flat set of skill strings
 * instead, which sidesteps the labelling problem entirely.
 *
 * Normal mode restores every missing skill, attaching it to the output group
 * that already shares the most skills with its Master group (falling back to
 * appending the Master group when there is no overlap). An earlier version only
 * restored groups whose skills had vanished *entirely*, which let a single
 * dropped skill — e.g. one of three in "Core skills" — disappear unnoticed.
 *
 * Standout mode may drop skills it judges irrelevant. The one thing it may not
 * do is leave a group with no skills at all, since an empty group renders as a
 * dangling category heading.
 */
function repairSkills(aiSkills: AnyRecord[], masterSkills: AnyRecord[], mode: CvTailoringMode): number {
  if (masterSkills.length === 0) return 0;

  let restored = 0;

  const skillKeys = (group: AnyRecord): string[] =>
    (Array.isArray(group?.skills) ? group.skills : [])
      .map((skill) => normalizeKey(skill))
      .filter(Boolean);

  const presentSkills = new Set<string>();
  for (const group of aiSkills) {
    for (const key of skillKeys(group)) presentSkills.add(key);
  }

  const overlapWith = (group: AnyRecord, masterGroup: AnyRecord): number => {
    const groupKeys = new Set(skillKeys(group));
    return skillKeys(masterGroup).filter((key) => groupKeys.has(key)).length;
  };

  for (const masterGroup of masterSkills) {
    const missing = (Array.isArray(masterGroup?.skills) ? masterGroup.skills : []).filter(
      (skill) => !presentSkills.has(normalizeKey(skill))
    );
    if (missing.length === 0) continue;

    // A group whose skills are all gone was pruned wholesale — legitimate in
    // Standout, a defect in Normal.
    if (mode === 'standout') continue;

    // Attach to the output group that shares the most skills with this Master
    // group, so the restored skills land in a sensibly-labelled category.
    let target: AnyRecord | null = null;
    let bestOverlap = 0;
    for (const candidate of aiSkills) {
      const overlap = overlapWith(candidate, masterGroup);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        target = candidate;
      }
    }

    if (target) {
      if (!Array.isArray(target.skills)) target.skills = [];
      target.skills.push(...missing);
    } else {
      aiSkills.push({ ...masterGroup, skills: [...missing] });
    }

    for (const skill of missing) presentSkills.add(normalizeKey(skill));
    restored += missing.length;
  }

  /*
    Refill any group the model emptied. Applies in both modes: an empty skills
    array is never a valid tailoring outcome, only a failure to produce content.
  */
  for (const group of aiSkills) {
    if (skillKeys(group).length > 0) continue;

    const categoryKey = normalizeKey(group?.category);
    const source =
      masterSkills.find((master) => normalizeKey(master?.category) === categoryKey) ||
      masterSkills[0];
    const sourceSkills = Array.isArray(source?.skills) ? source.skills : [];
    if (sourceSkills.length === 0) continue;

    group.skills = [...sourceSkills];
    restored += sourceSkills.length;
  }

  return restored;
}

export interface TailoringRepairResult {
  cvData: UnifiedCVDataStructure;
  /** Content sections the model omitted entirely and that came back from the Master CV. */
  restoredSections: string[];
  /** Layout keys (`structure`, `templateId`, …) restored from the Master CV. */
  restoredShapeKeys: string[];
  /** Individual entries restored because the model dropped them. */
  restoredEntries: number;
}

/**
 * Restore everything the model dropped from the Master CV.
 *
 * Runs after `applyDeterministicAtsPass` so the ATS pass's pinned keywords are
 * already in place and cannot be undone here.
 */
export function repairTailoredCv(
  aiCv: unknown,
  masterCv: UnifiedCVDataStructure,
  mode: CvTailoringMode
): TailoringRepairResult {
  const restoredSections: string[] = [];
  const restoredShapeKeys: string[] = [];
  let restoredEntries = 0;

  if (!aiCv || typeof aiCv !== 'object' || !masterCv || typeof masterCv !== 'object') {
    return {
      cvData: (aiCv as UnifiedCVDataStructure) || masterCv,
      restoredSections,
      restoredShapeKeys,
      restoredEntries,
    };
  }

  const next = JSON.parse(JSON.stringify(aiCv)) as AnyRecord;
  const master = masterCv as unknown as AnyRecord;

  // Document shape first — without `structure` the canvas cannot lay out.
  for (const key of DOCUMENT_SHAPE_KEYS) {
    if (isBlank(next[key]) && !isBlank(master[key])) {
      next[key] = master[key];
      restoredShapeKeys.push(key);
    }
  }

  if (master.basics && typeof master.basics === 'object') {
    if (!next.basics || typeof next.basics !== 'object') {
      next.basics = JSON.parse(JSON.stringify(master.basics));
      restoredSections.push('basics');
    } else {
      repairBasics(next.basics as AnyRecord, master.basics as AnyRecord);
    }
  }

  for (const section of ARRAY_SECTIONS) {
    const masterEntries = Array.isArray(master[section]) ? (master[section] as AnyRecord[]) : [];
    if (masterEntries.length === 0) continue;

    // The model dropped the section outright.
    if (!Array.isArray(next[section])) {
      next[section] = JSON.parse(JSON.stringify(masterEntries));
      restoredSections.push(section);
      restoredEntries += masterEntries.length;
      continue;
    }

    const aiEntries = (next[section] as AnyRecord[]).filter(
      (entry) => entry && typeof entry === 'object'
    );
    next[section] = aiEntries;

    // An empty array where the Master had entries is always a defect, in both
    // modes: the model did not "prune", it failed.
    if (aiEntries.length === 0) {
      next[section] = JSON.parse(JSON.stringify(masterEntries));
      restoredSections.push(section);
      restoredEntries += masterEntries.length;
      continue;
    }

    if (section === 'skills') {
      restoredEntries += repairSkills(aiEntries, masterEntries, mode);
      continue;
    }

    const identityFields = IDENTITY_FIELDS[section] || ['name'];
    const { pairs, matchedMasterIndices } = alignEntries(aiEntries, masterEntries, identityFields);

    const restoreArrays = mode !== 'standout';
    const merged: AnyRecord[] = [];
    for (const pair of pairs) {
      if (pair.master) mergeEntry(pair.ai, pair.master, { restoreArrays });
      merged.push(pair.ai);
    }

    /*
      Entries the model removed.

      Normal restores all of them — "keep every entry" is the contract.
      Standout is allowed to prune, but not into an employment gap, and never
      from a credential section.
    */
    const dropped = masterEntries.filter((_, index) => !matchedMasterIndices.has(index));

    if (dropped.length > 0) {
      if (!PRUNABLE_SECTIONS.has(section) || CREDENTIAL_SECTIONS.has(section) || mode !== 'standout') {
        for (const entry of dropped) {
          merged.push(JSON.parse(JSON.stringify(entry)));
          restoredEntries += 1;
        }
      } else if (section === 'work') {
        const gapClosers = restoreGapClosingWorkEntries(merged, dropped);
        for (const entry of gapClosers) {
          merged.push(JSON.parse(JSON.stringify(entry)));
          restoredEntries += 1;
        }
      }
    }

    next[section] = merged;
  }

  return {
    cvData: next as UnifiedCVDataStructure,
    restoredSections,
    restoredShapeKeys,
    restoredEntries,
  };
}
