/**
 * Text Normalization Service
 * 
 * Comprehensive text normalization for ATS compatibility
 * Handles Unicode, dates, headers, titles, keywords, and more
 */

import { 
  SECTION_SYNONYMS, 
  getStandardSectionName,
  SEASON_TO_MONTH,
  TITLE_ABBREVIATIONS,
  expandTitleAbbreviation,
  PRESENT_SYNONYMS,
  isPresentDate
} from '@/lib/data/sectionSynonyms';

export interface NormalizedDate {
  valid: boolean;
  normalized?: Date;
  original: string;
  error?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export class TextNormalizationService {
  /**
   * Normalize text - comprehensive cleaning
   */
  static normalizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let normalized = text;

    // 1. Unicode normalization (NFKD) to handle ligatures (ﬃ → ffi)
    normalized = normalized.normalize('NFKD');

    // 2. Remove zero-width spaces and BOM markers
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 3. Remove BOM at start
    if (normalized.charCodeAt(0) === 0xFEFF) {
      normalized = normalized.slice(1);
    }

    // 4. Normalize bullets: •, -, ➢, * → standard line breaks
    normalized = normalized.replace(/^[\s]*[•◦‣➢\-\*]\s*/gm, '\n');

    // 5. Normalize whitespace
    normalized = normalized.replace(/[ \t]+/g, ' ');
    normalized = normalized.replace(/[ \t]*\n[ \t]*/g, '\n');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // 6. Remove special characters that might affect parsing (keep basic punctuation)
    normalized = normalized.replace(/[^\w\s.,;:!?()\-'"/\n\u00A0-\uFFFF]/g, ' ');

    // 7. Trim each line and remove empty lines
    normalized = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return normalized.trim();
  }

  /**
   * Normalize email - handle obfuscation
   */
  static normalizeEmail(email: string): string {
    if (!email) return '';

    // Handle common obfuscation patterns
    let normalized = email
      .replace(/\s*\[at\]\s*/gi, '@')
      .replace(/\s*\(at\)\s*/gi, '@')
      .replace(/\s*at\s*/gi, '@')
      .replace(/\s*\[dot\]\s*/gi, '.')
      .replace(/\s*\(dot\)\s*/gi, '.')
      .replace(/\s*dot\s*/gi, '.');

    // Clean up
    normalized = normalized.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(normalized)) {
      return normalized;
    }

    return email; // Return original if normalization fails
  }

  /**
   * Normalize phone number - extract from text with icons
   */
  static normalizePhone(phone: string): string {
    if (!phone) return '';

    // Remove common phone icons and labels
    let normalized = phone
      .replace(/[📞📱☎️]/g, '')
      .replace(/phone[:]?\s*/gi, '')
      .replace(/tel[:]?\s*/gi, '')
      .replace(/mobile[:]?\s*/gi, '');

    // Extract phone pattern (supports various formats)
    const phoneRegex = /[\+]?[\d\s\-\(\)]{10,}/;
    const match = normalized.match(phoneRegex);
    
    if (match) {
      // Clean up: remove spaces, dashes, parentheses
      return match[0].replace(/[\s\-\(\)]/g, '');
    }

    return phone.trim();
  }

  /**
   * Normalize date string to Date object
   */
  static normalizeDate(dateStr: string): NormalizedDate {
    if (!dateStr || dateStr.trim().length === 0) {
      return { valid: false, original: dateStr, error: 'Empty date string' };
    }

    const original = dateStr.trim();

    // Check if it's "Present" or equivalent
    if (isPresentDate(original)) {
      return { valid: true, normalized: new Date(), original };
    }

    // Handle seasonal dates: "Spring 2020" → "March 2020"
    const seasonMatch = original.match(/^(Spring|Summer|Fall|Autumn|Winter)\s+(\d{4})$/i);
    if (seasonMatch) {
      const season = seasonMatch[1].charAt(0).toUpperCase() + seasonMatch[1].slice(1).toLowerCase();
      const year = parseInt(seasonMatch[2]);
      const month = SEASON_TO_MONTH[season];
      
      if (month && year >= 1900 && year <= 2100) {
        return { valid: true, normalized: new Date(year, month - 1, 1), original };
      }
    }

    // Handle MM/YYYY format
    const mmYyyyMatch = original.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyyMatch) {
      const month = parseInt(mmYyyyMatch[1]) - 1;
      const year = parseInt(mmYyyyMatch[2]);
      if (month >= 0 && month < 12 && year >= 1900 && year <= 2100) {
        return { valid: true, normalized: new Date(year, month, 1), original };
      }
    }

    // Handle Month Year format: "March 2020", "Jan 2021"
    const monthYearMatch = original.match(/^(\w+)\s+(\d{4})$/i);
    if (monthYearMatch) {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthName = monthYearMatch[1].toLowerCase();
      const monthIndex = monthNames.findIndex(m => m.startsWith(monthName));
      const year = parseInt(monthYearMatch[2]);
      
      if (monthIndex >= 0 && year >= 1900 && year <= 2100) {
        return { valid: true, normalized: new Date(year, monthIndex, 1), original };
      }
    }

    // Handle YYYY format
    const yearMatch = original.match(/^(\d{4})$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 1900 && year <= 2100) {
        return { valid: true, normalized: new Date(year, 0, 1), original };
      }
    }

