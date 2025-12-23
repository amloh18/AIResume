/**
 * CV Scoring Service
 * 
 * Provides dual scoring systems for the Resume Enhancer:
 * - CV Score: Quality assessment for Master/Standalone CVs
 * - ATS Score: JD match assessment for Journey CVs
 */

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { KeywordGapAnalysisResult } from '@/types/keyword-gap';

/**
 * CV Score breakdown for quality assessment
 */
export interface CVScoreBreakdown {
  completeness: number;     // 0-25 (sections filled)
  impactVerbs: number;      // 0-20 (action verbs usage)
  quantification: number;   // 0-20 (metrics/numbers)
  formatting: number;       // 0-15 (consistency)
  readability: number;      // 0-20 (sentence structure)
  total: number;            // 0-100
}

/**
 * ATS Score breakdown for JD match assessment
 */
export interface ATSScoreBreakdown {
  keywordMatch: number;     // 0-40 (JD keywords found)
  experienceAlign: number;  // 0-25 (years/role match)
  skillsCoverage: number;   // 0-20 (required skills)
  parseability: number;     // 0-15 (template penalty applied)
  total: number;            // 0-100 (capped by template)
}

/**
 * Combined score result
 */
export interface ScoreResult {
  cvScore: CVScoreBreakdown;
  atsScore?: ATSScoreBreakdown;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

/**
 * Impact verbs for analysis
 */
const IMPACT_VERBS = [
  'led', 'managed', 'developed', 'created', 'implemented', 'improved',
  'increased', 'reduced', 'optimized', 'designed', 'built', 'established',
  'coordinated', 'supervised', 'analyzed', 'resolved', 'delivered',
  'achieved', 'generated', 'streamlined', 'spearheaded', 'orchestrated',
  'pioneered', 'transformed', 'accelerated', 'launched', 'executed',
  'negotiated', 'mentored', 'facilitated', 'automated', 'consolidated'
];

/**
 * Quantifier patterns for detecting metrics
 */
const QUANTIFIER_PATTERNS = [
  /\d+%/g,                           // Percentages
  /\$[\d,]+/g,                       // Dollar amounts
  /\d+[xX]/g,                        // Multipliers (2x, 10X)
  /\d+\s*(million|billion|k|K)/gi,   // Large numbers
  /\d+\s*(users|customers|clients)/gi, // User counts
  /\d+\s*(projects?|teams?|members?)/gi, // Team/project counts
  /\d+\s*(years?|months?)/gi,        // Time periods
  /\d+-\d+%/g,                       // Ranges
  /top\s*\d+/gi,                     // Rankings
  /\d+\+/g                           // "5+ years"
];

export class CVScoringService {
  /**
   * Calculate complete CV Score (for Master/Standalone CVs)
   */
  static calculateCVScore(cvData: UnifiedCVDataStructure): CVScoreBreakdown {
    const completeness = this.calculateCompletenessScore(cvData);
    const impactVerbs = this.calculateImpactVerbsScore(cvData);
    const quantification = this.calculateQuantificationScore(cvData);
    const formatting = this.calculateFormattingScore(cvData);
    const readability = this.calculateReadabilityScore(cvData);

    const total = completeness + impactVerbs + quantification + formatting + readability;

    return {
      completeness,
      impactVerbs,
      quantification,
      formatting,
      readability,
      total: Math.min(total, 100)
    };
  }

  /**
   * Calculate ATS Score (for Journey CVs)
   */
  static calculateATSScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis: KeywordGapAnalysisResult,
    atsScoreCap: number = 100
  ): ATSScoreBreakdown {
    const keywordMatch = this.calculateKeywordMatchScore(keywordAnalysis);
    const experienceAlign = this.calculateExperienceAlignScore(cvData, keywordAnalysis);
    const skillsCoverage = this.calculateSkillsCoverageScore(cvData, keywordAnalysis);
    const parseability = this.calculateParseabilityScore(atsScoreCap);

    const rawTotal = keywordMatch + experienceAlign + skillsCoverage + parseability;
    const total = Math.min(rawTotal, atsScoreCap);

    return {
      keywordMatch,
      experienceAlign,
      skillsCoverage,
      parseability,
      total
    };
  }

  /**
   * Get full score result with recommendations
   */
  static getFullScoreResult(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult,
    atsScoreCap: number = 100
  ): ScoreResult {
    const cvScore = this.calculateCVScore(cvData);
    
    let atsScore: ATSScoreBreakdown | undefined;
    if (keywordAnalysis) {
      atsScore = this.calculateATSScore(cvData, keywordAnalysis, atsScoreCap);
    }

    const primaryScore = atsScore?.total ?? cvScore.total;
    const overallGrade = this.getGrade(primaryScore);
    const recommendations = this.generateRecommendations(cvScore, atsScore, cvData);

    return {
      cvScore,
      atsScore,
      overallGrade,
      recommendations
    };
  }

