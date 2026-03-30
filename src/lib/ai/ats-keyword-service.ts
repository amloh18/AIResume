import { AIService } from '@/lib/ai-service';

export interface KeywordGapResult {
  missingKeywords: string[];
  presentKeywords: string[];
  relevanceScore: number;
  suggestions: string[];
}

export interface ATSAnalysisResult {
  score: number;
  issues: KeywordGapResult[];
  recommendations: string[];
  formattedScore: 'excellent' | 'good' | 'fair' | 'poor';
}

export class ATSKeywordService {
  static async extractKeywordsFromJobDescription(jobDescription: string): Promise<string[]> {
    const prompt = `Extract all important keywords, skills, and requirements from this job description.

Job Description:
${jobDescription}

Return a JSON array of keywords. Include:
- Technical skills
- Soft skills
- Tools and technologies
- Certifications
- Years of experience requirements
- Education requirements
- Industry-specific terms`;

    const response = await AIService.generateNewContent(prompt, undefined, 'gemini');
    
    if (response.success && response.content) {
      try {
        const keywords = JSON.parse(response.content);
        return Array.isArray(keywords) ? keywords : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  static async detectKeywordGaps(
    resumeData: any,
    jobDescription: string
  ): Promise<KeywordGapResult> {
    const resumeText = this.extractResumeText(resumeData);
    const jobKeywords = await this.extractKeywordsFromJobDescription(jobDescription);

    const resumeKeywords = this.extractKeywordsFromText(resumeText);
    const presentKeywords = jobKeywords.filter((kw: string) => 
      resumeKeywords.some((rk: string) => 
        rk.toLowerCase().includes(kw.toLowerCase()) || 
        kw.toLowerCase().includes(rk.toLowerCase())
      )
    );
    const missingKeywords = jobKeywords.filter((kw: string) => 
      !presentKeywords.some((pk: string) => 
        pk.toLowerCase().includes(kw.toLowerCase()) || 
        kw.toLowerCase().includes(pk.toLowerCase())
      )
    );

    const relevanceScore = jobKeywords.length > 0 
      ? (presentKeywords.length / jobKeywords.length) * 100 
      : 0;

    const suggestions = missingKeywords.slice(0, 10).map((kw: string) => 
      `Consider adding "${kw}" to your skills or experience section`
    );

    return {
      missingKeywords,
      presentKeywords,
      relevanceScore,
      suggestions,
    };
  }

  static async analyzeATSCompatibility(
    resumeData: any,
    jobDescription: string
  ): Promise<ATSAnalysisResult> {
    const gaps = await this.detectKeywordGaps(resumeData, jobDescription);
    
    const score = Math.round(gaps.relevanceScore);
    
    let formattedScore: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 80) {
      formattedScore = 'excellent';
    } else if (score >= 60) {
      formattedScore = 'good';
    } else if (score >= 40) {
      formattedScore = 'fair';
    } else {
      formattedScore = 'poor';
    }

    const issues = [{
      missingKeywords: gaps.missingKeywords,
      presentKeywords: gaps.presentKeywords,
      relevanceScore: gaps.relevanceScore,
      suggestions: gaps.suggestions,
    }];

    const recommendations = [
      ...gaps.suggestions,
      score < 60 ? 'Consider reformatting your resume for better ATS parsing' : '',
      resumeData.skills?.length < 5 ? 'Add more relevant skills to improve keyword matching' : '',
    ].filter(Boolean);

    return {
      score,
      issues,
      recommendations,
      formattedScore,
    };
  }

  private static extractResumeText(resumeData: any): string {
    const parts: string[] = [];
    
    if (resumeData.basics?.summary) {
      parts.push(resumeData.basics.summary);
    }
    if (resumeData.basics?.label) {
      parts.push(resumeData.basics.label);
    }
    if (resumeData.work) {
      resumeData.work.forEach((job: any) => {
        if (job.position) parts.push(job.position);
        if (job.company) parts.push(job.company);
        if (job.summary) parts.push(job.summary);
        if (job.highlights) {
          job.highlights.forEach((h: string) => parts.push(h));
        }
      });
    }
    if (resumeData.skills) {
      if (Array.isArray(resumeData.skills)) {
        resumeData.skills.forEach((s: any) => {
          if (typeof s === 'string') parts.push(s);
          else if (s.name) parts.push(s.name);
        });
      } else if (resumeData.skills.name) {
        parts.push(resumeData.skills.name);
      }
    }
    if (resumeData.projects) {
      resumeData.projects.forEach((p: any) => {
        if (p.name) parts.push(p.name);
        if (p.description) parts.push(p.description);
      });
    }
    if (resumeData.education) {
      resumeData.education.forEach((e: any) => {
        if (e.institution) parts.push(e.institution);
        if (e.area) parts.push(e.area);
        if (e.studyType) parts.push(e.studyType);
      });
    }

    return parts.join(' ');
  }

  private static extractKeywordsFromText(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
    
    const stopWords = new Set([
      'and', 'the', 'for', 'with', 'from', 'this', 'that', 'have', 'has', 'was',
      'were', 'been', 'being', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'she', 'him', 'his', 'its', 'our', 'who', 'their', 'what', 'would',
    ]);
    
    return words.filter(w => !stopWords.has(w));
  }
}

export default ATSKeywordService;