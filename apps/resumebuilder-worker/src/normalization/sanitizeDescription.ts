export interface DescriptionSanitizeResult {
  sanitizedHtml: string;
  descriptionText: string;
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
]);

export function sanitizeDescription(rawHtmlOrText?: string): DescriptionSanitizeResult {
  if (!rawHtmlOrText) {
    return { sanitizedHtml: '', descriptionText: '' };
  }

  let html = rawHtmlOrText;

  // 1. Strip dangerous tags entirely along with their inner content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // 2. Strip disallowed tags while preserving content
  const sanitizedHtml = html.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    // If anchor tag, preserve href safely
    if (lowerTag === 'a') {
      const hrefMatch = attrs.match(/href=["'](https?:\/\/[^"']+)["']/i);
      if (hrefMatch) {
        return `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">`;
      }
      return '<a>';
    }

    // Close tag
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    return `<${lowerTag}>`;
  });

  // 3. Extract pure plaintext
  const descriptionText = html
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return {
    sanitizedHtml,
    descriptionText,
  };
}
