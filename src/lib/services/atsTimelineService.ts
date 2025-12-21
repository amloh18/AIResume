import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ParserType } from '@/contexts/ATSDeepDiveContext';

export interface TimelineEntry {
  title: string;
  company?: string;
  startDate: string;
  endDate: string | null;
  duration: number; // in months
  overlappingWith: number[]; // indices of overlapping entries
  isCurrent: boolean;
  isAmbiguous: boolean; // e.g., "Summer 2022"
  isFuture: boolean; // Future date (typo detection)
}

export interface TimelineGap {
  startDate: string;
  endDate: string;
  days: number;
  startIndex: number;
  endIndex: number;
  isCritical: boolean; // > 30 days
}

export interface TimelineData {
  entries: TimelineEntry[];
  gaps: TimelineGap[];
  totalYears: number;
  sortOrder: 'newest-first' | 'oldest-first';
}

export class ATSTimelineService {
  /**
   * Calculate timeline from CV work experience
   * Handles Cases 1-12: Overlapping jobs, ambiguous dates, gaps, etc.
   */
  static calculateTimeline(
    cvData: UnifiedCVDataStructure,
    parserType: ParserType
  ): TimelineData {
    if (!cvData.work || cvData.work.length === 0) {
      return { entries: [], gaps: [], totalYears: 0, sortOrder: 'newest-first' };
    }

    // Parse work entries
    const entries: TimelineEntry[] = cvData.work.map((work, idx) => {
      const startDate = work.startDate || '';
      const endDate = work.endDate || null;
      const position = work.position || work.title || work.jobTitle || 'Position';
      const company = work.name || work.company || work.companyName || '';

      // Detect ambiguous dates (Case #2, #9)
      const isAmbiguous = this.isAmbiguousDate(startDate) || this.isAmbiguousDate(endDate || '');

      // Detect future dates (Case #12)
      const isFuture = endDate ? this.isFutureDate(endDate) : false;

      // Calculate duration
      const duration = this.calculateDuration(startDate, endDate);

      // Detect if current (Case #4)
      const isCurrent = !endDate || endDate.toLowerCase() === 'present' || endDate.toLowerCase() === 'current';

      return {
        title: position,
        company,
        startDate,
        endDate: isCurrent ? null : endDate,
        duration,
        overlappingWith: [],
        isCurrent,
        isAmbiguous,
        isFuture,
      };
    });

    // Detect overlapping jobs (Case #1)
    this.detectOverlaps(entries);

    // Detect gaps (Case #3, #11)
    const gaps = this.detectGaps(entries);

    // Calculate total years
    const totalYears = this.calculateTotalYears(entries);

    // Detect sort order (Case #7)
    const sortOrder = this.detectSortOrder(entries);

    return {
      entries,
      gaps,
      totalYears,
      sortOrder,
    };
  }

  /**
   * Check if date is ambiguous (e.g., "Summer 2022", "2019-2021")
   */
  private static isAmbiguousDate(date: string): boolean {
    if (!date) return false;

    const lower = date.toLowerCase();
    // Check for seasons
    if (lower.includes('summer') || lower.includes('winter') || lower.includes('spring') || lower.includes('fall') || lower.includes('autumn')) {
      return true;
    }

    // Check for year-only ranges (no months)
    if (/^\d{4}-\d{4}$/.test(date.trim())) {
      return true;
    }

    return false;
  }

  /**
   * Check if date is in the future (typo detection)
   */
  private static isFutureDate(date: string): boolean {
    if (!date) return false;

    try {
      const parsed = this.parseDate(date);
      if (!parsed) return false;
      return parsed > new Date();
    } catch {
      return false;
    }
  }

  /**
   * Calculate duration in months between two dates
   */
  private static calculateDuration(startDate: string, endDate: string | null): number {
    const start = this.parseDate(startDate);
    if (!start) return 0;

    const end = endDate ? this.parseDate(endDate) : new Date();
    if (!end) return 0;

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  }

