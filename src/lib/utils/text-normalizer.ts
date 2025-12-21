/**
 * Text Normalizer
 * Handles edge cases for text processing:
 * - Strip HTML/rich text formatting
 * - Normalize encoding (handle weird characters)
 * - Remove URLs from keyword matching
 * - Detect language mismatches
 * - Handle special characters (C++, C#, .NET)
 */

/**
 * Strip HTML tags and decode HTML entities
 */
export function stripHTML(text: string): string {
  if (!text) return '';
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  const decoded = textarea.value;
  
  // Remove HTML tags
  return decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize text encoding
 * Handles weird characters and encoding issues
 */
export function normalizeEncoding(text: string): string {
  if (!text) return '';
  
  // Replace common encoding issues
  return text
    .replace(/[\u201C\u201D]/g, '"')  // Smart quotes
    .replace(/[\u2018\u2019]/g, "'")   // Smart apostrophes
    .replace(/\u2013/g, '-')           // En dash
    .replace(/\u2014/g, '--')          // Em dash
    .replace(/\u2026/g, '...')         // Ellipsis
    .replace(/\u00A0/g, ' ')           // Non-breaking space
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
}

/**
 * Remove URLs from text
 * Returns text with URLs replaced by spaces
 */
export function removeURLs(text: string): string {
  if (!text) return '';
  
  // Match URLs (http, https, www, email)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  return text.replace(urlRegex, ' ');
}

/**
 * Check if a position in text is inside a URL
 */
export function isInURL(text: string, position: number): boolean {
  if (!text || position < 0 || position >= text.length) return false;
  
  // Find URLs in text
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    if (position >= match.index && position < match.index + match[0].length) {
      return true;
    }
  }
  
  return false;
}

/**
 * Basic language detection
 * Returns language code or 'unknown'
 */
export function detectLanguage(text: string): string {
  if (!text || text.length < 10) return 'unknown';
  
  // Simple heuristic: check for common non-English characters
  const nonEnglishRegex = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i;
  if (nonEnglishRegex.test(text)) {
    // Could be French, Spanish, German, etc.
    // For now, return 'non-english'
    return 'non-english';
  }
  
  // Check for Cyrillic
  const cyrillicRegex = /[а-яё]/i;
  if (cyrillicRegex.test(text)) {
    return 'cyrillic';
  }
  
  // Check for Chinese/Japanese/Korean
  const cjkRegex = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
  if (cjkRegex.test(text)) {
    return 'cjk';
  }
  
  // Default to English
  return 'en';
}

/**
 * Escape special regex characters
 * Handles C++, C#, .NET, etc.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text for keyword matching
 * Combines all normalization steps
 */
export function normalizeTextForMatching(text: string, options: {
  stripHTML?: boolean;
  removeURLs?: boolean;
  normalizeEncoding?: boolean;
} = {}): string {
  let normalized = text;
  
  if (options.stripHTML !== false) {
    normalized = stripHTML(normalized);
  }
  
  if (options.normalizeEncoding !== false) {
    normalized = normalizeEncoding(normalized);
  }
  
  if (options.removeURLs !== false) {
    normalized = removeURLs(normalized);
  }
  
  // Final cleanup
  return normalized
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize text input
 * Removes potentially harmful or problematic characters
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\uFEFF/g, '')           // Remove BOM
    .trim();
}

