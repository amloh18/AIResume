/**
 * Combined entry descriptions — ONE model for paragraphs and bullets.
 *
 * A work/project/volunteer entry has a single description made of ordered
 * blocks. Each block is either a paragraph or a bullet, and the ORDER is
 * meaningful: the product convention is "bullets first, optionally followed by
 * a single short lead/outro line" (and sometime bullets only).
 *
 * Three representations exist in the codebase and all three must stay in sync:
 *
 *  1. Canvas HTML            `experience[0].description`
 *     What the editor edits: `<p>…</p><ul><li>…</li></ul>`, order preserved.
 *  2. Ordered blocks         `work[0].descriptions[]`
 *     Canonical AI-facing shape: `{ id, type: 'paragraph'|'bullet', content }`.
 *  3. Legacy fields          `summary` (paragraph) + `highlights[]` (bullets)
 *     Still read by ATS/tailoring/export code. LOSSY: it cannot express order.
 *
 * Reconciliation rule (self-healing, no schema change):
 *  - a record's `descriptions` is trusted (order preserved) when it carries the
 *    same content as the legacy view — they agree;
 *  - when they disagree, the legacy fields win, because external writers (the
 *    CV Surgeon, tailoring, any patch) edit `summary`/`highlights` directly and
 *    a stale `descriptions` must never hide their change;
 *  - a record with blocks but no legacy content at all keeps its blocks (an
 *    AI-only write must not be wiped by an empty legacy view).
 *
 * Writers that intend to preserve mixed order (the canvas editor and the Mori
 * merge) call `materializeRecordDescriptionViews`, which updates all three
 * views at once so the next reconcile sees them in agreement.
 */

import { generateCVId, type DescriptionBlock } from '@/types/cv-edit-ops';

/** Inline tags worth keeping inside a description block. */
const INLINE_KEEP = new Set([
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'a', 'code', 'small', 'sub', 'sup',
]);

/** Tags whose END is a hard paragraph boundary (mirrors extractSummaryFromHtml). */
const PARAGRAPH_BREAK_RE = /<\/(?:p|h[1-6]|blockquote|pre|section|article|header|footer)\s*>/gi;
/** Tags whose END is a soft line break inside the current paragraph. */
const SOFT_BREAK_RE = /<br\s*\/?>|<\/div\s*>/gi;
const LIST_RE = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
const LIST_ITEM_RE = /<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi;

const TAG_RE = /<[^>]*>/g;

const stripDescriptionTags = (value: string): string =>
  (value || '').replace(TAG_RE, '');

