// @ts-nocheck
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ParserType } from '@/contexts/ATSDeepDiveContext';
import { TextNormalizationService } from './textNormalizationService';

export interface KeywordMatch {
  keyword: string;
  type: 'exact' | 'semantic' | 'synonym' | 'missing';
  x: number;
  y: number;
  width: number;
  height: number;
  frequency: number; // For spam detection (Case #29)
  isSpam: boolean; // Keyword stuffing (Case #29)
  isCritical: boolean;
  matchedVia?: string; // For synonyms: which synonym matched
}

// Synonym mappings (Case #27)
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  'ai': ['artificial intelligence', 'machine learning', 'ml'],
  'ml': ['machine learning', 'artificial intelligence', 'ai'],
  'javascript': ['js', 'ecmascript'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js'],
  'node': ['nodejs', 'node.js'],
  'aws': ['amazon web services'],
  'api': ['application programming interface'],
  'ui': ['user interface'],
  'ux': ['user experience'],
  'sql': ['structured query language'],
  'nosql': ['non-relational database'],
  'rest': ['restful', 'rest api'],
  'graphql': ['graph ql'],
  'docker': ['containerization'],
  'kubernetes': ['k8s'],
  'ci/cd': ['continuous integration', 'continuous deployment'],
};

export class ATSKeywordService {
  /**
   * Find keyword matches in CV (Cases 27-40)
   */
  static findKeywordMatches(
    cvData: UnifiedCVDataStructure | null,
    jobData: any,
    parserType: ParserType
  ): KeywordMatch[] {
    if (!cvData || !jobData) return [];

    // Extract keywords from job description
    const jobKeywords = this.extractKeywords(jobData.description || jobData.requirements || '');

    // Extract CV text
    const cvText = this.extractCVText(cvData);

    // Find matches
    const matches: KeywordMatch[] = [];

    jobKeywords.forEach((jobKeyword) => {
      const normalizedJobKw = TextNormalizationService.normalizeKeyword(jobKeyword);

      // Check for exact match (Case #30 - boundary matching)
      const exactMatch = this.findExactMatch(cvText, normalizedJobKw);
      if (exactMatch) {
        matches.push({
          ...exactMatch,
          keyword: jobKeyword,
          type: 'exact',
          isCritical: true,
        });
        return;
      }

      // Check for synonym match (Case #27)
      const synonymMatch = this.findSynonymMatch(cvText, normalizedJobKw, jobKeyword);
      if (synonymMatch) {
        matches.push({
          ...synonymMatch,
          keyword: jobKeyword,
          type: 'synonym',
          isCritical: false,
        });
        return;
      }

      // Check for semantic match (would need NLP, simplified here)
      const semanticMatch = this.findSemanticMatch(cvText, normalizedJobKw);
      if (semanticMatch) {
        matches.push({
          ...semanticMatch,
          keyword: jobKeyword,
          type: 'semantic',
          isCritical: false,
        });
        return;
      }

      // Missing keyword (Case #35 - zero match)
      matches.push({
        keyword: jobKeyword,
        type: 'missing',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        frequency: 0,
        isSpam: false,
        isCritical: true,
      });
    });

    // Detect keyword stuffing (Case #29)
    matches.forEach((match) => {
      if (match.type === 'exact' || match.type === 'synonym') {
        const frequency = this.countKeywordFrequency(cvText, match.keyword);
        match.frequency = frequency;
        match.isSpam = frequency > 5; // Threshold for spam
      }
    });

    return matches;
  }

  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string): string[] {
    if (!text) return [];

    // Simple keyword extraction (can be enhanced with NLP)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
    ]);

    const keywords = words.filter((w) => !stopWords.has(w));

    // Remove duplicates
    return Array.from(new Set(keywords));
  }

  /**
   * Extract CV text for keyword matching
   */
  private static extractCVText(cvData: UnifiedCVDataStructure): string {
    let text = '';

    // Basics
    if (cvData.basics) {
      text += `${cvData.basics.name || ''} `;
      text += `${cvData.basics.label || ''} `;
      text += `${cvData.basics.summary || ''} `;
    }

    // Work experience
    if (cvData.work) {
      cvData.work.forEach((work) => {
        text += `${work.position || ''} `;
        text += `${work.summary || ''} `;
        if (work.highlights) {
          text += work.highlights.join(' ') + ' ';
        }
      });
    }

    // Education
    if (cvData.education) {
      cvData.education.forEach((edu) => {
        text += `${edu.studyType || ''} `;
        text += `${edu.area || ''} `;
      });
    }

    // Skills
    if (cvData.skills) {
      cvData.skills.forEach((skill) => {
        if (Array.isArray(skill.skills)) {
          text += skill.skills.join(' ') + ' ';
        }
        if (Array.isArray(skill.keywords)) {
          text += skill.keywords.join(' ') + ' ';
        }
      });
    }

    // Projects
    if (cvData.projects) {
      cvData.projects.forEach((project) => {
        text += `${project.name || ''} `;
        text += `${project.description || ''} `;
      });
    }

    return text.toLowerCase();
  }

  /**
   * Find exact match with boundary checking (Case #30)
   */
  private static findExactMatch(cvText: string, keyword: string): KeywordMatch | null {
    const normalizedKeyword = keyword.toLowerCase();
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const match = regex.exec(cvText);

    if (match) {
      // Approximate position (would need actual DOM coordinates)
      return {
        keyword: normalizedKeyword,
        type: 'exact',
        x: 0, // Would be calculated from actual text position
        y: 0,
        width: match[0].length * 8, // Approximate
        height: 20,
        frequency: 1,
        isSpam: false,
        isCritical: true,
      };
    }

    return null;
  }

  /**
   * Find synonym match (Case #27)
   */
  private static findSynonymMatch(
    cvText: string,
    normalizedKeyword: string,
    originalKeyword: string
  ): KeywordMatch | null {
    const synonyms = KEYWORD_SYNONYMS[normalizedKeyword] || [];
    const allVariants = [normalizedKeyword, ...synonyms];

    for (const variant of allVariants) {
      const match = this.findExactMatch(cvText, variant);
      if (match) {
        return {
          ...match,
          matchedVia: variant,
        };
      }
    }

    return null;
  }

  /**
   * Find semantic match (simplified - would need NLP)
   */
  private static findSemanticMatch(cvText: string, keyword: string): KeywordMatch | null {
    // Simplified semantic matching
    // In production, this would use NLP/embeddings
    return null;
  }

  /**
   * Count keyword frequency (Case #29)
   */
  private static countKeywordFrequency(text: string, keyword: string): number {
    const normalizedKeyword = keyword.toLowerCase();
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Handle no job description (Case #28) - use market standard
   */
  static getMarketStandardKeywords(jobTitle: string): string[] {
    // Market standard keywords based on job title
    // This would typically come from a database or API
    const marketStandards: Record<string, string[]> = {
      'software engineer': ['javascript', 'python', 'react', 'node', 'sql', 'git'],
      'data scientist': ['python', 'sql', 'machine learning', 'pandas', 'numpy', 'tensorflow'],
      'product manager': ['agile', 'scrum', 'product strategy', 'stakeholder', 'roadmap'],
      'designer': ['figma', 'adobe', 'ui', 'ux', 'prototyping'],
    };

    const lowerTitle = jobTitle.toLowerCase();
    for (const [key, keywords] of Object.entries(marketStandards)) {
      if (lowerTitle.includes(key)) {
        return keywords;
      }
    }

    return [];
  }

  /**
   * Detect language mismatch (Case #36)
   */
  static detectLanguageMismatch(cvData: UnifiedCVDataStructure, jobData: any): boolean {
    // Simplified language detection
    // In production, would use language detection library
    const cvText = this.extractCVText(cvData);
    const jobText = jobData.description || '';

    // Check for common non-English patterns
    const hasNonEnglishCV = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(cvText);
    const hasNonEnglishJob = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(jobText);

    return hasNonEnglishCV !== hasNonEnglishJob;
  }

  /**
   * Detect job title mismatch (Case #32)
   */
  static detectJobTitleMismatch(cvData: UnifiedCVDataStructure, jobData: any): boolean {
    if (!jobData.title) return false;

    const targetTitle = jobData.title.toLowerCase();
    const cvTitles = (cvData.work || [])
      .map((w) => (w.position || w.title || '').toLowerCase())
      .filter(Boolean);

    // Check if any CV title matches target
    return !cvTitles.some((title) => {
      const words = targetTitle.split(/\s+/);
      return words.some((word) => title.includes(word));
    });
  }

  /**
   * Detect industry mismatch (Case #34)
   */
  static detectIndustryMismatch(cvData: UnifiedCVDataStructure, jobData: any): boolean {
    // Simplified industry detection
    // In production, would use industry classification
    return false;
  }
}

