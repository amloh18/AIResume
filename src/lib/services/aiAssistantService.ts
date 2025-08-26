import { CVDataStructure } from '@/types/cv';
import { Job } from '@/lib/stores/jobStore';
import { AISuggestion } from '@/lib/stores/aiStore';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  strengths: string[];
  suggestions: string[];
}

export class AIAssistantService {
  static async calculateATSScore(cvData: CVDataStructure, jobData: Job | null): Promise<ATSAnalysis> {
    try {
      // Extract text from CV
      const cvText = this.extractCVText(cvData);
      
      if (!jobData) {
        // Baseline analysis without job context
        return {
          score: 75, // Baseline score
          missingKeywords: [],
          strengths: ['Professional experience', 'Education background'],
          suggestions: ['Add more specific skills', 'Include quantifiable achievements']
        };
      }

      // Extract job requirements
      const jobText = `${jobData.title} ${jobData.description} ${jobData.requirements}`;
      
      // Simple keyword matching (in a real app, you'd use more sophisticated NLP)
      const cvKeywords = this.extractKeywords(cvText);
      const jobKeywords = this.extractKeywords(jobText);
      
      const matchingKeywords = cvKeywords.filter(keyword => 
        jobKeywords.some(jobKeyword => 
          jobKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(jobKeyword.toLowerCase())
        )
      );
      
      const score = Math.min(100, Math.round((matchingKeywords.length / jobKeywords.length) * 100));
      const missingKeywords = jobKeywords.filter(keyword => 
        !cvKeywords.some(cvKeyword => 
          cvKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(cvKeyword.toLowerCase())
        )
      );
      
      return {
        score,
        missingKeywords: missingKeywords.slice(0, 10),
        strengths: matchingKeywords.slice(0, 5),
        suggestions: this.generateSuggestions(missingKeywords)
      };
    } catch (error) {
      console.error('ATS calculation error:', error);
      throw new Error('Failed to calculate ATS score');
    }
  }

  static async optimizeContent(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      
      // Simple content optimization suggestions
      const suggestions: AISuggestion[] = [];
      
      if (cvText.length < 500) {
        suggestions.push({
          id: 'content-1',
          title: 'Expand Summary',
          content: 'Consider adding more detail to your professional summary to better showcase your experience.',
          type: 'improvement',
          section: 'summary',
          field: 'summary',
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

  static async quantifyAchievements(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      
      // Simple quantification suggestions
      const suggestions: AISuggestion[] = [];
      
      if (!cvText.includes('%') && !cvText.includes('increased') && !cvText.includes('reduced')) {
        suggestions.push({
          id: 'quantify-1',
          title: 'Add Quantifiable Achievements',
          content: 'Consider adding specific metrics like "increased sales by 25%" or "reduced costs by 15%" to make your achievements more impactful.',
          type: 'improvement',
          section: 'experience',
          field: 'achievements',
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

  static async mapSkillsAndKeywords(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      
      if (!jobData) {
        return [];
      }
      
      const jobKeywords = this.extractKeywords(jobData.description);
      const cvKeywords = this.extractKeywords(cvText);
      
      const missingSkills = jobKeywords.filter(keyword => 
        !cvKeywords.some(cvKeyword => 
          cvKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      const suggestions: AISuggestion[] = [];
      
      if (missingSkills.length > 0) {
        suggestions.push({
          id: 'skills-1',
          title: 'Add Missing Skills',
          content: `Consider adding these skills: ${missingSkills.slice(0, 5).join(', ')}`,
          type: 'addition',
          section: 'skills',
          field: 'Technical Skills',
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

  static async analyzeGaps(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
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

  static async generateAchievements(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      const suggestions: AISuggestion[] = [];
      
      if (cvData.work && cvData.work.length > 0) {
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

  static async buildTailoredSummary(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
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

  static async draftCoverLetter(cvData: CVDataStructure, jobData: Job | null): Promise<AISuggestion[]> {
    try {
      if (!jobData) {
        return [];
      }
      
      const suggestions: AISuggestion[] = [];
      
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
      
      return suggestions;
    } catch (error) {
      console.error('Cover letter drafting error:', error);
      throw new Error('Failed to draft cover letter');
    }
  }

  static async checkConsistency(cvData: CVDataStructure): Promise<AISuggestion[]> {
    try {
      const cvText = this.extractCVText(cvData);
      
      const suggestions: AISuggestion[] = [];
      
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

  private static generateSuggestions(missingKeywords: string[]): string[] {
    return [
      'Add missing keywords to your skills section',
      'Include relevant experience that demonstrates these skills',
      'Consider taking courses to develop missing skills'
    ];
  }

  private static extractCVText(cvData: CVDataStructure): string {
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
        text += `${skill.name} `;
        if (skill.keywords && Array.isArray(skill.keywords)) {
          text += skill.keywords.join(' ');
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

  static async performComprehensiveAnalysis(cvData: CVDataStructure, jobData: Job): Promise<any> {
    try {
      console.log('🔍 AIAssistantService - Starting comprehensive analysis...');
      
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Comprehensive analysis failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Comprehensive analysis failed');
      }

      console.log('✅ AIAssistantService - Comprehensive analysis completed');
      return result.data;
    } catch (error) {
      console.error('❌ AIAssistantService - Comprehensive analysis error:', error);
      throw new Error('Failed to perform comprehensive analysis');
    }
  }
}
