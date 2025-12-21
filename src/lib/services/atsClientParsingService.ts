/**
 * Client-Side ATS Parsing Service
 * Runs "Robo-Vision" in browser for instant feedback (no round-trip to server)
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ParserType } from '@/contexts/ATSDeepDiveContext';
import { ATSParsingVisualizationService } from './atsParsingVisualizationService';
import { ATSTimelineService } from './atsTimelineService';
import { ATSKeywordService } from './atsKeywordService';

export interface ClientParsingResult {
  readingPath: any[];
  timeline: any;
  keywords: any[];
  deadZones: any[];
  issues: any[];
}

export class ATSClientParsingService {
  private static cache = new Map<string, ClientParsingResult>();
  private static debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Parse CV client-side with debouncing
   */
  static async parseCV(
    cvData: UnifiedCVDataStructure,
    jobData: any,
    parserType: ParserType,
    debounceMs: number = 300
  ): Promise<ClientParsingResult> {
    // Create cache key
    const cacheKey = this.getCacheKey(cvData, jobData, parserType);

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Debounce parsing
    return new Promise((resolve) => {
      // Clear existing timer
      if (this.debounceTimers.has(cacheKey)) {
        clearTimeout(this.debounceTimers.get(cacheKey)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        const result = this.performParsing(cvData, jobData, parserType);
        this.cache.set(cacheKey, result);
        this.debounceTimers.delete(cacheKey);
        resolve(result);
      }, debounceMs);

      this.debounceTimers.set(cacheKey, timer);
    });
  }

  /**
   * Perform actual parsing (synchronous)
   */
  private static performParsing(
    cvData: UnifiedCVDataStructure,
    jobData: any,
    parserType: ParserType
  ): ClientParsingResult {
    // Reading path
    const readingPath = ATSParsingVisualizationService.calculateReadingPath(cvData, parserType);

    // Timeline
    const timeline = ATSTimelineService.calculateTimeline(cvData, parserType);

    // Keywords
    const keywords = ATSKeywordService.findKeywordMatches(cvData, jobData, parserType);

    // Dead zones
    const deadZones = ATSParsingVisualizationService.detectDeadZones(cvData, parserType);

    // Issues
    const issues = ATSParsingVisualizationService.detectParsingIssues(cvData, parserType);

    return {
      readingPath,
      timeline,
      keywords,
      deadZones,
      issues,
    };
  }

  /**
   * Get cache key for CV data
   */
  private static getCacheKey(
    cvData: UnifiedCVDataStructure,
    jobData: any,
    parserType: ParserType
  ): string {
    // Create a simple hash of CV data
    const cvHash = JSON.stringify({
      name: cvData.basics?.name,
      workCount: cvData.work?.length || 0,
      educationCount: cvData.education?.length || 0,
      skillsCount: cvData.skills?.length || 0,
    });
    const jobHash = jobData ? JSON.stringify({ title: jobData.title }) : 'no-job';
    return `${cvHash}-${jobHash}-${parserType}`;
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific CV
   */
  static clearCacheForCV(cvData: UnifiedCVDataStructure): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(JSON.stringify({ name: cvData.basics?.name }))) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

