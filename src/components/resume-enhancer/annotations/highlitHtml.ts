import type { FixAnnotation } from './fix-annotation';

interface HighlightSpan {
  start: number;
  end: number;
  fixId: string;
  severity: string;
  category: string;
}

/**
 * Renders text with inline highlight spans for open FixAnnotations.
 * When a field is being edited (isFocused=true), returns plain escaped text to
 * avoid interfering with contentEditable behavior.
 *
 * NOTE: This assumes `text` is plain text (no HTML). If the field contains HTML
 * from rich-text editing, the match positions refer to the plain-text version.
 */
export function getHighlitHTML(
  text: string,
  annotations: FixAnnotation[],
  isFocused: boolean
): string {
  if (!text || isFocused) return escapeForHTML(text);

  const openFixes = annotations.filter(f => f.status === 'open');
  if (openFixes.length === 0) return escapeForHTML(text);

  // Build spans from annotations with exact match positions
  const spans: HighlightSpan[] = [];
  for (const fix of openFixes) {
    if (fix.match.start != null && fix.match.end != null && fix.match.start >= 0 && fix.match.end <= text.length) {
      spans.push({
        start: fix.match.start,
        end: fix.match.end,
        fixId: fix.id,
        severity: fix.severity,
        category: fix.category,
      });
    }
  }

  // Sort by start position
  spans.sort((a, b) => a.start - b.start);

  // Remove overlapping spans (keep first/highest priority)
  const filtered: HighlightSpan[] = [];
  let lastEnd = -1;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      filtered.push(span);
      lastEnd = span.end;
    }
  }

  if (filtered.length === 0) {
    // No exact-position annotations — check for field-level
    const fieldLevel = openFixes.find(f => f.match.start == null || f.match.end == null);
    if (fieldLevel) {
      const cls = getSeverityClass(fieldLevel.severity, fieldLevel.category);
      return `<span class="cv-highlight ${cls}" data-fix-id="${fieldLevel.id}" data-fix-severity="${fieldLevel.severity}">${escapeForHTML(text)}</span>`;
    }
    return escapeForHTML(text);
  }

  // Build the highlighted HTML
  let html = '';
  let cursor = 0;

  for (const span of filtered) {
    // Text before this highlight
    if (span.start > cursor) {
      html += escapeForHTML(text.slice(cursor, span.start));
    }
    // Highlighted text
    const cls = getSeverityClass(span.severity, span.category);
    const chunk = escapeForHTML(text.slice(span.start, span.end));
    html += `<span class="cv-highlight ${cls}" data-fix-id="${span.fixId}" data-fix-severity="${span.severity}">${chunk}</span>`;
    cursor = span.end;
  }

  // Remaining text after last highlight
  if (cursor < text.length) {
    html += escapeForHTML(text.slice(cursor));
  }

  return html;
}

function getSeverityClass(severity: string, category: string): string {
  const isKeywordFound = category === 'keywords' && severity === 'low';
  if (isKeywordFound) return 'cv-highlight--info';
  switch (severity) {
    case 'high': return 'cv-highlight--critical';
    case 'medium': return 'cv-highlight--warning';
    default: return 'cv-highlight--info';
  }
}

/**
 * Escape only the characters that break HTML parsing (<, >, &).
 * Preserves the string as displayable text.
 */
function escapeForHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
