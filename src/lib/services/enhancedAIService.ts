import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';

export interface EnhancedAIGenerationRequest {
  cvData: UnifiedCVDataStructure;
  jobData: Job | null;
  currentText: string;
  sectionType: 'summary' | 'workExperience' | 'skills' | 'projects' | 'education' | 'certificates';
  jobTitle?: string;
  companyName?: string;
}

export interface EnhancedATSResponse {
  keywordMatch: number;
  experienceEducation: number;
  actionVerbs: number;
  skills: number;
  formatting: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
}

export class EnhancedAIService {
  /**
   * Generate AI content for a specific section with context-aware generation
   */
  static async generateSectionContent(request: EnhancedAIGenerationRequest): Promise<string> {
    try {
      const response = await fetch('/api/ai/section-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      throw new Error('Failed to generate content');
    } catch (error) {
      console.error('Enhanced AI generation error:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive ATS analysis with granular feedback
   */
  static async generateComprehensiveATSAnalysis(
    cvData: UnifiedCVDataStructure,
    jobData: Job | null
  ): Promise<EnhancedATSResponse> {
    try {
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

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }
      }

      throw new Error('Failed to generate ATS analysis');
    } catch (error) {
      console.error('Enhanced ATS analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate cover letter with enhanced prompting
   */
  static async generateCoverLetter(
    cvData: UnifiedCVDataStructure,
    jobData: Job,
    recipientName?: string,
    companyName?: string
  ): Promise<string> {
    try {
      const response = await fetch('/api/ai/cover-letter-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData,
          jobData,
          recipientName,
          companyName
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.content) {
          return data.content;
        }
      }

      throw new Error('Failed to generate cover letter');
    } catch (error) {
      console.error('Enhanced cover letter generation error:', error);
      throw error;
    }
  }

  /**
   * Calculate user's experience level from CV data
   */
  static calculateExperienceLevel(cvData: UnifiedCVDataStructure): 'Senior' | 'Mid-Level' | 'Junior' {
    if (!cvData.work || cvData.work.length === 0) {
      return 'Junior';
    }

    // Calculate total years of experience
    let totalMonths = 0;
    const currentDate = new Date();

    cvData.work.forEach((job) => {
      if (job.startDate) {
        const startDate = new Date(job.startDate);
        let endDate = currentDate;

        if (job.endDate && job.endDate !== 'Present' && job.endDate !== 'Current') {
          endDate = new Date(job.endDate);
        }

        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        if (monthsDiff > 0) {
          totalMonths += monthsDiff;
        }
      }
    });

    const totalYears = totalMonths / 12;

    if (totalYears >= 7) return 'Senior';
    if (totalYears >= 3) return 'Mid-Level';
    return 'Junior';
  }

  /**
   * Extract top keywords from job description
   */
  static extractTopKeywords(jobDescription: string, limit: number = 10): string[] {
    if (!jobDescription) return [];

    // Common technical skills and keywords
    const technicalKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
      'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
      'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby',
      'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
      'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation'
    ];

    const jobText = jobDescription.toLowerCase();
    const foundKeywords = technicalKeywords.filter(keyword =>
      jobText.includes(keyword.toLowerCase())
    );

    return foundKeywords.slice(0, limit);
  }

  /**
   * Generate section-specific suggestions based on the new rules
   */
  static async generateSectionSuggestions(
    sectionType: string,
    cvData: UnifiedCVDataStructure,
    jobData: Job | null
  ): Promise<string[]> {
    const suggestions: string[] = [];

    switch (sectionType) {
      case 'summary':
        suggestions.push(...this.generateSummarySuggestions(cvData, jobData));
        break;
      case 'workExperience':
        suggestions.push(...this.generateWorkExperienceSuggestions(cvData, jobData));
        break;
      case 'skills':
        suggestions.push(...this.generateSkillsSuggestions(cvData, jobData));
        break;
      case 'projects':
        suggestions.push(...this.generateProjectsSuggestions(cvData, jobData));
        break;
      case 'education':
        suggestions.push(...this.generateEducationSuggestions(cvData, jobData));
        break;
      case 'certificates':
        suggestions.push(...this.generateCertificatesSuggestions(cvData, jobData));
        break;
    }

    return suggestions;
  }

  private static generateSummarySuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];
    const summary = cvData.basics?.summary || '';
    const wordCount = summary.split(/\s+/).length;

    if (wordCount < 30) {
      suggestions.push('Expand your professional summary to 3-4 lines. Pitch yourself specifically for this role, highlighting your top relevant achievements.');
    }

    if (wordCount > 100) {
      suggestions.push('Condense your professional summary to 3-4 lines. HR recruiters scan this in seconds - keep it punchy and relevant.');
    }

    if (jobData) {
      const topKeywords = this.extractTopKeywords(jobData.description || '', 5);
      if (topKeywords.length > 0) {
        suggestions.push(`Integrate these high-priority keywords into your summary naturally: ${topKeywords.join(', ')}`);
      }
    }

    return suggestions;
  }

  private static generateWorkExperienceSuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];

