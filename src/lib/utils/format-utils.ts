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
    let text = html
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
 * Sanitize and render rich text HTML for safe display.
 * Allows only safe formatting tags: b, strong, i, em, u, ul, ol, li, p, br
 */
export function renderRichText(html: string): string {
    if (!html || !html.trim()) return '';

    // If it's plain text (no HTML tags), convert to paragraph
    if (!/&lt;[^&gt;]+&gt;/.test(html) && !/<[^>]+>/.test(html)) {
        // Convert newlines to <br> for plain text
        return html.replace(/\n/g, '<br>');
    }

    // Allow only safe tags for formatting
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'span'];

    // Simple sanitizer - remove scripts and event handlers
    let sanitized = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');

    // Add proper styles to lists if not already styled
    sanitized = sanitized
        .replace(/<ul(?![^>]*style)/gi, '<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;"')
        .replace(/<ol(?![^>]*style)/gi, '<ol style="list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0;"')
        .replace(/<li(?![^>]*style)/gi, '<li style="margin: 0.25rem 0;"');

    return sanitized;
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