    // Handle DD/MM/YYYY or MM/DD/YYYY (locale ambiguity)
    const dateMatch = original.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const part1 = parseInt(dateMatch[1]);
      const part2 = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      
      if (year >= 1900 && year <= 2100) {
        // Heuristic: If part1 > 12, it's DD/MM/YYYY
        if (part1 > 12 && part2 <= 12) {
          return { valid: true, normalized: new Date(year, part2 - 1, part1), original };
        }
        // Otherwise assume MM/DD/YYYY
        if (part1 <= 12 && part2 <= 31) {
          return { valid: true, normalized: new Date(year, part1 - 1, part2), original };
        }
      }
    }

    // Handle YYYY-MM (ISO format without day)
    const yyyyMmMatch = original.match(/^(\d{4})-(\d{1,2})$/);
    if (yyyyMmMatch) {
      const year = parseInt(yyyyMmMatch[1]);
      const month = parseInt(yyyyMmMatch[2]) - 1;
      if (year >= 1900 && year <= 2100 && month >= 0 && month < 12) {
        return { valid: true, normalized: new Date(year, month, 1), original };
      }
    }

    // Handle YYYY-MM-DD (ISO format)
    const isoMatch = original.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);
      if (year >= 1900 && year <= 2100 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
        return { valid: true, normalized: new Date(year, month, day), original };
      }
    }

    return { valid: false, original, error: 'Unrecognized date format' };
  }

  /**
   * Normalize section header name
   */
  static normalizeSectionHeader(headerName: string): string {
    if (!headerName) return '';
    
    const standard = getStandardSectionName(headerName);
    return standard || headerName;
  }

  /**
   * Normalize job title
   */
  static normalizeJobTitle(title: string): string {
    if (!title) return '';
    return expandTitleAbbreviation(title);
  }

  /**
   * Normalize keyword for matching (handles hyphenation, case, etc.)
   */
  static normalizeKeyword(keyword: string): string {
    if (!keyword) return '';

    // Remove hyphens and spaces for matching: "E-commerce" = "Ecommerce"
    return keyword
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Check if keyword matches with normalization
   */
  static keywordMatches(keyword1: string, keyword2: string): boolean {
    const norm1 = this.normalizeKeyword(keyword1);
    const norm2 = this.normalizeKeyword(keyword2);
    
    return norm1 === norm2 || 
           norm1.includes(norm2) || 
           norm2.includes(norm1);
  }

  /**
   * Merge overlapping date ranges
   */
  static mergeDateRanges(ranges: DateRange[]): DateRange[] {
    if (ranges.length === 0) return [];

    // Sort by start date
    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: DateRange[] = [];

    for (const range of sorted) {
      if (merged.length === 0) {
        merged.push(range);
        continue;
      }

      const last = merged[merged.length - 1];
      
      // Check if ranges overlap or are adjacent
      if (range.start <= last.end) {
        // Merge: extend end date if needed
        last.end = range.end > last.end ? range.end : last.end;
      } else {
        // No overlap, add as new range
        merged.push(range);
      }
    }

    return merged;
  }

  /**
   * Calculate total months from date ranges (with overlap merging)
   */
  static calculateTotalMonths(ranges: DateRange[]): number {
    const merged = this.mergeDateRanges(ranges);
    
    let totalMonths = 0;
    for (const range of merged) {
      const months = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months > 0) {
        totalMonths += months;
      }
    }

    return totalMonths;
  }

  /**
   * Detect employment gaps (returns gaps > threshold months)
   */
  static detectGaps(ranges: DateRange[], thresholdMonths: number = 6): Array<{ start: Date; end: Date; months: number }> {
    if (ranges.length < 2) return [];

    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    const gaps: Array<{ start: Date; end: Date; months: number }> = [];

    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].end;
      const currStart = sorted[i].start;
      
      if (currStart > prevEnd) {
        const gapMonths = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (gapMonths > thresholdMonths) {
          gaps.push({
            start: prevEnd,
            end: currStart,
            months: gapMonths
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Apply stemming-like normalization (basic word root matching)
   */
  static getWordRoot(word: string): string {
    if (!word) return '';

    const lower = word.toLowerCase();
    
    // Basic stemming rules
    if (lower.endsWith('ing')) return lower.slice(0, -3);
    if (lower.endsWith('ed')) return lower.slice(0, -2);
    if (lower.endsWith('er')) return lower.slice(0, -2);
    if (lower.endsWith('est')) return lower.slice(0, -3);
    if (lower.endsWith('ly')) return lower.slice(0, -2);
    if (lower.endsWith('tion')) return lower.slice(0, -4);
    if (lower.endsWith('sion')) return lower.slice(0, -4);
    if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);
    
    return lower;
  }

  /**
   * Check if words match with stemming
   */
  static wordsMatchWithStemming(word1: string, word2: string): boolean {
    const root1 = this.getWordRoot(word1);
    const root2 = this.getWordRoot(word2);
    
    return root1 === root2 || 
           root1.startsWith(root2) || 
           root2.startsWith(root1);
  }

  /**
   * Remove hidden/white text (basic detection)
   * Note: Full detection requires PDF analysis
   */
  static detectHiddenText(text: string): boolean {
    // This is a basic check - full implementation would analyze PDF color values
    // Check for common patterns that might indicate hidden text
    const suspiciousPatterns = [
      /color:\s*white/gi,
      /color:\s*#fff/gi,
      /color:\s*#ffffff/gi,
      /opacity:\s*0/gi,
      /visibility:\s*hidden/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract contact info from text (handles icons, obfuscation)
   */
  static extractContactInfo(text: string): {
    emails: string[];
    phones: string[];
  } {
    const emails: string[] = [];
    const phones: string[] = [];

    // Email patterns (handles obfuscation)
    const emailPatterns = [
      /[\w.]+@[\w.]+\.\w+/g, // Standard
      /[\w.]+\[at\][\w.]+\[dot\]\w+/gi, // Obfuscated
      /[\w.]+\(at\)[\w.]+\(dot\)\w+/gi // Obfuscated
    ];

    for (const pattern of emailPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        emails.push(...matches.map(e => this.normalizeEmail(e)));
      }
    }

    // Phone patterns (handles various formats)
    const phonePatterns = [
      /\+?[\d\s\-\(\)]{10,}/g, // Standard formats
      /\+1[\s\-]?[\d\s\-\(\)]{10,}/g // US format
    ];

    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        phones.push(...matches.map(p => this.normalizePhone(p)));
      }
    }

    return {
      emails: [...new Set(emails)],
      phones: [...new Set(phones)]
    };
  }
}

