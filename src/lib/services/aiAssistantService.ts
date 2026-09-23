// @ts-nocheck
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { JobPromptContext } from '@/types/job-prompt-context';
import { AISuggestion } from '@/lib/stores/aiStore';
import { TextNormalizationService } from './textNormalizationService';
import { getStandardSectionName, isStandardSection } from '@/lib/data/sectionSynonyms';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  strengths: string[];
  suggestions: string[];
  factorBreakdown?: {
    hardKeywords: { score: number; weight: number; matched: number; total: number };
    jobTitles: { score: number; weight: number; matched: boolean };
    experienceLength: { score: number; weight: number; years: number };
    formatting: { score: number; weight: number; issues: string[] };
    softSkills: { score: number; weight: number; matched: number; total: number };
  };
  knockOutFactors?: {
    fileFormat: { passed: boolean; issue?: string };
    sectionHeaders: { passed: boolean; issues: string[] };
    contactInfo: { passed: boolean; issues: string[] };
  };
}

export class AIAssistantService {
  // Simple in-memory cache for AI responses
  private static responseCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  private static generateCacheKey(action: string, cvData: any, jobData: any, additionalContext: any = {}): string {
    // Create a deterministic hash/string for the state
    // We only hash relevant data to avoid cache misses on unrelated CV changes
    const state = {
      action,
      jobId: jobData?.id || jobData?.title || 'no-job',
      cvId: cvData?.id || 'no-cv',
      context: additionalContext
    };
    return JSON.stringify(state);
  }

  // Section guidelines based on the image
  private static readonly SECTION_GUIDELINES = {
    contactInfo: {
      recommendedLength: '1-2 lines',
      keyFocus: 'Clarity, professional links (LinkedIn/GitHub)'
    },
    summary: {
      recommendedLength: '3-4 lines (~50-80 words)',
      keyFocus: 'High-level pitch, top skills, career goal'
    },
    workExperience: {
      recommendedLength: '3-5 bullet points per role',
      keyFocus: 'Quantified achievements, action verbs, results'
    },
    education: {
      recommendedLength: '1-2 lines per degree',
      keyFocus: 'Brevity, highest qualification first'
    },
    skills: {
      recommendedLength: 'Keyword list (~15-25 skills)',
      keyFocus: 'Categorized, relevant hard skills'
    },
    projects: {
      recommendedLength: '2-3 projects, 2-3 bullets each',
      keyFocus: 'Practical application, personal contribution, tech stack'
    },
    certificates: {
      recommendedLength: '1 line per item',
      keyFocus: 'Credibility, recognition'
    }
  };

  // ============================================================================
  // ATS SCORING HELPER METHODS
  // ============================================================================

  /**
   * Check knock-out factors (pass/fail - score = 0 if failed)
   */
  private static checkKnockOutFactors(cvData: UnifiedCVDataStructure): {
    fileFormat: { passed: boolean; issue?: string };
    sectionHeaders: { passed: boolean; issues: string[] };
    contactInfo: { passed: boolean; issues: string[] };
  } {
    const issues: string[] = [];
    
    // File Format - Note: This is validated at download time, not here
    // We assume text-based PDF/DOCX will be generated
    const fileFormat = { passed: true };

    // Section Headers - Check for standard headers (with synonym support)
    const sectionHeaders = this.extractStandardSections(cvData);
    const hasStandardHeaders = sectionHeaders.length > 0 && 
      sectionHeaders.some(section => isStandardSection(section));
    
    const sectionHeaderIssues: string[] = [];
    if (!hasStandardHeaders && cvData.work && cvData.work.length > 0) {
      sectionHeaderIssues.push('Use standard section headers like "Work Experience", "Education", "Skills"');
    }

    // Contact Information - Must have name, email, phone (with normalization)
    const contactIssues: string[] = [];
    if (!cvData.basics?.name || cvData.basics.name.trim().length === 0) {
      contactIssues.push('Name is required');
    }
    
    // Normalize and validate email (handles obfuscation)
    const normalizedEmail = TextNormalizationService.normalizeEmail(cvData.basics?.email || '');
    if (!normalizedEmail || normalizedEmail.trim().length === 0) {
      // Also try extracting from text if email field is empty
      const extracted = TextNormalizationService.extractContactInfo(
        `${cvData.basics?.email || ''} ${cvData.basics?.summary || ''}`
      );
      if (extracted.emails.length === 0) {
        contactIssues.push('Email is required');
      }
    }
    
    // Normalize and validate phone (handles icons, patterns)
    const normalizedPhone = TextNormalizationService.normalizePhone(cvData.basics?.phone || '');
    if (!normalizedPhone || normalizedPhone.length < 10) {
      // Also try extracting from text if phone field is empty
      const extracted = TextNormalizationService.extractContactInfo(
        `${cvData.basics?.phone || ''} ${cvData.basics?.summary || ''}`
      );
      if (extracted.phones.length === 0) {
        contactIssues.push('Phone number is required');
      }
    }

    return {
      fileFormat,
      sectionHeaders: {
        passed: sectionHeaderIssues.length === 0,
        issues: sectionHeaderIssues
      },
      contactInfo: {
        passed: contactIssues.length === 0,
        issues: contactIssues
      }
    };
  }

  /**
   * Extract standard sections from CV (with synonym support)
   */
  private static extractStandardSections(cvData: UnifiedCVDataStructure): string[] {
    const sections: string[] = [];
    
    if (cvData.work && cvData.work.length > 0) {
      sections.push(TextNormalizationService.normalizeSectionHeader('Work Experience'));
    }
    if (cvData.education && cvData.education.length > 0) {
      sections.push(TextNormalizationService.normalizeSectionHeader('Education'));
    }
    if (cvData.skills && cvData.skills.length > 0) {
      sections.push(TextNormalizationService.normalizeSectionHeader('Skills'));
    }
    if (cvData.projects && cvData.projects.length > 0) {
      sections.push(TextNormalizationService.normalizeSectionHeader('Projects'));
    }
    if (cvData.certificates && cvData.certificates.length > 0) {
      sections.push(TextNormalizationService.normalizeSectionHeader('Certificates'));
    }
    
    return sections;
  }

  /**
   * Detect keyword stuffing and apply diminishing returns
   */
  private static detectKeywordStuffing(keyword: string, text: string): number {
    const normalizedKeyword = TextNormalizationService.normalizeKeyword(keyword);
    const normalizedText = TextNormalizationService.normalizeText(text);
    
    // Count occurrences with word boundaries (prevents matching "Go" in "Golang")
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    const count = matches ? matches.length : 0;
    
    // Diminishing returns: first 3 mentions = full points, 4-5 = half points, >5 = 0 additional
    if (count <= 3) return count;
    if (count <= 5) return 3 + (count - 3) * 0.5;
    return 4; // Max 4 points regardless of count
  }

