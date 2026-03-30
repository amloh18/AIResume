import { AIService } from '@/lib/ai-service';

export interface SectionScore {
  score: number;
  weight: number;
  issues: string[];
  suggestions: string[];
  strengths: string[];
}

export interface ResumeScoreResult {
  overall: number;
  atsScore: number;
  sections: {
    basics?: SectionScore;
    work?: SectionScore;
    education?: SectionScore;
    skills?: SectionScore;
    projects?: SectionScore;
    certificates?: SectionScore;
    languages?: SectionScore;
    volunteer?: SectionScore;
    awards?: SectionScore;
    publications?: SectionScore;
  };
  strengths: string[];
  improvements: string[];
  missingSections: string[];
}

export interface SectionCriteria {
  hasContent: boolean;
  completeness: number;
  quality: number;
  keywords: string[];
  metrics: boolean;
  actionVerbs: boolean;
  formatting: boolean;
}

export class ResumeScoringService {
  private static sectionWeights: Record<string, number> = {
    basics: 0.20,
    work: 0.30,
    education: 0.15,
    skills: 0.15,
    projects: 0.10,
    certificates: 0.05,
    languages: 0.03,
    volunteer: 0.02,
    awards: 0.02,
    publications: 0.02,
  };

  static async scoreResume(resumeData: any): Promise<ResumeScoreResult> {
    const prompt = `Analyze this resume and provide a comprehensive scoring.

Resume:
${JSON.stringify(resumeData, null, 2)}

Provide a detailed JSON response with:
{
  "overall": number (0-100),
  "atsScore": number (0-100),
  "sections": {
    "basics": { score: number, weight: number, issues: string[], suggestions: string[], strengths: string[] },
    "work": { score: number, weight: number, issues: string[], suggestions: string[], strengths: string[] },
    "education": { score: number, weight: number, issues: string[], suggestions: string[], strengths: string[] },
    "skills": { score: number, weight: number, issues: string[], suggestions: string[], strengths: string[] },
    "projects": { score: number, weight: number, issues: string[], suggestions: string[], strengths: string[] }
  },
  "strengths": string[],
  "improvements": string[],
  "missingSections": string[]
}`;

    const response = await AIService.generateNewContent(prompt, undefined, 'gemini');
    
    if (response.success && response.content) {
      try {
        return JSON.parse(response.content);
      } catch {
        return this.getDefaultScore();
      }
    }
    return this.getDefaultScore();
  }

  static calculateBasicScore(resumeData: any): ResumeScoreResult {
    const scores: Record<string, number> = {};
    let totalWeight = 0;
    let weightedSum = 0;
    const missingSections: string[] = [];

    for (const [section, weight] of Object.entries(this.sectionWeights)) {
      const sectionData = resumeData[section];
      const sectionScore = this.scoreSection(section, sectionData);
      
      scores[section] = sectionScore.score;
      weightedSum += sectionScore.score * weight;
      totalWeight += weight;
      
      if (sectionScore.score === 0) {
        missingSections.push(section);
      }
    }

    const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const atsScore = this.calculateATSScore(resumeData, scores);

    return {
      overall,
      atsScore,
      sections: scores as any,
      strengths: this.extractStrengths(scores),
      improvements: this.extractImprovements(scores),
      missingSections,
    };
  }

  private static scoreSection(section: string, data: any): SectionScore {
    const hasContent = this.checkSectionHasContent(section, data);
    const completeness = this.checkCompleteness(section, data);
    const quality = this.checkQuality(section, data);
    const hasMetrics = this.checkHasMetrics(data);
    const hasActionVerbs = this.checkHasActionVerbs(data);
    const hasFormatting = this.checkFormatting(data);

    const issues: string[] = [];
    const suggestions: string[] = [];
    const strengths: string[] = [];

    if (!hasContent) {
      issues.push(`Missing ${section} section`);
      suggestions.push(`Add ${section} section to improve your resume`);
    } else {
      strengths.push(`${section} section is present`);
    }

    if (completeness < 50) {
      issues.push(`${section} section is incomplete`);
      suggestions.push(`Add more details to ${section} section`);
    }

    if (!hasMetrics) {
      suggestions.push(`Add quantifiable metrics to ${section} entries`);
    }

    if (!hasActionVerbs) {
      suggestions.push(`Use strong action verbs in ${section} descriptions`);
    }

    const score = Math.round(
      (hasContent ? 30 : 0) +
      (completeness * 0.25) +
      (quality * 0.25) +
      (hasMetrics ? 10 : 0) +
      (hasActionVerbs ? 5 : 0) +
      (hasFormatting ? 5 : 0)
    );

    return {
      score,
      weight: this.sectionWeights[section] || 0.1,
      issues,
      suggestions,
      strengths,
    };
  }

  private static checkSectionHasContent(section: string, data: any): boolean {
    if (!data) return false;

    switch (section) {
      case 'basics':
        return !!(data.name || data.label || data.email || data.summary);
      case 'work':
        return Array.isArray(data) && data.length > 0;
      case 'education':
        return Array.isArray(data) && data.length > 0;
      case 'skills':
        return !!(data.name || (Array.isArray(data) && data.length > 0));
      case 'projects':
        return Array.isArray(data) && data.length > 0;
      case 'certificates':
        return Array.isArray(data) && data.length > 0;
      case 'languages':
        return Array.isArray(data) && data.length > 0;
      case 'volunteer':
        return Array.isArray(data) && data.length > 0;
      case 'awards':
        return Array.isArray(data) && data.length > 0;
      case 'publications':
        return Array.isArray(data) && data.length > 0;
      default:
        return !!data;
    }
  }