const normalizeForCompare = (value: string): string =>
  stripDescriptionTags(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Keep only inline formatting inside a block: unwrap unknown tags, drop
 * presentational wrapper tags and inline styles, preserve `href` on links.
 * Entities and plain text are untouched, so values like "GPA < 3.5" survive.
 */
const sanitizeInline = (html: string): string =>
  (html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?mark\b[^>]*>/gi, '')
    .replace(/<\/?span\b[^>]*>/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^>]*)?)>/g, (_full, slash: string, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!INLINE_KEEP.has(name)) return '';
      if (slash) return `</${name}>`;
      const href = name === 'a' ? (attrs || '').match(/\shref\s*=\s*("[^"]*"|'[^']*')/i)?.[0] || '' : '';
      return `<${name}${href}>`;
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const isMeaningful = (content: string): boolean =>
  normalizeForCompare(content).length > 0;

const paragraph = (content: string, id?: string): DescriptionBlock => ({
  id: id || generateCVId(),
  type: 'paragraph',
  content,
});

const bullet = (content: string, id?: string): DescriptionBlock => ({
  id: id || generateCVId(),
  type: 'bullet',
  content,
});

/**
 * Parse canvas description HTML into ordered blocks.
 *
 * `<ul>/<ol>` becomes bullet blocks; everything else is split into paragraph
 * blocks at hard boundaries only. `<br>` and `</div>` stay soft breaks inside
 * one paragraph — the same line semantics the legacy
 * `extractSummaryFromHtml`/`buildRichTextDescription` pair had, so existing
 * documents render identically.
 */
export const parseDescriptionHtml = (html: string): DescriptionBlock[] => {
  if (!html || typeof html !== 'string') return [];

  const blocks: DescriptionBlock[] = [];
  const segments: Array<{ kind: 'text' | 'list'; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LIST_RE.lastIndex = 0;
  while ((match = LIST_RE.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: html.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'list', value: match[2] || '' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) {
    segments.push({ kind: 'text', value: html.slice(lastIndex) });
  }

  for (const segment of segments) {
    if (segment.kind === 'list') {
      LIST_ITEM_RE.lastIndex = 0;
      let item: RegExpExecArray | null;
      while ((item = LIST_ITEM_RE.exec(segment.value)) !== null) {
        const content = sanitizeInline(item[1]);
        if (isMeaningful(content)) blocks.push(bullet(content));
      }
      continue;
    }

    const paragraphs = segment.value.split(PARAGRAPH_BREAK_RE);
    for (const rawParagraph of paragraphs) {
      const content = sanitizeInline(rawParagraph.replace(SOFT_BREAK_RE, '\n'));
      if (isMeaningful(content)) blocks.push(paragraph(content));
    }
  }

  return blocks;
};

/** Render ordered blocks back to canvas HTML (consecutive bullets share a list). */
export const descriptionBlocksToHtml = (blocks: DescriptionBlock[]): string => {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';

  const parts: string[] = [];
  let bullets: string[] = [];
  let bulletIndex = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    parts.push(`<ul>${bullets.join('')}</ul>`);
    bullets = [];
  };

  for (const block of blocks) {
    if (!block || !isMeaningful(block.content || '')) continue;
    if (block.type === 'bullet') {
      bullets.push(`<li data-highlight-index="${bulletIndex}">${block.content}</li>`);
      bulletIndex += 1;
      continue;
    }
    flushBullets();
    parts.push(`<p>${block.content.replace(/\r\n?|\n/g, '<br>')}</p>`);
  }
  flushBullets();

  return parts.join('');
};

/** Derive the lossy legacy view (`summary`/`description` + `highlights`). */
export const descriptionBlocksToLegacy = (
  blocks: DescriptionBlock[],
  paragraphField: 'summary' | 'description'
): { summary?: string; description?: string; highlights: string[] } => {
  const paragraphs: string[] = [];
  const highlights: string[] = [];

  for (const block of blocks) {
    if (!block || !isMeaningful(block.content || '')) continue;
    if (block.type === 'bullet') {
      highlights.push(block.content);
    } else {
      paragraphs.push(block.content.replace(/<br\s*\/?>/gi, '\n'));
    }
  }

  const text = paragraphs.join('\n\n');
  return paragraphField === 'description'
    ? { description: text, highlights }
    : { summary: text, highlights };
};

const richTextTagPattern = /<\/?(?:p|div|ul|ol|li|br|strong|em|b|i|u|s|strike|small|sub|sup|span|h[1-6]|a|mark|font|label|blockquote|code|pre)(?:\s|\/|>|:)/i;

/** Derive ordered blocks from the legacy fields (paragraph text + highlights). */
export const legacyFieldsToDescriptionBlocks = (
  record: any,
  paragraphField: 'summary' | 'description'
): DescriptionBlock[] => {
  if (!record || typeof record !== 'object') return [];

  const blocks: DescriptionBlock[] = [];
  const seenBullets = new Set<string>();
  const rawParagraph =
    (typeof record[paragraphField] === 'string' && record[paragraphField]) ||
    (typeof record.summary === 'string' && record.summary) ||
    (typeof record.description === 'string' && record.description) ||
    '';

  if (typeof rawParagraph === 'string' && rawParagraph.trim()) {
    if (richTextTagPattern.test(rawParagraph)) {
      // Rich HTML may itself carry bullets; keep them, then merge highlights.
      for (const parsed of parseDescriptionHtml(rawParagraph)) {
        if (parsed.type === 'bullet') {
          const key = normalizeForCompare(parsed.content);
          if (seenBullets.has(key)) continue;
          seenBullets.add(key);
        }
        blocks.push(parsed);
      }
    } else {
      const paragraphs = rawParagraph.split(/\n{2,}/);
      for (const text of paragraphs) {
        const content = sanitizeInline(text.trim().replace(/\r\n?|\n/g, '<br>'));
        if (isMeaningful(content)) blocks.push(paragraph(content));
      }
    }
  }

  if (Array.isArray(record.highlights)) {
    for (const highlight of record.highlights) {
      if (typeof highlight !== 'string') continue;
      const content = sanitizeInline(highlight);
      const key = normalizeForCompare(content);
      if (!isMeaningful(content) || seenBullets.has(key)) continue;
      seenBullets.add(key);
      blocks.push(bullet(content));
    }
  }

  return blocks;
};

/** Do two block lists carry the same content (ignoring order)? */
export const descriptionBlocksMatch = (
  a: DescriptionBlock[],
  b: DescriptionBlock[]
): boolean => {
  if (a.length !== b.length) return false;
  const keys = (blocks: DescriptionBlock[]) =>
    blocks
      .map((block) => `${block.type}:${normalizeForCompare(block.content)}`)
      .sort();
  const left = keys(a);
  const right = keys(b);
  return left.every((key, index) => key === right[index]);
};

const sanitizeBlocks = (blocks: any[]): DescriptionBlock[] => {
  if (!Array.isArray(blocks)) return [];
  const out: DescriptionBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const id = typeof block.id === 'string' && block.id ? block.id : undefined;
    const content = typeof block.content === 'string' ? block.content : '';
    if (!isMeaningful(content)) continue;
    out.push(block.type === 'bullet' ? bullet(content, id) : paragraph(content, id));
  }
  return out;
};

/**
 * Pick the authoritative ordered blocks for a record.
 *
 * `preferExisting` is for writers that JUST edited `descriptions` (the Mori
 * merge) — there the blocks are newer than the legacy fields by definition.
 */
export const reconcileRecordDescription = (
  record: any,
  paragraphField: 'summary' | 'description',
  options: { preferExisting?: boolean } = {}
): DescriptionBlock[] => {
  const existing = sanitizeBlocks(record?.descriptions);
  const legacy = legacyFieldsToDescriptionBlocks(record, paragraphField);

  if (existing.length > 0) {
    if (options.preferExisting) return existing;
    if (legacy.length === 0) return existing;
    if (descriptionBlocksMatch(existing, legacy)) return existing;
  }

  return legacy;
};

/** Positionally reuse ids so an editor keystroke does not churn Mori's addresses. */
const withPreservedIds = (
  blocks: DescriptionBlock[],
  previous: any[]
): DescriptionBlock[] => {
  const previousBlocks = sanitizeBlocks(previous);
  if (previousBlocks.length === 0) return blocks;

  const positional = previousBlocks.length === blocks.length &&
    previousBlocks.every((block, index) => block.type === blocks[index].type);
  if (positional) {
    return blocks.map((block, index) => ({ ...block, id: previousBlocks[index].id }));
  }

  const unused = [...previousBlocks];
  return blocks.map((block) => {
    const key = normalizeForCompare(block.content);
    const matchIndex = unused.findIndex(
      (candidate) => candidate.type === block.type && normalizeForCompare(candidate.content) === key
    );
    if (matchIndex === -1) return block;
    const [matched] = unused.splice(matchIndex, 1);
    return { ...block, id: matched.id };
  });
};

/**
 * Write a known block list plus the legacy fields it derives.
 *
 * Used by writers that already hold the authoritative combined view (the
 * canvas editor just parsed its own HTML, the Mori merge just applied ops) and
 * must not have it second-guessed by the reconcile rule.
 */
export const writeRecordDescriptionBlocks = (
  record: any,
  paragraphField: 'summary' | 'description',
  blocks: DescriptionBlock[],
  previousDescriptions?: any[]
): DescriptionBlock[] => {
  if (!record || typeof record !== 'object') return [];

  const stored = withPreservedIds(blocks, previousDescriptions || []);
  const legacy = descriptionBlocksToLegacy(stored, paragraphField);

  record.descriptions = stored;
  if (paragraphField === 'description') {
    record.description = legacy.description ?? '';
  } else {
    record.summary = legacy.summary ?? '';
  }
  record.highlights = legacy.highlights;

  return stored;
};

/**
 * Write all three views at once: ordered `descriptions` plus the derived legacy
 * fields. Returns the blocks that were stored.
 */
export const materializeRecordDescriptionViews = (
  record: any,
  paragraphField: 'summary' | 'description',
  options: { preferExisting?: boolean; previousDescriptions?: any[] } = {}
): DescriptionBlock[] =>
  writeRecordDescriptionBlocks(
    record,
    paragraphField,
    reconcileRecordDescription(record, paragraphField, options),
    options.previousDescriptions
  );

/** Canonical HTML for a record's combined description (by section key). */
export const descriptionHtmlForRecord = (record: any, sectionKey: string): string => {
  const paragraphField = DESCRIPTION_SECTION_FIELDS[sectionKey];
  if (!paragraphField) return typeof record?.description === 'string' ? record.description : '';
  return descriptionBlocksToHtml(reconcileRecordDescription(record, paragraphField));
};

/** Sections whose entry descriptions use the combined paragraph/bullet model. */
export const DESCRIPTION_SECTION_FIELDS: Record<string, 'summary' | 'description'> = {
  work: 'summary',
  experience: 'summary',
  volunteer: 'summary',
  projects: 'description',
  awards: 'summary',
  publications: 'description',
  certificates: 'description',
  certifications: 'description',
};

/**
 * Materialize the combined description views for every mapped section of a CV.
 * Returns the same object for convenience (it is mutated in place, on a copy the
 * caller already owns).
 */
export const materializeCvDescriptionViews = (
  cvData: any,
  options: { preferExisting?: boolean } = {}
): any => {
  if (!cvData || typeof cvData !== 'object') return cvData;

  for (const [sectionKey, paragraphField] of Object.entries(DESCRIPTION_SECTION_FIELDS)) {
    const section = cvData[sectionKey];
    if (!Array.isArray(section)) continue;
    cvData[sectionKey] = section.map((record: any) => {
      if (!record || typeof record !== 'object') return record;
      const next = { ...record };
      materializeRecordDescriptionViews(next, paragraphField, options);
      return next;
    });
  }

  return cvData;
};
