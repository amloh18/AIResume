import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';

export interface ATSAnalysisResult {
  score: number;
  breakdown: {
    keywordMatch: number;
    experienceEducation: number;
    actionVerbs: number;
  };
  details: {
    matchedKeywords: string[];
    missingKeywords: string[];
    experienceYears: number;
    educationLevel: string;
    actionVerbMatches: string[];
  };
  suggestions: string[];
}

export class ATSService {
  // Common job-related keywords by category
  private static KEYWORD_CATEGORIES = {
    technical: [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
      'machine learning', 'ai', 'data analysis', 'frontend', 'backend', 'full stack', 'devops', 'agile',
      'scrum', 'git', 'api', 'rest', 'graphql', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby'
    ],
    softSkills: [
      'leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized',
      'detail oriented', 'multitasking', 'time management', 'collaboration', 'mentoring', 'presentation',
      'negotiation', 'customer service', 'project management'
    ],
    industries: [
      'finance', 'healthcare', 'ecommerce', 'education', 'marketing', 'sales', 'consulting', 'manufacturing',
      'retail', 'technology', 'media', 'nonprofit', 'government', 'real estate', 'transportation'
    ]
  };

  // Action verbs commonly used in job descriptions
  private static ACTION_VERBS = [
    'develop', 'design', 'implement', 'manage', 'lead', 'coordinate', 'analyze', 'create', 'build',
    'maintain', 'optimize', 'improve', 'enhance', 'deliver', 'execute', 'plan', 'organize', 'supervise',
    'train', 'mentor', 'collaborate', 'communicate', 'present', 'negotiate', 'resolve', 'troubleshoot',
    'deploy', 'test', 'debug', 'document', 'research', 'evaluate', 'assess', 'recommend', 'strategize'
  ];

  // Education keywords and their levels
  private static EDUCATION_LEVELS = {
    'phd': 5,
    'doctorate': 5,
    'master': 4,
    'mba': 4,
    'bachelor': 3,
    'bachelor\'s': 3,
    'associate': 2,
    'diploma': 2,
    'certificate': 1,
    'high school': 0
  };

  /**
   * Calculate ATS score for CV against job description
   */
  static async calculateATSScore(cvData: UnifiedCVDataStructure, jobData: Job): Promise<ATSAnalysisResult> {
    try {
      const cvText = this.convertCVToText(cvData);
      const jobDescription = jobData.description || jobData.jobDescription || '';

      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          jobDescription,
          cvData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate ATS score');
      }

      return await response.json();
    } catch (error) {
      console.error('ATS Score calculation error:', error);
      throw error;
    }
  }

  /**
   * Convert CV data structure to text for analysis
   */
  private static convertCVToText(cvData: UnifiedCVDataStructure): string {
    let cvText = '';

    // Add basics
    if (cvData.basics) {
      if (cvData.basics.name) cvText += `Name: ${cvData.basics.name}\n`;
      if (cvData.basics.label) cvText += `Title: ${cvData.basics.label}\n`;
      if (cvData.basics.summary) cvText += `Summary: ${cvData.basics.summary}\n`;
      if (cvData.basics.email) cvText += `Email: ${cvData.basics.email}\n`;
      if (cvData.basics.phone) cvText += `Phone: ${cvData.basics.phone}\n`;
    }

    // Add work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvText += '\nWork Experience:\n';
      cvData.work.forEach((job: any) => {
        if (job.name) cvText += `Company: ${job.name}\n`;
        if (job.position) cvText += `Position: ${job.position}\n`;
        if (job.summary) cvText += `Description: ${job.summary}\n`;
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            cvText += `- ${highlight}\n`;
          });
        }
        cvText += '\n';
      });
    }

    // Add skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvText += 'Skills:\n';
      cvData.skills.forEach((skill: any) => {
        if (skill.name) cvText += `${skill.name}, `;
      });
      cvText += '\n';
    }

    // Add education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvText += '\nEducation:\n';
      cvData.education.forEach((edu: any) => {
        if (edu.institution) cvText += `Institution: ${edu.institution}\n`;
        if (edu.area) cvText += `Degree: ${edu.area}\n`;
        if (edu.studyType) cvText += `Type: ${edu.studyType}\n`;
      });
    }

    return cvText;
  }

  /**
   * Get ATS score color based on score value
   */
  static getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  /**
   * Get ATS score icon based on score value
   */
  static getScoreIcon(score: number): 'excellent' | 'good' | 'needs-improvement' {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    return 'needs-improvement';
  }

  /**
   * Get ATS score message based on score value
   */
  static getScoreMessage(score: number): string {
    if (score >= 80) {
      return "Excellent match! Your CV is well-optimized for this position.";
    } else if (score >= 60) {
      return "Good match with room for improvement.";
    } else {
      return "Consider optimizing your CV to better match the job requirements.";
    }
  }

  /**
   * Calculate a simple ATS score for quick display (without API call)
   */
  static calculateQuickATSScore(cvData: UnifiedCVDataStructure, jobData: Job): number {
    try {
      const cvText = this.convertCVToText(cvData).toLowerCase();
      const jobDescription = (jobData.description || jobData.jobDescription || '').toLowerCase();

      // Simple keyword matching
      const allKeywords = [
        ...this.KEYWORD_CATEGORIES.technical,
        ...this.KEYWORD_CATEGORIES.softSkills,
        ...this.KEYWORD_CATEGORIES.industries
      ];

      const jobKeywords = allKeywords.filter(keyword => 
        jobDescription.includes(keyword)
      );

      const matchedKeywords = jobKeywords.filter(keyword => 
        cvText.includes(keyword)
      );

      // Calculate score based on keyword match percentage
      const score = jobKeywords.length > 0 
        ? (matchedKeywords.length / jobKeywords.length) * 100 
        : 100;

      return Math.min(Math.round(score), 100);
    } catch (error) {
      console.error('Quick ATS score calculation error:', error);
      return 0;
    }
  }

  /**
   * Get ATS score badge component props
   */
  static getScoreBadgeProps(score: number) {
    return {
      score,
      color: this.getScoreColor(score),
      icon: this.getScoreIcon(score),
      message: this.getScoreMessage(score)
    };
  }
}
