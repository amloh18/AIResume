/**
 * Formatting utilities for WYSIWYG rich text editing
 */

export const timeAgo = (date?: Date | string): string => {
  if (!date) return 'Recently';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'a day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(date).toLocaleDateString();
};

/**
 * Fix formatting of messy text by converting it to clean bullet points.
 * - Removes excessive whitespace
 * - Converts lines starting with -, *, • to proper bullets
 * - Converts newline-separated content to bullets
 * - Trims and cleans up each line
 */
export function fixFormattingToBullets(html: string): string {
    if (!html || !html.trim()) return '';

    // Step 1: Convert HTML to plain text while preserving line breaks
    const text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '') // Remove all other HTML tags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');

    // Step 2: Split by newlines and clean each line
    const lines = text.split(/\n+/).map(line => {
        // Remove leading bullet characters (-, *, •, ●, ○) and whitespace
        return line
            .replace(/^[\s]*[-*•●○]\s*/, '')
            .replace(/^\s+/, '')
            .replace(/\s+$/, '')
            .replace(/\s+/g, ' '); // Normalize internal whitespace
    }).filter(line => line.length > 0);

    if (lines.length === 0) return '';

    // Step 3: If only one line or no natural breaks, return as paragraph
    if (lines.length === 1) {
        return `<p>${lines[0]}</p>`;
    }

    // Step 4: Create bullet list
    const listItems = lines.map(line => `<li style="margin: 0.25rem 0;">${line}</li>`).join('');
    return `<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">${listItems}</ul>`;
}

/**
 * Decode HTML entities (e.g. &lt;h2&gt; -> <h2>, &#39; -> ', &nbsp; -> space)
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  let decoded = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');

  // If there are still HTML entities and running in browser, do secondary unescape
  if (/&[a-z0-9#]+;/i.test(decoded) && typeof window !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = decoded;
      decoded = textarea.value;
    } catch {
      // ignore
    }
  }
  return decoded;
}

/**
 * Tags the rich-text renderer is willing to emit.
 *
 * This HTML comes from job boards and ATS feeds — untrusted external content —
 * and is injected with `dangerouslySetInnerHTML`, so the sanitiser is an
 * allowlist rather than a blocklist. Anything not listed here is removed with
 * its own tag but its text survives, which is what keeps a malformed employer
 * description readable instead of blank.
 */
const RICH_TEXT_ALLOWED_TAGS = new Set([
    'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'a',
]);

const RICH_TEXT_VOID_TAGS = new Set(['br', 'hr']);

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Rewrite every tag through the allowlist, dropping all attributes except a
 * safe `href` on links (see the security note on `renderRichText`).
 */
function sanitizeRichTextHtml(html: string): string {
    return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, (match, rawTag: string, rawAttrs: string) => {
        const tag = rawTag.toLowerCase();
        if (!RICH_TEXT_ALLOWED_TAGS.has(tag)) return '';
        if (match.startsWith('</')) return `</${tag}>`;
        if (RICH_TEXT_VOID_TAGS.has(tag)) return `<${tag} />`;

        if (tag === 'a') {
            const hrefMatch = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(rawAttrs);
            const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '').trim();
            // Only absolute http(s) and mailto links; `javascript:`, `data:` and
            // protocol-relative urls are dropped (the anchor stays, inert).
            if (!/^(https?:|mailto:)/i.test(href)) return '<a>';
            return `<a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
        }

        return `<${tag}>`;
    });
}

/**
 * Sanitize and render rich text HTML for safe display.
 * Supports headings, paragraphs, lists, and safe typography formatting.
 *
 * ⚠️ The input is untrusted (job descriptions are scraped from third-party
 * sites). The output is injected with `dangerouslySetInnerHTML`, so every tag
 * and attribute is filtered against an allowlist; never loosen this to a
 * regex blocklist — `<img src=x onerror=alert(1)>` and `<svg onload=…>` both
 * survive the usual script/`javascript:` patterns.
 */
export function renderRichText(raw: string): string {
    if (!raw || !raw.trim()) return '';

    const html = decodeHtmlEntities(raw);

    // If it's plain text (no HTML tags), convert newlines to <br>
    if (!/<[a-z][\s\S]*>/i.test(html)) {
        return html.replace(/\n/g, '<br>');
    }

    // Remove entire elements that can never be made safe.
    const stripped = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed[^>]*>/gi, '');

    return sanitizeRichTextHtml(stripped);
}

/**
 * Extract plain text from HTML while preserving bullet structure
 * Used for ATS/recruiter view where you want text but with bullet markers
 */
export function htmlToPlainTextWithBullets(html: string): string {
    if (!html || !html.trim()) return '';

    return html
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