  private static checkCompleteness(section: string, data: any): number {
    if (!data) return 0;

    switch (section) {
      case 'basics': {
        let filled = 0;
        const fields = ['name', 'label', 'email', 'phone', 'summary', 'location'];
        fields.forEach(f => {
          if (data[f]) filled++;
        });
        return (filled / fields.length) * 100;
      }
      case 'work': {
        if (!Array.isArray(data) || data.length === 0) return 0;
        let total = 0;
        data.forEach((job: any) => {
          let filled = 0;
          if (job.position) filled++;
          if (job.company) filled++;
          if (job.startDate) filled++;
          if (job.summary || job.highlights?.length) filled++;
          total += filled / 4;
        });
        return Math.min(100, (total / data.length) * 100);
      }
      case 'education': {
        if (!Array.isArray(data) || data.length === 0) return 0;
        let total = 0;
        data.forEach((edu: any) => {
          let filled = 0;
          if (edu.institution) filled++;
          if (edu.area || edu.studyType) filled++;
          if (edu.startDate) filled++;
          total += filled / 3;
        });
        return Math.min(100, (total / data.length) * 100);
      }
      case 'skills': {
        if (Array.isArray(data)) {
          return data.length >= 5 ? 100 : data.length * 20;
        }
        if (data.name) return 100;
        return 0;
      }
      default:
        return Array.isArray(data) ? (data.length > 0 ? 100 : 0) : (data ? 100 : 0);
    }
  }

  private static checkQuality(section: string, data: any): number {
    if (!data) return 0;

    if (section === 'work' && Array.isArray(data)) {
      const qualityScores = data.map((job: any) => {
        let score = 50;
        if (job.summary && job.summary.length > 50) score += 10;
        if (job.highlights?.length >= 3) score += 20;
        if (job.highlights?.some((h: string) => /\d+%|\$\d+|\d+x|\d+/.test(h))) score += 20;
        return score;
      });
      return qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length;
    }

    if (section === 'skills' && Array.isArray(data)) {
      return data.length >= 10 ? 100 : data.length * 10;
    }

    return 70;
  }

  private static checkHasMetrics(data: any): boolean {
    if (!data) return false;
    if (Array.isArray(data)) {
      return data.some((item: any) => {
        const str = JSON.stringify(item);
        return /\d+%|\$\d+|\d+K|\d+ million|\d+x|\d+ users|\d+ customers/.test(str);
      });
    }
    const str = JSON.stringify(data);
    return /\d+%|\$\d+|\d+K|\d+ million|\d+x/.test(str);
  }

  private static checkHasActionVerbs(data: any): boolean {
    const actionVerbs = [
      'led', 'managed', 'developed', 'created', 'implemented', 'designed',
      'organized', 'achieved', 'improved', 'increased', 'reduced', 'built',
      'launched', 'delivered', 'optimized', 'transformed', 'spearheaded',
    ];

    if (!data) return false;
    if (Array.isArray(data)) {
      return data.some((item: any) => {
        const str = JSON.stringify(item).toLowerCase();
        return actionVerbs.some(verb => str.includes(verb));
      });
    }
    const str = JSON.stringify(data).toLowerCase();
    return actionVerbs.some(verb => str.includes(verb));
  }

  private static checkFormatting(data: any): boolean {
    return !!data;
  }

  private static calculateATSScore(resumeData: any, sectionScores: Record<string, number>): number {
    let atsScore = 50;

    if (sectionScores.basics > 50) atsScore += 10;
    if (sectionScores.work > 50) atsScore += 15;
    if (sectionScores.skills > 30) atsScore += 10;
    if (sectionScores.education > 50) atsScore += 5;
    if (sectionScores.projects > 30) atsScore += 5;
    if (resumeData.basics?.email) atsScore += 3;
    if (resumeData.basics?.phone) atsScore += 2;

    return Math.min(100, atsScore);
  }

  private static extractStrengths(scores: Record<string, number>): string[] {
    const strengths: string[] = [];
    
    if (scores.basics >= 70) strengths.push('Complete personal information');
    if (scores.work >= 70) strengths.push('Strong work experience section');
    if (scores.education >= 70) strengths.push('Well-documented education');
    if (scores.skills >= 70) strengths.push('Comprehensive skills list');
    if (scores.projects >= 50) strengths.push('Projects showcase technical abilities');
    
    return strengths;
  }

  private static extractImprovements(scores: Record<string, number>): string[] {
    const improvements: string[] = [];
    
    if (scores.basics < 70) improvements.push('Add more personal details');
    if (scores.work < 70) improvements.push('Enhance work experience with metrics');
    if (scores.skills < 70) improvements.push('Add more relevant skills');
    if (scores.projects < 50) improvements.push('Include relevant projects');
    
    return improvements;
  }

  private static getDefaultScore(): ResumeScoreResult {
    return {
      overall: 50,
      atsScore: 50,
      sections: {},
      strengths: [],
      improvements: ['Unable to analyze resume - please fill in your details'],
      missingSections: [],
    };
  }
}

export default ResumeScoringService;