  /**
   * Parse date string to Date object
   * Handles various formats: "2020-01", "Jan 2020", "January 2020", "2020"
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const normalized = dateStr.trim();

    // Try ISO format first (YYYY-MM)
    const isoMatch = normalized.match(/^(\d{4})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, 1);
    }

    // Try "Month YYYY" format
    const monthYearMatch = normalized.match(/^(\w+)\s+(\d{4})$/);
    if (monthYearMatch) {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
      ];
      const monthStr = monthYearMatch[1].toLowerCase();
      const year = parseInt(monthYearMatch[2]);
      const monthIndex = monthNames.indexOf(monthStr);
      if (monthIndex !== -1) {
        const actualMonth = monthIndex >= 12 ? monthIndex - 12 : monthIndex;
        return new Date(year, actualMonth, 1);
      }
    }

    // Try year only
    const yearMatch = normalized.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1]), 0, 1);
    }

    // Fallback to Date constructor
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  /**
   * Detect overlapping jobs (Case #1)
   */
  private static detectOverlaps(entries: TimelineEntry[]): void {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        const start1 = this.parseDate(entry1.startDate);
        const end1 = entry1.endDate ? this.parseDate(entry1.endDate) : new Date();
        const start2 = this.parseDate(entry2.startDate);
        const end2 = entry2.endDate ? this.parseDate(entry2.endDate) : new Date();

        if (!start1 || !end1 || !start2 || !end2) continue;

        // Check if they overlap
        if (start1 <= end2 && start2 <= end1) {
          entry1.overlappingWith.push(j);
          entry2.overlappingWith.push(i);
        }
      }
    }
  }

  /**
   * Detect gaps between jobs (Case #3, #11)
   */
  private static detectGaps(entries: TimelineEntry[]): TimelineGap[] {
    const gaps: TimelineGap[] = [];

    // Sort entries by start date
    const sorted = [...entries].sort((a, b) => {
      const dateA = this.parseDate(a.startDate);
      const dateB = this.parseDate(b.startDate);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = current.endDate ? this.parseDate(current.endDate) : new Date();
      const nextStart = this.parseDate(next.startDate);

      if (!currentEnd || !nextStart) continue;

      // Calculate gap in days
      const gapDays = Math.floor((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));

      // Only flag gaps > 30 days (Case #11)
      if (gapDays > 30) {
        gaps.push({
          startDate: current.endDate || '',
          endDate: next.startDate,
          days: gapDays,
          startIndex: entries.indexOf(current),
          endIndex: entries.indexOf(next),
          isCritical: gapDays > 30,
        });
      }
    }

    return gaps;
  }

  /**
   * Calculate total years of experience
   */
  private static calculateTotalYears(entries: TimelineEntry[]): number {
    const totalMonths = entries.reduce((sum, entry) => sum + entry.duration, 0);
    return Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Detect sort order (Case #7)
   */
  private static detectSortOrder(entries: TimelineEntry[]): 'newest-first' | 'oldest-first' {
    if (entries.length < 2) return 'newest-first';

    const first = this.parseDate(entries[0].startDate);
    const last = this.parseDate(entries[entries.length - 1].startDate);

    if (!first || !last) return 'newest-first';

    return first > last ? 'newest-first' : 'oldest-first';
  }

  /**
   * Normalize ambiguous date (Case #2)
   * "Summer 2022" -> "June-August 2022"
   */
  static normalizeAmbiguousDate(date: string): string {
    if (!this.isAmbiguousDate(date)) return date;

    const lower = date.toLowerCase();
    const yearMatch = date.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : '';

    if (lower.includes('summer')) {
      return `June-August ${year}`;
    }
    if (lower.includes('winter')) {
      return `December ${year} - February ${parseInt(year) + 1}`;
    }
    if (lower.includes('spring')) {
      return `March-May ${year}`;
    }
    if (lower.includes('fall') || lower.includes('autumn')) {
      return `September-November ${year}`;
    }

    // Year range without months
    const yearRangeMatch = date.match(/^(\d{4})-(\d{4})$/);
    if (yearRangeMatch) {
      return `${yearRangeMatch[1]} - ${yearRangeMatch[2]}`;
    }

    return date;
  }
}