  /**
   * Completeness score (0-25)
   */
  private static calculateCompletenessScore(cvData: UnifiedCVDataStructure): number {
    let score = 0;

    // Personal info (7 points)
    if (cvData.basics?.name) score += 2;
    if (cvData.basics?.email) score += 2;
    if (cvData.basics?.phone) score += 1;
    if (cvData.basics?.location) score += 1;
    if (cvData.basics?.summary && cvData.basics.summary.length > 100) score += 1;

    // Work experience (8 points)
    if (cvData.work && cvData.work.length > 0) {
      score += 3;
      const hasHighlights = cvData.work.some((w: any) => 
        w.highlights && w.highlights.length > 0
      );
      if (hasHighlights) score += 3;
      if (cvData.work.length >= 2) score += 2;
    }

    // Skills (4 points)
    if (cvData.skills && cvData.skills.length > 0) {
      score += 2;
      if (cvData.skills.length >= 5) score += 2;
    }

    // Education (3 points)
    if (cvData.education && cvData.education.length > 0) score += 3;

    // Bonus: Projects/Certificates (3 points)
    if (cvData.projects && cvData.projects.length > 0) score += 1.5;
    if (cvData.certificates && cvData.certificates.length > 0) score += 1.5;

    return Math.min(score, 25);
  }