    if (cvData.work && cvData.work.length > 0) {
      cvData.work.forEach((work, index) => {
        const highlights = work.highlights || [];

        if (highlights.length < 3) {
          suggestions.push(`Add 3-5 bullet points for ${work.name}. Use the Challenge-Action-Result (CAR) format for each.`);
        }

        if (highlights.length > 5) {
          suggestions.push(`Select the top 3-5 most impactful achievements for ${work.name}. Remove routine duties to focus on results.`);
        }
      });

      suggestions.push('Ensure every bullet point starts with a strong action verb (e.g., "Spearheaded", "Optimized", "Generated").');
    }

    if (jobData) {
      const topKeywords = this.extractTopKeywords(jobData.description || '', 8);
      if (topKeywords.length > 0) {
        suggestions.push(`Weave these job keywords into your experience bullet points: ${topKeywords.join(', ')}`);
      }
    }

    return suggestions;
  }

  private static generateSkillsSuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];
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
      suggestions.push('Add more hard skills (Tools, Technologies, Languages). Aim for 15-20 relevant skills.');
    }

    if (totalKeywords > 30) {
      suggestions.push('Prioritize your skills list. Move the most relevant skills for this job to the top.');
    }

    if (jobData) {
      const topKeywords = this.extractTopKeywords(jobData.description || '', 10);
      if (topKeywords.length > 0) {
        suggestions.push(`CRITICAL: Add these missing keywords from the job description: ${topKeywords.join(', ')}`);
      }
    }

    return suggestions;
  }

  private static generateProjectsSuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];
    const projects = cvData.projects || [];

    if (projects.length < 2) {
      suggestions.push('Include 2-3 key projects that demonstrate your skills in action. Quantify the results if possible.');
    }

    if (projects.length > 4) {
      suggestions.push('Focus on your top 2-3 projects that are most relevant to this job. Quality over quantity.');
    }

    return suggestions;
  }

  private static generateEducationSuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];
    const education = cvData.education || [];

    education.forEach((edu, index) => {
      const description = `${edu.institution} ${edu.area} ${edu.studyType}`.trim();
      if (description.length > 100) {
        suggestions.push(`Keep education entries concise. Focus on the degree, institution, and graduation year.`);
      }
    });

    return suggestions;
  }

  private static generateCertificatesSuggestions(cvData: UnifiedCVDataStructure, jobData: Job | null): string[] {
    const suggestions: string[] = [];
    const certificates = cvData.certificates || [];

    certificates.forEach((cert, index) => {
      const description = `${cert.name} ${cert.issuer}`.trim();
      if (description.length > 80) {
        suggestions.push(`Keep certificate entries concise. Focus on the certification name and issuing organization.`);
      }
    });

    return suggestions;
  }
}
