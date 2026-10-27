/**
 * mori-proposed-changes.ts
 *
 * Mori used to mutate the CV the instant the model answered, so the user only
 * saw the result — never what changed, and never a chance to reject it. This
 * module turns "old CV vs new CV" into a short, human-readable review list that
 * the chat can show next to Apply / Decline.
 *
 * Design notes:
 * - We reuse `diffCVData` (field-level, id-insensitive) rather than inventing a
 *   second comparison, so review and merge can never disagree.
 * - Paths are turned into section + entry labels by reading the record itself,
 *   because "experience[2].description" is meaningless to a user while
 *   "Senior PM at Acme — Description" is not.
 * - HTML is stripped: the canvas stores descriptions as markup, and dumping
 *   `<p><ul><li>` into a review card is unreadable.
 */

import { diffCVData } from '@/types/cv-edit-ops';

export type MoriChangeKind = 'added' | 'updated' | 'removed';

export interface MoriProposedChange {
  /** Raw CV section key, e.g. `experience` — used to highlight the canvas. */
  sectionKey: string;
  /** Human section name, e.g. "Experience". */
  section: string;
  /** Which entry within the section, e.g. "Senior PM at Acme". */
  label: string;
  /** Which field changed, e.g. "Description". Empty for whole-record changes. */
  field: string;
  kind: MoriChangeKind;
  before: string;
  after: string;
}

export interface MoriProposal {
  changes: MoriProposedChange[];
  /** Changes beyond `MAX_VISIBLE_CHANGES`, reported as a single "+N more". */
  hiddenCount: number;
}

const MAX_VISIBLE_CHANGES = 12;
const MAX_TEXT_LENGTH = 260;

const SECTION_LABELS: Record<string, string> = {
  basics: 'Header',
  summary: 'Summary',
  experience: 'Experience',
  work: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  projects: 'Projects',
  certifications: 'Certifications',
  certificates: 'Certifications',
  volunteer: 'Volunteer',
  awards: 'Awards',
  publications: 'Publications',
  interests: 'Interests',
  references: 'References',
};

const FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  summary: 'Summary',
  role: 'Title',
  position: 'Title',
  company: 'Company',
  name: 'Name',
  institution: 'Institution',
  area: 'Field of study',
  studyType: 'Degree',
  startDate: 'Start date',
  endDate: 'End date',
  location: 'Location',
  label: 'Headline',
  email: 'Email',
  phone: 'Phone',
  url: 'Website',
  website: 'Website',
  category: 'Category',
  language: 'Language',
  fluency: 'Fluency',
  level: 'Level',
  keywords: 'Keywords',
};