  /**
   * Calculate hard keywords score (40% weight) with normalization, boundary checks, and keyword stuffing detection
   */
  private static calculateHardKeywordsScore(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext,
    cvTextWithContext: { text: string; section: string }[]
  ): { score: number; matched: number; total: number; missing: string[] } {
    const jobText = `${jobData.title} ${jobData.description || ''} ${jobData.requirements || ''}`;
    const jobKeywords = this.extractKeywords(jobText);
    
    // Extract keywords from CV with placement context
    const cvKeywordsInExperience: Map<string, number> = new Map(); // keyword -> count
    const cvKeywordsInProjects: Map<string, number> = new Map(); // Projects = Tier 1.5
    const cvKeywordsInSkills: Map<string, number> = new Map();
    const cvKeywordsOther: Map<string, number> = new Map();
    
    cvTextWithContext.forEach(({ text, section }) => {
      const normalizedText = TextNormalizationService.normalizeText(text);
      const keywords = this.extractKeywords(normalizedText);
      
      keywords.forEach(keyword => {
        const normalizedKw = TextNormalizationService.normalizeKeyword(keyword);
        
        if (section === 'work' || section === 'experience') {
          cvKeywordsInExperience.set(normalizedKw, (cvKeywordsInExperience.get(normalizedKw) || 0) + 1);
        } else if (section === 'projects') {
          cvKeywordsInProjects.set(normalizedKw, (cvKeywordsInProjects.get(normalizedKw) || 0) + 1);
        } else if (section === 'skills') {
          cvKeywordsInSkills.set(normalizedKw, (cvKeywordsInSkills.get(normalizedKw) || 0) + 1);
        } else {
          cvKeywordsOther.set(normalizedKw, (cvKeywordsOther.get(normalizedKw) || 0) + 1);
        }
      });
    });

    // Match keywords with normalization and boundary checks
    const matchedInExperience: string[] = [];
    const matchedInProjects: string[] = [];
    const matchedInSkills: string[] = [];
    const matchedOther: string[] = [];
    const missing: string[] = [];

    // Combine all CV text for keyword stuffing detection
    const allCvText = cvTextWithContext.map(c => c.text).join(' ');

    jobKeywords.forEach(jobKeyword => {
      const normalizedJobKw = TextNormalizationService.normalizeKeyword(jobKeyword);
      
      // Check with boundary matching and normalization
      const inExperience = Array.from(cvKeywordsInExperience.keys()).some(cvKw => 
        TextNormalizationService.keywordMatches(cvKw, normalizedJobKw)
      );
      const inProjects = Array.from(cvKeywordsInProjects.keys()).some(cvKw => 
        TextNormalizationService.keywordMatches(cvKw, normalizedJobKw)
      );
      const inSkills = Array.from(cvKeywordsInSkills.keys()).some(cvKw => 
        TextNormalizationService.keywordMatches(cvKw, normalizedJobKw)
      );
      const inOther = Array.from(cvKeywordsOther.keys()).some(cvKw => 
        TextNormalizationService.keywordMatches(cvKw, normalizedJobKw)
      );

      // Apply keyword stuffing penalty
      const stuffingScore = this.detectKeywordStuffing(jobKeyword, allCvText);
      const hasMatch = inExperience || inProjects || inSkills || inOther;

      if (hasMatch && stuffingScore > 0) {
        if (inExperience) {
          matchedInExperience.push(jobKeyword);
        } else if (inProjects) {
          matchedInProjects.push(jobKeyword);
        } else if (inSkills) {
          matchedInSkills.push(jobKeyword);
        } else if (inOther) {
          matchedOther.push(jobKeyword);
        }
      } else if (!hasMatch) {
        missing.push(jobKeyword);
      }
    });

    // Calculate score with weights: Experience = 1.0, Projects = 0.85 (Tier 1.5), Skills = 0.7, Other = 0.5
    const experienceScore = (matchedInExperience.length / jobKeywords.length) * 100;
    const projectsScore = (matchedInProjects.length / jobKeywords.length) * 100 * 0.85;
    const skillsScore = (matchedInSkills.length / jobKeywords.length) * 100 * 0.7;
    const otherScore = (matchedOther.length / jobKeywords.length) * 100 * 0.5;
    
    const totalMatched = matchedInExperience.length + matchedInProjects.length + matchedInSkills.length + matchedOther.length;
    const score = Math.min(100, experienceScore + projectsScore + skillsScore + otherScore);

    return {
      score: Math.round(score),
      matched: totalMatched,
      total: jobKeywords.length,
      missing: missing.slice(0, 10)
    };
  }

  /**
   * Calculate job title score (20% weight) with normalization and abbreviation expansion
   */
  private static calculateJobTitleScore(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext
  ): { score: number; matched: boolean } {
    if (!jobData.title) {
      return { score: 50, matched: false };
    }

    // Normalize target title (expand abbreviations)
    const normalizedTargetTitle = TextNormalizationService.normalizeJobTitle(jobData.title);
    const targetTitle = normalizedTargetTitle.toLowerCase();
    const targetTitleWords = targetTitle.split(/\s+/).filter(w => w.length > 2);
    
    // Check if any work position matches the target title
    let bestMatch = 0;
    if (cvData.work && cvData.work.length > 0) {
      cvData.work.forEach(work => {
        // Normalize position title
        const normalizedPosition = TextNormalizationService.normalizeJobTitle(work.position || '');
        const position = normalizedPosition.toLowerCase();
        const positionWords = position.split(/\s+/).filter(w => w.length > 2);
        
        // Count matching words (with stemming support for variations)
        const matches = targetTitleWords.filter(tw => 
          positionWords.some(pw => 
            pw.includes(tw) || 
            tw.includes(pw) ||
            TextNormalizationService.wordsMatchWithStemming(tw, pw)
          )
        ).length;
        
        const matchRatio = matches / Math.max(targetTitleWords.length, 1);
        bestMatch = Math.max(bestMatch, matchRatio);
      });
    }

    // Also check summary for title mentions
    const summary = TextNormalizationService.normalizeText(cvData.basics?.summary || '').toLowerCase();
    const summaryMatches = targetTitleWords.filter(tw => 
      summary.includes(tw) ||
      summary.split(/\s+/).some(word => TextNormalizationService.wordsMatchWithStemming(tw, word))
    ).length;
    const summaryMatchRatio = summaryMatches / Math.max(targetTitleWords.length, 1);
    bestMatch = Math.max(bestMatch, summaryMatchRatio);

    const score = Math.round(bestMatch * 100);
    return { score, matched: score >= 50 };
  }

