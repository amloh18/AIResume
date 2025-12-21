import { ATSAnalysis } from './aiAssistantService';

export interface FactorBreakdown {
  hardKeywords: {
    score: number;
    weight: number;
    matched: number;
    total: number;
    isCritical: boolean;
  };
  experienceLength: {
    score: number;
    weight: number;
    years: number;
    requiredYears?: number;
    isCritical: boolean;
  };
  formatting: {
    score: number;
    weight: number;
    issues: string[];
    isCritical: boolean;
  };
  softSkills: {
    score: number;
    weight: number;
    matched: number;
    total: number;
    isCritical: boolean;
  };
  jobTitles: {
    score: number;
    weight: number;
    matched: boolean;
    isCritical: boolean;
  };
}

export interface FactorIssue {
  factor: keyof FactorBreakdown;
  severity: 'critical' | 'optimization';
  message: string;
  suggestion?: string;
}

export class ATSFactorBreakdownService {
  /**
   * Extract factor breakdown from ATS analysis
   */
  static extractFactorBreakdown(analysis: ATSAnalysis): FactorBreakdown {
    const factorBreakdown = analysis.factorBreakdown;

    if (!factorBreakdown) {
      // Fallback: create default breakdown from score
      return {
        hardKeywords: {
          score: 0,
          weight: 0.3,
          matched: 0,
          total: 0,
          isCritical: false,
        },
        experienceLength: {
          score: 0,
          weight: 0.25,
          years: 0,
          isCritical: false,
        },
        formatting: {
          score: 0,
          weight: 0.2,
          issues: [],
          isCritical: false,
        },
        softSkills: {
          score: 0,
          weight: 0.15,
          matched: 0,
          total: 0,
          isCritical: false,
        },
        jobTitles: {
          score: 0,
          weight: 0.1,
          matched: false,
          isCritical: false,
        },
      };
    }

    return {
      hardKeywords: {
        score: factorBreakdown.hardKeywords?.score || 0,
        weight: factorBreakdown.hardKeywords?.weight || 0.3,
        matched: factorBreakdown.hardKeywords?.matched || 0,
        total: factorBreakdown.hardKeywords?.total || 0,
        isCritical: (factorBreakdown.hardKeywords?.score || 0) < 50,
      },
      experienceLength: {
        score: factorBreakdown.experienceLength?.score || 0,
        weight: factorBreakdown.experienceLength?.weight || 0.25,
        years: factorBreakdown.experienceLength?.years || 0,
        isCritical: (factorBreakdown.experienceLength?.score || 0) < 40,
      },
      formatting: {
        score: factorBreakdown.formatting?.score || 0,
        weight: factorBreakdown.formatting?.weight || 0.2,
        issues: factorBreakdown.formatting?.issues || [],
        isCritical: (factorBreakdown.formatting?.issues?.length || 0) > 0,
      },
      softSkills: {
        score: factorBreakdown.softSkills?.score || 0,
        weight: factorBreakdown.softSkills?.weight || 0.15,
        matched: factorBreakdown.softSkills?.matched || 0,
        total: factorBreakdown.softSkills?.total || 0,
        isCritical: (factorBreakdown.softSkills?.score || 0) < 30,
      },
      jobTitles: {
        score: factorBreakdown.jobTitles?.score || 0,
        weight: factorBreakdown.jobTitles?.weight || 0.1,
        matched: factorBreakdown.jobTitles?.matched || false,
        isCritical: !factorBreakdown.jobTitles?.matched,
      },
    };
  }

  /**
   * Identify critical vs optimization issues
   */
  static identifyIssues(breakdown: FactorBreakdown): FactorIssue[] {
    const issues: FactorIssue[] = [];

    // Hard Keywords
    if (breakdown.hardKeywords.isCritical) {
      issues.push({
        factor: 'hardKeywords',
        severity: 'critical',
        message: `Only ${breakdown.hardKeywords.matched}/${breakdown.hardKeywords.total} hard keywords matched`,
        suggestion: 'Add missing keywords to your work experience and skills sections',
      });
    } else if (breakdown.hardKeywords.score < 70) {
      issues.push({
        factor: 'hardKeywords',
        severity: 'optimization',
        message: `Could improve keyword matching (${breakdown.hardKeywords.matched}/${breakdown.hardKeywords.total})`,
        suggestion: 'Add more relevant keywords to increase match rate',
      });
    }

    // Experience Length
    if (breakdown.experienceLength.isCritical) {
      issues.push({
        factor: 'experienceLength',
        severity: 'critical',
        message: `Experience length is low (${breakdown.experienceLength.years} years)`,
        suggestion: 'Consider including projects or freelance work to increase experience years',
      });
    } else if (breakdown.experienceLength.score < 60) {
      issues.push({
        factor: 'experienceLength',
        severity: 'optimization',
        message: `Experience could be stronger (${breakdown.experienceLength.years} years)`,
        suggestion: 'Highlight relevant experience and quantify achievements',
      });
    }

    // Formatting
    if (breakdown.formatting.isCritical && breakdown.formatting.issues.length > 0) {
      issues.push({
        factor: 'formatting',
        severity: 'critical',
        message: `Formatting issues detected: ${breakdown.formatting.issues.join(', ')}`,
        suggestion: 'Fix formatting issues to ensure ATS can parse your CV',
      });
    }

    // Soft Skills
    if (breakdown.softSkills.isCritical) {
      issues.push({
        factor: 'softSkills',
        severity: 'critical',
        message: `Only ${breakdown.softSkills.matched}/${breakdown.softSkills.total} soft skills matched`,
        suggestion: 'Add soft skills mentioned in the job description',
      });
    }

    // Job Titles
    if (breakdown.jobTitles.isCritical) {
      issues.push({
        factor: 'jobTitles',
        severity: 'critical',
        message: 'Job title mismatch detected',
        suggestion: 'Align your job titles with the target position',
      });
    }

    return issues;
  }

  /**
   * Get factor display name
   */
  static getFactorDisplayName(factor: keyof FactorBreakdown): string {
    const names: Record<keyof FactorBreakdown, string> = {
      hardKeywords: 'Hard Skills',
      experienceLength: 'Experience',
      formatting: 'Formatting',
      softSkills: 'Soft Skills',
      jobTitles: 'Job Titles',
    };
    return names[factor];
  }

  /**
   * Get factor icon (using emoji for simplicity, can be replaced with icons)
   */
  static getFactorIcon(factor: keyof FactorBreakdown): string {
    const icons: Record<keyof FactorBreakdown, string> = {
      hardKeywords: '💻',
      experienceLength: '📅',
      formatting: '📄',
      softSkills: '🤝',
      jobTitles: '🎯',
    };
    return icons[factor];
  }
}