function stripMarkup(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((entry) => stripMarkup(entry))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['content', 'text', 'value', 'name', 'language', 'category']) {
      if (typeof record[key] === 'string') return stripMarkup(record[key]);
    }
    return '';
  }

  return String(value)
    .replace(/<\/(p|li|ul|ol|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function truncate(value: string): string {
  const text = value.trim();
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return `${text.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

/** `experience[2].description` → `{ key: 'experience', index: 2, field: 'description' }` */
function parsePath(path: string): { key: string; index: number | null; field: string } {
  const match = path.match(/^([A-Za-z_]+)(?:\[(\d+)\])?(?:\.(.+))?$/);
  if (!match) return { key: path, index: null, field: '' };
  return {
    key: match[1],
    index: match[2] !== undefined ? Number(match[2]) : null,
    field: match[3] || '',
  };
}

function recordLabel(record: any): string {
  if (!record || typeof record !== 'object') return '';
  const parts = [
    record.role || record.position || record.studyType || record.name || record.language || record.category,
    record.company || record.institution || record.awarder || record.publisher,
  ].filter((part) => typeof part === 'string' && part.trim());
  return parts.join(' · ');
}

function labelForEntry(cv: any, key: string, index: number | null): string {
  if (index === null) return '';
  const list = Array.isArray(cv?.[key]) ? cv[key] : [];
  const record = list[index];
  const label = recordLabel(record);
  return label || `${SECTION_LABELS[key] || key} entry ${index + 1}`;
}

/**
 * Best available text for a whole record that was added or removed.
 * Falls back to the record's identifying labels when it has no description yet
 * (a freshly-inserted entry usually only carries role + company).
 */
function recordText(record: any): string {
  if (!record || typeof record !== 'object') return stripMarkup(record);
  const description = stripMarkup(
    record.description ?? record.summary ?? record.content ?? record.details ?? ''
  );
  return description || recordLabel(record);
}

function kindFor(before: any, after: any): MoriChangeKind {
  const hasBefore = before !== undefined && before !== null && before !== '';
  const hasAfter = after !== undefined && after !== null && after !== '';
  if (!hasBefore && hasAfter) return 'added';
  if (hasBefore && !hasAfter) return 'removed';
  return 'updated';
}

/**
 * Build the reviewable change list between two CV snapshots.
 *
 * Returns null when nothing meaningful changed, so callers can fall back to a
 * plain conversational reply instead of an empty review card.
 */
export function buildMoriProposal(before: any, after: any): MoriProposal | null {
  if (!before || !after) return null;

  const raw = diffCVData(before, after);
  const changes: MoriProposedChange[] = [];
  const seen = new Set<string>();

  for (const diff of raw) {
    if (!diff.path) continue;
    const { key, index, field } = parsePath(diff.path);

    // Identifiers and bookkeeping are not user-visible edits.
    if (key === 'metadata' || key === 'id' || field.startsWith('id')) continue;

    const section = key === 'basics' && (field === 'summary' || diff.path === 'basics')
      ? (field === 'summary' ? 'Summary' : 'Header')
      : SECTION_LABELS[key] || key;

    const entryLabel = labelForEntry(after, key, index) || labelForEntry(before, key, index);

    // A whole entry appeared or vanished: the diff points at the record itself
    // rather than a field, so summarise it from its own content instead of
    // dropping the change (an added role used to be filtered out here, which
    // made "added a job" look like "nothing changed").
    if (!field && index !== null) {
      const beforeRecord = before?.[key]?.[index];
      const afterRecord = after?.[key]?.[index];
      const recordBefore = truncate(recordText(beforeRecord));
      const recordAfter = truncate(recordText(afterRecord));
      if (!recordBefore && !recordAfter) continue;
      changes.push({
        sectionKey: key,
        section,
        label: entryLabel || section,
        field: '',
        kind: kindFor(beforeRecord, afterRecord),
        before: recordBefore,
        after: recordAfter,
      });
      continue;
    }

    const beforeText = stripMarkup(diff.before);
    const afterText = stripMarkup(diff.after);

    // Description-first diffs already include the whole entry; skip the noisy
    // nested fields that follow inside the same description object.
    if (/description\.\d+\.(content|type)$/.test(field) || /^description\.[\d]/.test(field)) {
      // Collapse nested description blocks into the parent `description` diff.
      const parentKey = `${section}|${entryLabel}|Description`;
      if (seen.has(parentKey)) continue;
      seen.add(parentKey);
      const parentBefore = stripMarkup(before?.[key]?.[index ?? 0]?.description);
      const parentAfter = stripMarkup(after?.[key]?.[index ?? 0]?.description);
      // If the parent description was already reported, skip.
      const alreadyReported = changes.some(
        (change) => change.section === section && change.label === entryLabel && change.field === 'Description'
      );
      if (alreadyReported) continue;
      changes.push({
        sectionKey: key,
        section,
        label: entryLabel,
        field: 'Description',
        kind: kindFor(parentBefore, parentAfter),
        before: truncate(parentBefore),
        after: truncate(parentAfter),
      });
      continue;
    }

    const fieldLabel = FIELD_LABELS[field] || (field ? field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) : '');
    const dedupeKey = `${section}|${entryLabel}|${fieldLabel}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (!beforeText && !afterText) continue;

    changes.push({
      sectionKey: key,
      section,
      label: entryLabel,
      field: fieldLabel,
      kind: kindFor(diff.before, diff.after),
      before: truncate(beforeText),
      after: truncate(afterText),
    });
  }

  if (changes.length === 0) return null;

  // Long entries (whole-section rewrites) produce one diff per field plus one
  // per nested description block; keep the review scannable.
  const ordered = changes.sort((a, b) => {
    if (a.section === b.section) return a.label.localeCompare(b.label);
    return a.section.localeCompare(b.section);
  });

  return {
    changes: ordered.slice(0, MAX_VISIBLE_CHANGES),
    hiddenCount: Math.max(0, ordered.length - MAX_VISIBLE_CHANGES),
  };
}