  /**
   * Impact verbs score (0-20)
   */
  private static calculateImpactVerbsScore(cvData: UnifiedCVDataStructure): number {
    let verbCount = 0;
    let totalBullets = 0;

    // Check work highlights
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            totalBullets++;
            const lowerHighlight = highlight.toLowerCase().trim();
            const firstWord = lowerHighlight.split(/\s+/)[0];
            if (IMPACT_VERBS.includes(firstWord)) {
              verbCount++;
            }
          });
        }
      });
    }

    // Check project descriptions
    if (cvData.projects) {
      cvData.projects.forEach((project: any) => {
        if (project.description) {
          totalBullets++;
          const lowerDesc = project.description.toLowerCase().trim();
          const firstWord = lowerDesc.split(/\s+/)[0];
          if (IMPACT_VERBS.includes(firstWord)) {
            verbCount++;
          }
        }
      });
    }

    if (totalBullets === 0) return 10; // Default if no content

    const ratio = verbCount / totalBullets;
    return Math.round(ratio * 20);
  }

  /**
   * Quantification score (0-20)
   */
  private static calculateQuantificationScore(cvData: UnifiedCVDataStructure): number {
    let quantCount = 0;
    let totalBullets = 0;

    const countQuantifiers = (text: string): number => {
      let count = 0;
      QUANTIFIER_PATTERNS.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) count += matches.length;
      });
      return count;
    };

    // Check work highlights
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            totalBullets++;
            if (countQuantifiers(highlight) > 0) {
              quantCount++;
            }
          });
        }
      });
    }

    // Check summary
    if (cvData.basics?.summary) {
      if (countQuantifiers(cvData.basics.summary) > 0) {
        quantCount += 2; // Bonus for quantified summary
      }
    }

    if (totalBullets === 0) return 10; // Default if no content

    const ratio = quantCount / totalBullets;
    return Math.round(ratio * 20);
  }

  /**
   * Formatting score (0-15)
   */
  private static calculateFormattingScore(cvData: UnifiedCVDataStructure): number {
    let score = 15; // Start with perfect, deduct for issues

    // Check for consistent date formats
    let dateFormats = new Set<string>();
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.startDate) {
          dateFormats.add(this.getDateFormat(job.startDate));
        }
      });
    }
    if (dateFormats.size > 1) score -= 3;

    // Check for overly long bullets
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights) {
          job.highlights.forEach((h: string) => {
            if (h.length > 200) score -= 1;
          });
        }
      });
    }

    // Check summary length
    if (cvData.basics?.summary) {
      if (cvData.basics.summary.length < 50) score -= 2;
      if (cvData.basics.summary.length > 500) score -= 2;
    }

    return Math.max(score, 0);
  }

  /**
   * Readability score (0-20)
   */
  private static calculateReadabilityScore(cvData: UnifiedCVDataStructure): number {
    let score = 20;
    const issues: string[] = [];

    // Check for common readability issues
    const allText = this.getAllText(cvData);

    // Passive voice detection (basic)
    const passivePatterns = /\b(was|were|been|being|is|are)\s+\w+ed\b/gi;
    const passiveCount = (allText.match(passivePatterns) || []).length;
    if (passiveCount > 5) score -= 3;

    // Overly complex sentences (basic check)
    const sentences = allText.split(/[.!?]+/);
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 30).length;
    if (longSentences > 3) score -= 3;

    // Repeated words/phrases
    const words = allText.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      if (w.length > 5) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const overusedWords = Object.values(wordFreq).filter(f => f > 5).length;
    if (overusedWords > 3) score -= 2;

    // Clichés
    const cliches = [
      'team player', 'hard worker', 'go-getter', 'think outside the box',
      'synergy', 'leverage', 'results-driven', 'self-starter'
    ];
    cliches.forEach(cliche => {
      if (allText.toLowerCase().includes(cliche)) score -= 1;
    });

    return Math.max(score, 0);
  }

  /**
   * Keyword match score for ATS (0-40)
   */
  private static calculateKeywordMatchScore(analysis: KeywordGapAnalysisResult): number {
    const { stats } = analysis;
    if (stats.totalJDKeywords === 0) return 20;

    const matchRatio = stats.matchedCount / stats.totalJDKeywords;
    return Math.round(matchRatio * 40);
  }

  /**
   * Experience alignment score for ATS (0-25)
   */
  private static calculateExperienceAlignScore(
    cvData: UnifiedCVDataStructure,
    analysis: KeywordGapAnalysisResult
  ): number {
    // Check if experience-related gaps exist
    const experienceGaps = analysis.gaps.filter(g => g.category === 'experience');
    const hasCriticalExpGaps = experienceGaps.some(g => g.importance === 'critical');

    let score = 25;
    if (hasCriticalExpGaps) score -= 15;
    else if (experienceGaps.length > 0) score -= 5;

    // Check for work experience presence
    if (!cvData.work || cvData.work.length === 0) score -= 10;

    return Math.max(score, 0);
  }

  /**
   * Skills coverage score for ATS (0-20)
   */
  private static calculateSkillsCoverageScore(
    cvData: UnifiedCVDataStructure,
    analysis: KeywordGapAnalysisResult
  ): number {
    const skillGaps = analysis.gaps.filter(g => 
      g.category === 'skill' || g.category === 'tool'
    );
    const criticalSkillGaps = skillGaps.filter(g => g.importance === 'critical');

    let score = 20;
    score -= criticalSkillGaps.length * 3;
    score -= (skillGaps.length - criticalSkillGaps.length) * 1;

    return Math.max(score, 0);
  }

  /**
   * Parseability score based on template (0-15)
   */
  private static calculateParseabilityScore(atsScoreCap: number): number {
    // Convert cap to parseability score
    // Cap of 100 = 15 points, Cap of 60 = 9 points
    return Math.round((atsScoreCap / 100) * 15);
  }

  /**
   * Get letter grade from score
   */
  private static getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on scores
   */
  private static generateRecommendations(
    cvScore: CVScoreBreakdown,
    atsScore?: ATSScoreBreakdown,
    cvData?: UnifiedCVDataStructure
  ): string[] {
    const recommendations: string[] = [];

    // CV Score recommendations
    if (cvScore.completeness < 15) {
      recommendations.push('Add more sections to your CV (skills, projects, certificates)');
    }
    if (cvScore.impactVerbs < 12) {
      recommendations.push('Start bullet points with strong action verbs (Led, Developed, Implemented)');
    }
    if (cvScore.quantification < 12) {
      recommendations.push('Add metrics and numbers to demonstrate impact (%, $, counts)');
    }
    if (cvScore.readability < 12) {
      recommendations.push('Simplify sentences and remove clichés');
    }

    // ATS Score recommendations
    if (atsScore) {
      if (atsScore.keywordMatch < 25) {
        recommendations.push('Add missing keywords from the job description to your CV');
      }
      if (atsScore.skillsCoverage < 12) {
        recommendations.push('Ensure your skills section includes required technologies');
      }
      if (atsScore.parseability < 10) {
        recommendations.push('Consider using an ATS-friendly template for better parsing');
      }
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  /**
   * Helper: Get date format pattern
   */
  private static getDateFormat(date: string): string {
    if (/^\d{4}-\d{2}$/.test(date)) return 'YYYY-MM';
    if (/^\d{4}$/.test(date)) return 'YYYY';
    if (/^[A-Za-z]+\s+\d{4}$/.test(date)) return 'Month YYYY';
    return 'other';
  }

  /**
   * Helper: Get all text from CV
   */
  private static getAllText(cvData: UnifiedCVDataStructure): string {
    const parts: string[] = [];

    if (cvData.basics?.summary) parts.push(cvData.basics.summary);

    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.summary) parts.push(job.summary);
        if (job.highlights) parts.push(...job.highlights);
      });
    }

    if (cvData.projects) {
      cvData.projects.forEach((p: any) => {
        if (p.description) parts.push(p.description);
      });
    }

    return parts.join(' ');
  }
}