  /**
   * Validate and normalize date formats (uses normalization service)
   */
  private static validateDateFormats(dateStr: string | undefined | null): { valid: boolean; normalized?: Date } {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
      return { valid: false };
    }
    const result = TextNormalizationService.normalizeDate(dateStr);
    return {
      valid: result.valid,
      normalized: result.normalized
    };
  }

  /**
   * Calculate experience length score (15% weight) with overlap merging and gap detection
   */
  private static calculateExperienceScore(
    cvData: UnifiedCVDataStructure
  ): { score: number; years: number; gaps: Array<{ months: number }> } {
    if (!cvData.work || cvData.work.length === 0) {
      return { score: 0, years: 0, gaps: [] };
    }

    // Build date ranges with normalization
    const dateRanges: Array<{ start: Date; end: Date }> = [];

    cvData.work.forEach(work => {
      // Handle missing or empty dates
      if (!work.startDate || !work.startDate.trim()) {
        return; // Skip entries without start dates
      }

      const startDate = this.validateDateFormats(work.startDate);
      // For endDate, use empty string if missing, which will be treated as "Present"
      const endDate = TextNormalizationService.normalizeDate(work.endDate || '');

      if (startDate.valid && endDate.valid && startDate.normalized && endDate.normalized) {
        if (endDate.normalized >= startDate.normalized) {
          dateRanges.push({
            start: startDate.normalized,
            end: endDate.normalized
          });
        }
      }
    });

    if (dateRanges.length === 0) {
      return { score: 0, years: 0, gaps: [] };
    }

    // Merge overlapping ranges to prevent double-counting
    const mergedRanges = TextNormalizationService.mergeDateRanges(dateRanges);
    
    // Calculate total months from merged ranges
    const totalMonths = TextNormalizationService.calculateTotalMonths(mergedRanges);
    const totalYears = totalMonths / 12;

    // Detect gaps > 6 months
    const gaps = TextNormalizationService.detectGaps(mergedRanges, 6);
    
    // Score based on years: 0-1 years = 30, 1-3 = 60, 3-5 = 80, 5+ = 100
    // Apply slight penalty for gaps (>6 months = -5 points per gap, max -15)
    let score = 0;
    if (totalYears >= 5) score = 100;
    else if (totalYears >= 3) score = 80;
    else if (totalYears >= 1) score = 60;
    else if (totalYears > 0) score = 30;

    // Apply gap penalty
    const gapPenalty = Math.min(15, gaps.length * 5);
    score = Math.max(0, score - gapPenalty);

    return { 
      score, 
      years: Math.round(totalYears * 10) / 10,
      gaps: gaps.map(g => ({ months: Math.round(g.months) }))
    };
  }

  /**
   * Calculate formatting/parsing score (15% weight) with gap detection
   */
  private static calculateFormattingScore(
    cvData: UnifiedCVDataStructure,
    experienceGaps?: Array<{ months: number }>
  ): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check for standard sections
    const hasWork = cvData.work && cvData.work.length > 0;
    const hasEducation = cvData.education && cvData.education.length > 0;
    const hasSkills = cvData.skills && cvData.skills.length > 0;

    if (!hasWork) {
      issues.push('Missing work experience section');
      score -= 30;
    }
    if (!hasEducation) {
      issues.push('Missing education section');
      score -= 20;
    }
    if (!hasSkills) {
      issues.push('Missing skills section');
      score -= 15;
    }

    // Check for proper text content (normalized)
    const cvTextWithContext = this.extractCVTextWithContext(cvData);
    const cvText = cvTextWithContext.map(s => s.text).join(' ');
    const normalizedText = TextNormalizationService.normalizeText(cvText);
    
    if (normalizedText.length < 200) {
      issues.push('CV content is too short');
      score -= 20;
    }

    // Check for hidden text patterns
    if (TextNormalizationService.detectHiddenText(cvText)) {
      issues.push('Hidden or white text detected - may affect ATS parsing');
      score -= 15;
    }

    // Check for special characters that might cause parsing issues
    const specialCharPattern = /[^\w\s.,;:!?()\-'"/\n\u00A0-\uFFFF]/g;
    const specialCharMatches = normalizedText.match(specialCharPattern);
    if (specialCharMatches && specialCharMatches.length > 10) {
      issues.push('Too many special characters that may affect ATS parsing');
      score -= 10;
    }

    // Add gap warnings if provided
    if (experienceGaps && experienceGaps.length > 0) {
      const totalGapMonths = experienceGaps.reduce((sum, gap) => sum + gap.months, 0);
      if (totalGapMonths > 12) {
        issues.push(`Employment gaps detected (${Math.round(totalGapMonths)} months total) - consider explaining`);
        score -= 5;
      }
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Calculate soft skills score (10% weight) with sentiment analysis
   */
  private static calculateSoftSkillsScore(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext
  ): { score: number; matched: number; total: number } {
    const softSkillsKeywords = [
      'leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving',
      'analytical', 'creative', 'mentoring', 'presentation', 'negotiation',
      'management', 'coordination', 'facilitation', 'strategic', 'initiative'
    ];

    const jobText = `${jobData.title} ${jobData.description || ''} ${jobData.requirements || ''}`.toLowerCase();
    const requiredSoftSkills = softSkillsKeywords.filter(skill => jobText.includes(skill));

    if (requiredSoftSkills.length === 0) {
      return { score: 100, matched: 0, total: 0 };
    }

    const cvTextWithContext = this.extractCVTextWithContext(cvData);
    const cvText = cvTextWithContext.map(s => s.text).join(' ');
    const normalizedCvText = TextNormalizationService.normalizeText(cvText).toLowerCase();

    // Match soft skills with sentiment analysis (ignore negative mentions)
    const matchedSoftSkills = requiredSoftSkills.filter(skill => {
      const skillLower = skill.toLowerCase();
      const skillIndex = normalizedCvText.indexOf(skillLower);
      
      if (skillIndex === -1) return false;

      // Check for negative context (stop phrases)
      const stopPhrases = ['lack of', 'poor', 'weak', 'no', 'not', 'without', 'missing', 'improve'];
      const contextStart = Math.max(0, skillIndex - 20);
      const contextEnd = Math.min(normalizedCvText.length, skillIndex + skill.length + 20);
      const context = normalizedCvText.substring(contextStart, contextEnd);

      // If skill is mentioned in negative context, don't count it
      const hasNegativeContext = stopPhrases.some(phrase => 
        context.includes(phrase) && context.indexOf(phrase) < context.indexOf(skillLower)
      );

      return !hasNegativeContext;
    });

    const score = Math.round((matchedSoftSkills.length / requiredSoftSkills.length) * 100);
    return {
      score,
      matched: matchedSoftSkills.length,
      total: requiredSoftSkills.length
    };
  }

  /**
   * Apply recency bias to keywords (detects sort order)
   */
  private static applyRecencyBias(
    keywords: string[],
    cvData: UnifiedCVDataStructure
  ): Map<string, number> {
    const keywordWeights = new Map<string, number>();
    
    if (!cvData.work || cvData.work.length === 0) {
      keywords.forEach(kw => keywordWeights.set(kw, 1.0));
      return keywordWeights;
    }

    // Detect sort order by comparing first two jobs' dates
    let isNewestFirst = true; // Default assumption: newest first
    if (cvData.work.length >= 2) {
      const date0 = this.validateDateFormats(cvData.work[0].startDate);
      const date1 = this.validateDateFormats(cvData.work[1].startDate);
      
      if (date0.valid && date1.valid && date0.normalized && date1.normalized) {
        // If first job is older than second, it's oldest-first
        isNewestFirst = date0.normalized >= date1.normalized;
      }
    }

    // Sort work by date (most recent first)
    const sortedWork = [...cvData.work].sort((a, b) => {
      const dateA = this.validateDateFormats(a.startDate);
      const dateB = this.validateDateFormats(b.startDate);
      if (!dateA.valid || !dateB.valid) return 0;
      return (dateB.normalized?.getTime() || 0) - (dateA.normalized?.getTime() || 0);
    });

    keywords.forEach(keyword => {
      let maxWeight = 0.5; // Default weight for keywords not in work experience
      
      sortedWork.forEach((work, index) => {
        const normalizedText = TextNormalizationService.normalizeText(
          `${work.position || ''} ${work.summary || ''} ${work.highlights?.join(' ') || ''}`
        ).toLowerCase();
        const normalizedKeyword = TextNormalizationService.normalizeKeyword(keyword);
        
        if (normalizedText.includes(normalizedKeyword) || 
            normalizedText.split(/\s+/).some(word => 
              TextNormalizationService.keywordMatches(word, normalizedKeyword)
            )) {
          // Most recent (index 0) = 1.0, second = 0.8, third = 0.6, etc.
          const weight = Math.max(0.3, 1.0 - (index * 0.2));
          maxWeight = Math.max(maxWeight, weight);
        }
      });

      keywordWeights.set(keyword, maxWeight);
    });

    return keywordWeights;
  }

  /**
   * Extract CV text with section context (with normalization)
   */
  private static extractCVTextWithContext(cvData: UnifiedCVDataStructure): { text: string; section: string }[] {
    const sections: { text: string; section: string }[] = [];

    // Basics/Summary (normalized)
    if (cvData.basics?.summary) {
      const normalized = TextNormalizationService.normalizeText(cvData.basics.summary);
      sections.push({ text: normalized, section: 'summary' });
    }

    // Work Experience (normalized)
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        const workText = `${work.position || ''} ${work.name || ''} ${work.summary || ''} `;
        const highlightsText = work.highlights && Array.isArray(work.highlights) 
          ? work.highlights.join(' ') 
          : '';
        const normalized = TextNormalizationService.normalizeText(workText + highlightsText);
        sections.push({ text: normalized, section: 'work' });
      });
    }

    // Skills (normalized)
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        let skillText = '';
        if ('category' in skill) {
          skillText += `${skill.category} `;
          if (skill.skills && Array.isArray(skill.skills)) {
            skillText += skill.skills.join(' ');
          }
        } else {
          const skillAny = skill as any;
          if (skillAny && 'name' in skillAny && typeof skillAny.name === 'string') {
            skillText += `${skillAny.name} `;
            if (skillAny.keywords && Array.isArray(skillAny.keywords)) {
              skillText += skillAny.keywords.join(' ');
            }
          }
        }
        if (skillText.trim().length > 0) {
          const normalized = TextNormalizationService.normalizeText(skillText);
          sections.push({ text: normalized, section: 'skills' });
        }
      });
    }

    // Projects (normalized) - Tier 1.5
    if (cvData.projects && Array.isArray(cvData.projects)) {
      cvData.projects.forEach(project => {
        const projectText = `${project.name || ''} ${project.description || ''}`;
        const normalized = TextNormalizationService.normalizeText(projectText);
        sections.push({ text: normalized, section: 'projects' });
      });
    }

    // Education (normalized)
    if (cvData.education && Array.isArray(cvData.education)) {
      cvData.education.forEach(edu => {
        const eduText = `${edu.institution || ''} ${edu.studyType || ''} ${edu.area || ''}`;
        const normalized = TextNormalizationService.normalizeText(eduText);
        sections.push({ text: normalized, section: 'education' });
      });
    }

    return sections;
  }

  static async optimizeContent(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      // Analyze summary following guidelines
      const summaryGuidelines = this.SECTION_GUIDELINES.summary;
      if (!cvData.basics?.summary || cvData.basics.summary.length < 50) {
        suggestions.push({
          id: 'content-summary',
          title: 'Enhance Professional Summary',
          content: jobData ? 
            `Create a compelling summary (${summaryGuidelines.recommendedLength}) that highlights your experience relevant to ${jobData.title} at ${jobData.company}. Focus on ${summaryGuidelines.keyFocus}.` :
            `Expand your professional summary to ${summaryGuidelines.recommendedLength}. Focus on ${summaryGuidelines.keyFocus}.`,
          type: 'improvement',
          section: 'summary',
          field: 'summary',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      // Analyze work experience descriptions following guidelines
      const workGuidelines = this.SECTION_GUIDELINES.workExperience;
      if (cvData.work && cvData.work.length > 0) {
        cvData.work.forEach((work, index) => {
          if (!work.summary || work.summary.length < 50) {
            suggestions.push({
              id: `content-work-${index}`,
              title: `Enhance ${work.position} Description`,
              content: `Add more detail to your role at ${work.name}. Include specific responsibilities, achievements, and technologies used.`,
              type: 'improvement',
              section: 'work',
              field: index.toString(),
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          }
        });
      }
      
      // Check for action verbs
      const cvText = this.extractCVText(cvData);
      const actionVerbs = ['developed', 'implemented', 'managed', 'led', 'created', 'designed', 'optimized', 'increased', 'reduced'];
      const hasActionVerbs = actionVerbs.some(verb => cvText.toLowerCase().includes(verb));
      
      if (!hasActionVerbs) {
        suggestions.push({
          id: 'content-action-verbs',
          title: 'Use Strong Action Verbs',
          content: 'Replace passive language with strong action verbs like "developed", "implemented", "managed", "led", "created", "designed", "optimized", "increased", "reduced".',
          type: 'improvement',
          section: 'content',
          field: 'general',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Content optimization error:', error);
      throw new Error('Failed to optimize content');
    }
  }

  static async quantifyAchievements(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      // Analyze work experience for quantification opportunities
      if (cvData.work && cvData.work.length > 0) {
        cvData.work.forEach((work, index) => {
          const workText = `${work.summary} ${work.highlights?.join(' ') || ''}`;
          const hasQuantification = /\d+%|\d+x|\d+% increase|\d+% reduction|increased by|reduced by|improved by|grew by/.test(workText);
          
          if (!hasQuantification && work.summary) {
            suggestions.push({
              id: `quantify-work-${index}`,
              title: `Quantify ${work.position} Achievements`,
              content: `Add specific metrics to your role at ${work.name}. Examples: "increased efficiency by 25%", "reduced costs by $50K", "managed team of 10 people", "improved performance by 3x".`,
              type: 'improvement',
              section: 'work',
              field: index.toString(),
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          }
        });
      }
      
      // Check overall quantification
      const cvText = this.extractCVText(cvData);
      const hasQuantification = /\d+%|\d+x|\d+% increase|\d+% reduction|increased by|reduced by|improved by|grew by/.test(cvText);
      
      if (!hasQuantification) {
        suggestions.push({
          id: 'quantify-general',
          title: 'Add Quantifiable Achievements',
          content: 'Include specific metrics and numbers in your CV to make achievements more impactful. Examples: percentages, dollar amounts, team sizes, timeframes.',
          type: 'improvement',
          section: 'achievements',
          field: 'general',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Quantification error:', error);
      throw new Error('Failed to quantify achievements');
    }
  }

  static async mapSkillsAndKeywords(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      // Extract skills from job description and requirements
      const jobText = `${jobData.description} ${jobData.requirements || ''}`;
      const jobKeywords = this.extractKeywords(jobText);
      
      // Get current CV skills
      const cvSkills = this.extractSkillsFromCV(cvData);
      
      // Find missing skills
      const missingSkills = jobKeywords.filter(keyword => 
        !cvSkills.some(cvSkill => 
          cvSkill.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(cvSkill.toLowerCase())
        )
      );
      
      if (missingSkills.length > 0) {
        // Group skills by category
        const technicalSkills = missingSkills.filter(skill => 
          /javascript|python|java|react|node|sql|aws|docker|kubernetes|git|agile|scrum|typescript|angular|vue|php|ruby|go|rust|swift|kotlin|flutter|react native/i.test(skill)
        );
        const softSkills = missingSkills.filter(skill => 
          /leadership|communication|teamwork|problem-solving|analytical|creative|collaboration|project management|mentoring|presentation|negotiation/i.test(skill)
        );
        
        if (technicalSkills.length > 0) {
          suggestions.push({
            id: 'skills-technical',
            title: 'Add Technical Skills',
            content: `Technical skills to add: ${technicalSkills.slice(0, 8).join(', ')}`,
            type: 'addition',
            section: 'skills',
            field: 'Technical Skills',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
        
        if (softSkills.length > 0) {
          suggestions.push({
            id: 'skills-soft',
            title: 'Add Soft Skills',
            content: `Soft skills to add: ${softSkills.slice(0, 5).join(', ')}`,
            type: 'addition',
            section: 'skills',
            field: 'Soft Skills',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
      }
      
      // Check for skill level improvements
      if (cvSkills.length > 0) {
        suggestions.push({
          id: 'skills-level',
          title: 'Enhance Skill Descriptions',
          content: 'Consider adding proficiency levels (Beginner, Intermediate, Advanced, Expert) to your skills to better match job requirements.',
          type: 'improvement',
          section: 'skills',
          field: 'levels',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Skills mapping error:', error);
      throw new Error('Failed to map skills and keywords');
    }
  }

  static async analyzeGaps(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      try {
        const cvContext = this.extractCVText(cvData);
        const prompt = `Analyze the candidate's CV against the job requirements to identify gaps.
Job Requirements: ${jobData.requirements || jobData.description}
Candidate Background: ${cvContext.substring(0, 1000)}

List the most critical missing experiences, skills, or qualifications. Format as a bulleted list. Provide actionable advice on how the candidate might address these gaps.`;
        
        const cacheKey = this.generateCacheKey('analyzeGaps', cvData, jobData, { cvContext: cvContext.substring(0, 1000) });
        const aiResponse = await this.callAI(prompt, cacheKey, cvData, jobData);
        
        if (aiResponse && !aiResponse.includes('Improved content based on')) {
          suggestions.push({
            id: 'gap-1',
            title: 'Gap Analysis',
            content: aiResponse,
            type: 'improvement',
            section: 'experience',
            field: 'work',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
          return suggestions;
        }
      } catch (e) {
        console.error('Failed to generate state-driven gap analysis, falling back', e);
      }

      // Simple gap analysis
      if (!cvData.work || cvData.work.length < 2) {
        suggestions.push({
          id: 'gap-1',
          title: 'Add More Experience',
          content: 'Consider adding more work experience to strengthen your profile.',
          type: 'addition',
          section: 'experience',
          field: 'work',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Gap analysis error:', error);
      throw new Error('Failed to analyze gaps');
    }
  }

  static async generateAchievements(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      if (cvData.work && cvData.work.length > 0) {
        // Try calling the AI to generate state-driven achievements
        try {
          const workContext = cvData.work.map(w => `${w.position} at ${w.name}: ${w.summary}`).join('\n');
          const prompt = `Generate 3 impactful, quantifiable achievements based on this work experience context:
${workContext}

${jobData ? `Target Job: ${jobData.title}\nKeywords: ${jobData.description}` : ''}

Format as a simple bulleted list with no introduction or conclusion. Use strong action verbs and logical metrics.`;

          const cacheKey = this.generateCacheKey('generateAchievements', cvData, jobData, { workContext });
          const aiResponse = await this.callAI(prompt, cacheKey, cvData, jobData);
          
          if (aiResponse && !aiResponse.includes('Improved content based on')) {
            suggestions.push({
              id: 'achievement-1',
              title: 'Add Achievement',
              content: aiResponse,
              type: 'addition',
              section: 'achievements',
              field: '0',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
            return suggestions;
          }
        } catch (e) {
          console.error('Failed to generate state-driven achievements, falling back to basic suggestions', e);
        }

        // Fallback
        suggestions.push({
          id: 'achievement-1',
          title: 'Add Achievement',
          content: '• Led a team of 5 developers to deliver project on time\n• Improved system performance by 30%\n• Reduced customer complaints by 25%',
          type: 'addition',
          section: 'achievements',
          field: '0',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Achievement generation error:', error);
      throw new Error('Failed to generate achievements');
    }
  }

  static async buildTailoredSummary(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
      try {
        const cvContext = this.extractCVText(cvData);
        const prompt = `Write a professional 3-4 sentence summary tailored for the following job:
Job Title: ${jobData.title}
Job Description: ${jobData.description}

Use the candidate's actual experience to highlight their qualifications for this role:
Candidate Background: ${cvContext.substring(0, 1000)}

Do not include greetings, bullet points, or concluding remarks. Just write the summary paragraph directly.`;
        
        const cacheKey = this.generateCacheKey('buildTailoredSummary', cvData, jobData, { cvContext: cvContext.substring(0, 1000) });
        const aiResponse = await this.callAI(prompt, cacheKey, cvData, jobData);
        
        if (aiResponse && !aiResponse.includes('Improved content based on')) {
          suggestions.push({
            id: 'summary-1',
            title: 'Tailored Summary',
            content: aiResponse,
            type: 'replacement',
            section: 'summary',
            field: 'summary',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
          return suggestions;
        }
      } catch (e) {
        console.error('Failed to generate state-driven summary, falling back', e);
      }

      // Fallback
      suggestions.push({
        id: 'summary-1',
        title: 'Tailored Summary',
        content: `Experienced professional with expertise in ${jobData.title.toLowerCase()} and related technologies. Proven track record of delivering results and driving innovation.`,
        type: 'replacement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
      
      return suggestions;
    } catch (error) {
      console.error('Summary building error:', error);
      throw new Error('Failed to build tailored summary');
    }
  }

  static async draftCoverLetter(cvData: UnifiedCVDataStructure, jobData: JobPromptContext | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const cacheKey = this.generateCacheKey('draftCoverLetter', cvData, jobData, {
        cvContent: this.extractCVText(cvData),
        jobContent: `${jobData.title} ${jobData.company}`
      });
      const cached = this.responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const suggestions: AISuggestion[] = [];
      
      // Use the new cover letter generation API
      try {
        const response = await fetch('/api/ai/cover-letter-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData,
            recipientName: 'Hiring Manager',
            companyName: jobData.company
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.content) {
            suggestions.push({
              id: 'cover-letter-1',
              title: 'Cover Letter Draft',
              content: data.content,
              type: 'replacement',
              section: 'cover-letter',
              field: 'content',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
            this.responseCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
            return suggestions;
          }
        }
      } catch (apiError) {
        console.error('Cover letter API error:', apiError);
      }
      
      // Fallback to basic cover letter
      suggestions.push({
        id: 'cover-letter-1',
        title: 'Cover Letter Draft',
        content: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobData.title} position at ${jobData.company}. With my background in [relevant experience], I believe I would be a valuable addition to your team.\n\nSincerely,\n${cvData.basics.name}`,
        type: 'replacement',
        section: 'cover-letter',
        field: 'content',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
      
      this.responseCache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
      return suggestions;
    } catch (error) {
      console.error('Cover letter drafting error:', error);
      throw new Error('Failed to draft cover letter');
    }
  }

  static async checkConsistency(cvData: UnifiedCVDataStructure): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      const suggestions: AISuggestion[] = [];
      
      try {
        const prompt = `Review the following CV text for formatting, tone, and grammatical consistency.
CV Text: ${cvText.substring(0, 1500)}

Identify any inconsistencies in tense, capitalization, punctuation, or tone (e.g., mixing first and third person). List the top 2-3 most important corrections. If there are no issues, reply with exactly "No issues found."`;
        
        const cacheKey = this.generateCacheKey('checkConsistency', cvData, null, { cvText: cvText.substring(0, 1500) });
        const aiResponse = await this.callAI(prompt, cacheKey, cvData, null);
        
        if (aiResponse && !aiResponse.includes('Improved content based on') && !aiResponse.toLowerCase().includes('no issues found')) {
          suggestions.push({
            id: 'consistency-1',
            title: 'Consistency and Tone',
            content: aiResponse,
            type: 'improvement',
            section: 'consistency',
            field: 'tone',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
          return suggestions;
        }
      } catch (e) {
        console.error('Failed to generate state-driven consistency check, falling back', e);
      }

      // Simple consistency checks
      if (cvText.includes('I') || cvText.includes('me') || cvText.includes('my')) {
        suggestions.push({
          id: 'consistency-1',
          title: 'Use Third Person',
          content: 'Consider using third person instead of first person in your CV for a more professional tone.',
          type: 'improvement',
          section: 'consistency',
          field: 'tone',
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
      
      return suggestions;
    } catch (error) {
      console.error('Consistency check error:', error);
      throw new Error('Failed to check consistency');
    }
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      /^[a-z]+$/.test(word) &&
      !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );
    return Array.from(new Set(keywords)).slice(0, 20);
  }

  private static extractSkillsFromCV(cvData: UnifiedCVDataStructure): string[] {
    const skills: string[] = [];
    
    // Extract from skills section
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        if (skill.category) skills.push(skill.category);
        if (skill.skills && Array.isArray(skill.skills)) {
          skills.push(...skill.skills);
        }
        // Fallback for old structure (CVDataStructure format)
        const skillAny = skill as any;
        if ('name' in skill && skillAny.name && typeof skillAny.name === 'string') {
          skills.push(skillAny.name);
        }
        if ('keywords' in skill && skillAny.keywords && Array.isArray(skillAny.keywords)) {
          skills.push(...skillAny.keywords);
        }
      });
    }
    
    // Extract from work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        const workText = `${work.position} ${work.summary} ${work.highlights?.join(' ') || ''}`;
        const workKeywords = this.extractKeywords(workText);
        skills.push(...workKeywords);
      });
    }
    
    // Extract from education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvData.education.forEach(edu => {
        const eduText = `${edu.area} ${edu.studyType} ${edu.courses?.join(' ') || ''}`;
        const eduKeywords = this.extractKeywords(eduText);
        skills.push(...eduKeywords);
      });
    }
    
    return Array.from(new Set(skills));
  }

  private static generateSuggestions(missingKeywords: string[]): string[] {
    return [
      'Add missing keywords to your skills section',
      'Include relevant experience that demonstrates these skills',
      'Consider taking courses to develop missing skills'
    ];
  }

  private static extractCVText(cvData: UnifiedCVDataStructure): string {
    let text = '';
    
    // Add basic information
    text += `${cvData.basics.name} `;
    text += cvData.basics.summary || '';
    
    // Add work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        text += `${work.position} ${work.name} ${work.summary} `;
        if (work.highlights && Array.isArray(work.highlights)) {
          text += work.highlights.join(' ');
        }
      });
    }
    
    // Add skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        if ('category' in skill) {
          text += `${skill.category} `;
          if (skill.skills && Array.isArray(skill.skills)) {
            text += skill.skills.join(' ');
          }
        } else {
          // Old format fallback - check if it's the old format
          const skillAny = skill as any;
          if (skillAny && 'name' in skillAny && typeof skillAny.name === 'string') {
            text += `${skillAny.name} `;
            if (skillAny.keywords && Array.isArray(skillAny.keywords)) {
              text += skillAny.keywords.join(' ');
            }
          }
        }
      });
    }
    
    // Add projects
    if (cvData.projects && Array.isArray(cvData.projects)) {
      cvData.projects.forEach(project => {
        text += `${project.name} ${project.description} `;
      });
    }
    
    // Add education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvData.education.forEach(edu => {
        text += `${edu.institution} ${edu.studyType} ${edu.area} `;
      });
    }
    
    return text;
  }

  static async performComprehensiveAnalysis(cvData: UnifiedCVDataStructure, jobData: JobPromptContext): Promise<any> {
    try {
      const cacheKey = this.generateCacheKey('comprehensiveAnalysis', cvData, jobData, {
        cvContent: this.extractCVText(cvData),
        jobContent: `${jobData?.title || ''} ${jobData?.description || ''}`
      });
      
      const cached = this.responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('✅ AIAssistantService - Returning cached comprehensive analysis');
        return cached.data;
      }

      console.log('🔍 AIAssistantService - Starting comprehensive analysis...');
      // Normalize job description field
      const jobDescription = jobData?.jobDescription || jobData?.description || '';
      console.log('📊 AIAssistantService - Job data:', {
        id: jobData.id,
        title: jobData.title,
        company: jobData.company,
        hasDescription: !!jobDescription,
        descriptionLength: jobDescription.length
      });
      
      // Try the new comprehensive ATS analysis API first
      try {
        console.log('🌐 AIAssistantService - Attempting new comprehensive ATS analysis API...');
        const response = await fetch('/api/ai/comprehensive-ats-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData
          }),
        });

        console.log('📡 AIAssistantService - API response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('📄 AIAssistantService - API response:', result);
          
          if (result.success) {
            console.log('✅ AIAssistantService - Comprehensive ATS analysis completed via API');
            this.responseCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
            return result.data;
          }
        }
      } catch (apiError) {
        console.log('⚠️ AIAssistantService - New API failed, trying legacy API:', apiError);
      }

      // Try the legacy comprehensive analysis API
      try {
        console.log('🌐 AIAssistantService - Attempting legacy API call...');
        const response = await fetch('/api/ai/comprehensive-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvData,
            jobData
          }),
        });

        console.log('📡 AIAssistantService - Legacy API response status:', response.status);

        if (response.status === 403) {
           const result = await response.json();
           if (result.error === 'quota_exceeded') {
             console.log('⚠️ AIAssistantService - Quota exceeded for comprehensive analysis');
             throw new Error('quota_exceeded');
           }
        }

        if (response.ok) {
          const result = await response.json();
          console.log('📄 AIAssistantService - Legacy API response:', result);
          
          if (result.success) {
            console.log('✅ AIAssistantService - Comprehensive analysis completed via legacy API');
            this.responseCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
            return result.data;
          }
        }
      } catch (apiError: any) {
        if (apiError.message === 'quota_exceeded') {
          // If quota exceeded, throw it directly so the caller knows and don't fallback to local analysis
          throw apiError;
        }
        console.log('⚠️ AIAssistantService - Legacy API failed, falling back to local analysis:', apiError);
      }

      // Fallback to local analysis when API is not available
      console.log('🔄 AIAssistantService - Using local analysis fallback');
      
      console.log('🔧 AIAssistantService - Running local analysis methods...');
      const [contentOptimizer, quantification, skillsMapper, gapAnalyzer, achievementGenerator] = await Promise.all([
        this.optimizeContent(cvData, jobData),
        this.quantifyAchievements(cvData, jobData),
        this.mapSkillsAndKeywords(cvData, jobData),
        this.analyzeGaps(cvData, jobData),
        this.generateAchievements(cvData, jobData)
      ]);
      
      console.log('📊 AIAssistantService - Local analysis results:', {
        contentOptimizer: contentOptimizer.length,
        quantification: quantification.length,
        skillsMapper: skillsMapper.length,
        gapAnalyzer: gapAnalyzer.length,
        achievementGenerator: achievementGenerator.length
      });

      // Create comprehensive analysis structure
      const comprehensiveAnalysis = {
        ATSScoreAndKeywords: {
          score: 75, // Default score
          missingKeywords: [],
          matchedKeywords: [],
          relevanceSummary: "Analysis based on local processing"
        },
        ContentOptimizer: {
          improvements: contentOptimizer.map(s => s.content),
          toneAndClarity: "Content analysis completed",
          redundancies: []
        },
        QuantificationAssistant: {
          recommendations: quantification.map(s => s.content),
          examples: []
        },
        SkillsAndKeywordsMapper: {
          cvSkills: [],
          jobRequiredSkills: [],
          overlap: [],
          gaps: skillsMapper.filter(s => s.content.includes('Skills to add')).map(s => 
            s.content.replace('Skills to add: ', '').split(', ')
          ).flat()
        },
        GapAnalyzer: {
          experienceGaps: [],
          skillGaps: gapAnalyzer.filter(s => s.content.includes('Areas to develop')).map(s => 
            s.content.replace('Areas to develop: ', '').split(', ')
          ).flat(),
          educationGaps: []
        },
        AchievementGenerator: {
          enhancedAchievements: achievementGenerator.map(s => s.content),
          impactStatements: []
        },
        ConsistencyAndCompliance: {
          formatIssues: [],
          complianceIssues: []
        },
        TailoredSummaryBuilder: {
          optimizedSummary: cvData.basics?.summary || "Professional summary",
          elevatorPitch: "Tailored summary based on local analysis"
        },
        FinalATSScore: {
          score: 75,
          summary: "Local analysis completed"
        }
      };

      console.log('✅ AIAssistantService - Local analysis completed');
      this.responseCache.set(cacheKey, { data: comprehensiveAnalysis, timestamp: Date.now() });
      return comprehensiveAnalysis;
      
    } catch (error) {
      console.error('❌ AIAssistantService - Analysis error:', error);
      throw new Error('Failed to perform analysis');
    }
  }

  /**
   * Generate AI suggestions following section guidelines
   */
  static async generateSectionSuggestions(
    section: keyof typeof AIAssistantService.SECTION_GUIDELINES,
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null
  ): Promise<AISuggestion[]> {
    const guidelines = this.SECTION_GUIDELINES[section];
    const suggestions: AISuggestion[] = [];

    switch (section) {
      case 'summary':
        suggestions.push(...await this.generateSummarySuggestions(cvData, jobData, guidelines));
        break;
      case 'workExperience':
        suggestions.push(...await this.generateWorkExperienceSuggestions(cvData, jobData, guidelines));
        break;
      case 'skills':
        suggestions.push(...await this.generateSkillsSuggestions(cvData, jobData, guidelines));
        break;
      case 'projects':
        suggestions.push(...await this.generateProjectsSuggestions(cvData, jobData, guidelines));
        break;
      case 'education':
        suggestions.push(...await this.generateEducationSuggestions(cvData, jobData, guidelines));
        break;
      case 'certificates':
        suggestions.push(...await this.generateCertificatesSuggestions(cvData, jobData, guidelines));
        break;
    }

    return suggestions;
  }

  /**
   * Generate summary suggestions following guidelines
   */
  private static async generateSummarySuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const summary = cvData.basics?.summary || '';
    const wordCount = summary.split(/\s+/).length;

    if (wordCount < 30) {
      suggestions.push({
        id: 'summary-too-short',
        title: 'Expand Professional Summary',
        content: `Your summary is too brief. Aim for ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (wordCount > 100) {
      suggestions.push({
        id: 'summary-too-long',
        title: 'Condense Professional Summary',
        content: `Your summary is too long. Keep it to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'summary',
        field: 'summary',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate work experience suggestions following guidelines
   */
  private static async generateWorkExperienceSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    if (cvData.work && cvData.work.length > 0) {
      cvData.work.forEach((work, index) => {
        const highlights = work.highlights || [];
        
        if (highlights.length < 3) {
          suggestions.push({
            id: `work-${index}-few-bullets`,
            title: `Add More Bullet Points to ${work.position || 'Work Experience'}`,
            content: `Add ${guidelines.recommendedLength} for this role. Focus on ${guidelines.keyFocus}.`,
            type: 'improvement',
            section: 'work',
            field: `work.${index}.highlights`,
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }

        if (highlights.length > 5) {
          suggestions.push({
            id: `work-${index}-too-many-bullets`,
            title: `Condense Bullet Points for ${work.position || 'Work Experience'}`,
            content: `Reduce to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
            type: 'improvement',
            section: 'work',
            field: `work.${index}.highlights`,
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate skills suggestions following guidelines
   */
  private static async generateSkillsSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const skills = cvData.skills || [];
    const totalKeywords = skills.reduce((acc, skill) => {
      if ('skills' in skill && Array.isArray(skill.skills)) {
        return acc + skill.skills.length;
      }
      if ('keywords' in skill && Array.isArray(skill.keywords)) {
        return acc + skill.keywords.length;
      }
      return acc;
    }, 0);

    if (totalKeywords < 10) {
      suggestions.push({
        id: 'skills-too-few',
        title: 'Add More Skills',
        content: `Include ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'skills',
        field: 'skills',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (totalKeywords > 30) {
      suggestions.push({
        id: 'skills-too-many',
        title: 'Streamline Skills List',
        content: `Reduce to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'skills',
        field: 'skills',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate projects suggestions following guidelines
   */
  private static async generateProjectsSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const projects = cvData.projects || [];

    if (projects.length < 2) {
      suggestions.push({
        id: 'projects-too-few',
        title: 'Add More Projects',
        content: `Include ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'projects',
        field: 'projects',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    if (projects.length > 4) {
      suggestions.push({
        id: 'projects-too-many',
        title: 'Limit Projects',
        content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
        type: 'improvement',
        section: 'projects',
        field: 'projects',
        generatedAt: new Date().toISOString(),
        isOutOfDate: false
      });
    }

    return suggestions;
  }

  /**
   * Generate education suggestions following guidelines
   */
  private static async generateEducationSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const education = cvData.education || [];

    education.forEach((edu, index) => {
      const description = `${edu.institution} ${edu.area} ${edu.studyType}`.trim();
      if (description.length > 100) {
        suggestions.push({
          id: `education-${index}-too-long`,
          title: 'Condense Education Entry',
          content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
          type: 'improvement',
          section: 'education',
          field: `education.${index}`,
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate certificates suggestions following guidelines
   */
  private static async generateCertificatesSuggestions(
    cvData: UnifiedCVDataStructure,
    jobData: JobPromptContext | null,
    guidelines: any
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const certificates = cvData.certificates || [];

    certificates.forEach((cert, index) => {
      const description = `${cert.name} ${cert.issuer}`.trim();
      if (description.length > 80) {
        suggestions.push({
          id: `certificate-${index}-too-long`,
          title: 'Condense Certificate Entry',
          content: `Keep to ${guidelines.recommendedLength}. Focus on ${guidelines.keyFocus}.`,
          type: 'improvement',
          section: 'certificates',
          field: `certificates.${index}`,
          generatedAt: new Date().toISOString(),
          isOutOfDate: false
        });
      }
    });

    return suggestions;
  }

  // AI Content Improvement Methods - Updated with new prompting strategy
  static async improveSummary(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveSummary', cvData, jobData, { currentText });
      const cached = this.responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'summary',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          this.responseCache.set(cacheKey, { data: data.content, timestamp: Date.now() });
          return data.content;
        }
      }

      // Fallback to local processing
      const localResult = this.processLocally(`Improve summary: ${currentText}`);
      this.responseCache.set(cacheKey, { data: localResult, timestamp: Date.now() });
      return localResult;
    } catch (error) {
      console.error('Error improving summary:', error);
      return currentText;
    }
  }

  static async improveDescription(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveDescription', cvData, jobData, { currentText });
      const cached = this.responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'workExperience',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          this.responseCache.set(cacheKey, { data: data.content, timestamp: Date.now() });
          return data.content;
        }
      }

      // Fallback to local processing
      const localResult = this.processLocally(`Improve description: ${currentText}`);
      this.responseCache.set(cacheKey, { data: localResult, timestamp: Date.now() });
      return localResult;
    } catch (error) {
      console.error('Error improving description:', error);
      return currentText;
    }
  }

  static async improveHighlights(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveHighlights', cvData, jobData, { currentText });
      const cached = this.responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Use the new section generation API
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          currentText,
          sectionType: 'workExperience',
          jobTitle: jobData?.title || jobData?.jobTitle,
          companyName: jobData?.company
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          this.responseCache.set(cacheKey, { data: data.content, timestamp: Date.now() });
          return data.content;
        }
      }

      // Fallback to local processing
      const localResult = this.processLocally(`Improve highlights: ${currentText}`);
      this.responseCache.set(cacheKey, { data: localResult, timestamp: Date.now() });
      return localResult;
    } catch (error) {
      console.error('Error improving highlights:', error);
      return currentText;
    }
  }

  static async improveAchievements(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveAchievements', cvData, jobData, { currentText });
      const prompt = `Improve these achievements to be more quantifiable:

Current Achievements: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- Add specific numbers, percentages, metrics
- Focus on measurable impact
- Use strong action verbs
- Include timeframes where relevant
- Make achievements more concrete

Return only the improved achievements text.`;

      const response = await this.callAI(prompt, cacheKey, cvData, jobData);
      return response || currentText;
    } catch (error) {
      console.error('Error improving achievements:', error);
      return currentText;
    }
  }

  static async improveSkills(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveSkills', cvData, jobData, { currentText });
      const prompt = `Improve this skills section:

Current Skills: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- 15-25 relevant hard skills
- Categorized by type (Technical, Soft Skills, Tools, etc.)
- Include job-relevant keywords
- Remove outdated or irrelevant skills
- Add missing skills from job requirements

Return only the improved skills list.`;

      const response = await this.callAI(prompt, cacheKey, cvData, jobData);
      return response || currentText;
    } catch (error) {
      console.error('Error improving skills:', error);
      return currentText;
    }
  }

  static async improveProjectDescription(currentText: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveProjectDescription', cvData, jobData, { currentText });
      const prompt = `Improve this project description:

Current Description: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Guidelines:
- Focus on practical application
- Include personal contribution
- Mention tech stack and technologies
- Quantify impact where possible
- Keep it concise but informative

Return only the improved project description.`;

      const response = await this.callAI(prompt, cacheKey, cvData, jobData);
      return response || currentText;
    } catch (error) {
      console.error('Error improving project description:', error);
      return currentText;
    }
  }

  static async improveContent(currentText: string, fieldType: string, cvData: any, jobData: any): Promise<string> {
    try {
      const cacheKey = this.generateCacheKey('improveContent', cvData, jobData, { currentText, fieldType });
      const prompt = `Improve this ${fieldType} content:

Current Content: "${currentText}"
CV Data: ${JSON.stringify(cvData || {})}
Job Context: ${jobData ? JSON.stringify(jobData) : 'No specific job'}

Make it more professional, impactful, and relevant to the job context.

Return only the improved content.`;

      const response = await this.callAI(prompt, cacheKey, cvData, jobData);
      return response || currentText;
    } catch (error) {
      console.error('Error improving content:', error);
      return currentText;
    }
  }

  private static async callAI(prompt: string, cacheKey?: string, cvData?: any, jobData?: any): Promise<string> {
    try {
      if (cacheKey) {
        const cached = this.responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.data;
        }
      }

      // Use the new improve-content API
      const response = await fetch('/api/ai/improve-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          cvData: cvData || {},
          jobData: jobData || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          if (cacheKey) {
            this.responseCache.set(cacheKey, { data: data.content, timestamp: Date.now() });
          }
          return data.content;
        }
      }

      // Fallback to local processing
      const localResult = this.processLocally(prompt);
      if (cacheKey) {
        this.responseCache.set(cacheKey, { data: localResult, timestamp: Date.now() });
      }
      return localResult;
    } catch (error) {
      console.error('AI API call failed:', error);
      return this.processLocally(prompt);
    }
  }

  private static processLocally(prompt: string): string {
    // Simple local processing as fallback
    // In a real implementation, this would use a local AI model or basic text processing
    console.log('Processing locally:', prompt);
    
    // Return a basic improvement suggestion
    return prompt.includes('summary') ? 
      'Experienced professional with proven track record of delivering results...' :
      prompt.includes('description') ?
      'Led cross-functional teams to deliver high-impact solutions...' :
      prompt.includes('highlights') ?
      '• Increased efficiency by 25% through process optimization\n• Managed team of 5 developers\n• Delivered project 2 weeks ahead of schedule' :
      'Improved content based on best practices...';
  }
}
